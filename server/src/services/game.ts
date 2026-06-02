import { Server } from 'socket.io';
import { v4 } from 'uuid';
import wordPairs from '../data/antonyms.json';
import IRoom from '../interfaces/room';
import IUser from '../interfaces/user';
import IWord from '../interfaces/word';

export const TOTAL_ROUNDS = 13;
export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 2;
export const HINTS_PER_PLAYER = 2;
export const SCOREBOARD_DURATION_MS = 10000;
const EMPTY_ROOM_GRACE_MS = 10000;

// Single source of truth: rooms live here, all mutations go through this module
// and every mutation broadcasts the updated (sanitized) state to the room.
const rooms = new Map<string, IRoom>();
const roomTimers = new Map<string, NodeJS.Timeout>();

let io: Server;

export const initGame = (server: Server) => {
    io = server;
};

// ---------------------------------------------------------------------------
// Broadcast helpers
// ---------------------------------------------------------------------------

// Strip secrets (full word list, current impostor) before sending to clients.
export const sanitizeRoom = (room: IRoom): IRoom => ({
    ...room,
    gameState: {
        ...room.gameState,
        words: undefined,
        impostor: undefined,
    },
});

const broadcastRoom = (room: IRoom) => {
    io.to(room.id).emit('roomUpdate', sanitizeRoom(room));
};

// Keep the home page room list in sync.
const broadcastToHome = (event: string, payload: unknown) => {
    io.to('home').emit(event, payload);
};

// Each player privately receives their word (impostor gets the antonym).
const sendWords = (room: IRoom) => {
    const roundIndex = getRoundNumber(room) - 1;
    const pair = room.gameState.words?.[roundIndex];
    if (!pair) return;

    room.users.forEach((user) => {
        const isImpostor = user.id === room.gameState.impostor?.id;
        io.to(user.id).emit('yourWord', isImpostor ? pair.antonym : pair.word);
    });
};

const sendError = (userId: string, message: string) => {
    io.to(userId).emit('actionError', message);
};

// ---------------------------------------------------------------------------
// Timers (one per room, always cleared before being replaced)
// ---------------------------------------------------------------------------

const clearRoomTimer = (roomId: string) => {
    const timer = roomTimers.get(roomId);
    if (timer) {
        clearTimeout(timer);
        roomTimers.delete(roomId);
    }
};

const setRoomTimer = (roomId: string, fn: () => void, delay: number) => {
    clearRoomTimer(roomId);
    roomTimers.set(
        roomId,
        setTimeout(() => {
            roomTimers.delete(roomId);
            fn();
        }, delay)
    );
};

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

const getWords = (): IWord[] => {
    // Shuffle and take distinct pairs, randomly swapping word/antonym
    const shuffled: IWord[] = [...wordPairs].sort(() => Math.random() - 0.5);
    return shuffled
        .slice(0, TOTAL_ROUNDS)
        .map((pair) =>
            Math.random() > 0.5
                ? { word: pair.antonym, antonym: pair.word }
                : pair
        );
};

// ---------------------------------------------------------------------------
// Room lifecycle
// ---------------------------------------------------------------------------

export const getRoom = (roomId: string) => rooms.get(roomId);

export const getLobbyRooms = () =>
    [...rooms.values()]
        .filter((room) => room.gameState.phase === 'lobby')
        .map(sanitizeRoom);

export const createRoom = (user: IUser): IRoom => {
    const words = getWords();
    const newRoom: IRoom = {
        id: v4(),
        users: [user],
        gameState: {
            phase: 'lobby',
            readyUsers: [],
            words,
            hints: [],
            votes: [],
            scores: [{ score: 0, user }],
        },
    };

    rooms.set(newRoom.id, newRoom);
    broadcastToHome('roomCreated', sanitizeRoom(newRoom));
    return newRoom;
};

const deleteRoom = (roomId: string) => {
    clearRoomTimer(roomId);
    rooms.delete(roomId);
    broadcastToHome('roomRemoved', roomId);
};

export const joinRoom = (roomId: string, user: IUser) => {
    const room = rooms.get(roomId);

    if (!room) {
        io.to(user.id).emit('joinError', "Cette partie n'existe pas ou plus.");
        return null;
    }

    const alreadyInRoom = room.users.some((u) => u.id === user.id);

    if (!alreadyInRoom) {
        if (room.gameState.phase !== 'lobby') {
            io.to(user.id).emit('joinError', 'La partie a déjà commencé.');
            return null;
        }
        if (room.users.length >= MAX_PLAYERS) {
            io.to(user.id).emit('joinError', 'La partie est pleine.');
            return null;
        }

        room.users.push(user);
        if (!room.gameState.scores.some((s) => s.user.id === user.id)) {
            room.gameState.scores.push({ score: 0, user });
        }
    }

    // Joining cancels any pending empty-room cleanup
    clearRoomTimer(roomId);
    broadcastRoom(room);
    broadcastToHome('roomUpdated', sanitizeRoom(room));
    return room;
};

export const leaveRoom = (roomId: string, user: IUser) => {
    const room = rooms.get(roomId);
    if (room) {
        removeUserFromRoom(room, user);
    }
};

export const handleDisconnect = (user: IUser) => {
    rooms.forEach((room) => {
        if (room.users.some((u) => u.id === user.id)) {
            removeUserFromRoom(room, user);
        }
    });
};

const removeUserFromRoom = (room: IRoom, user: IUser) => {
    const state = room.gameState;
    const wasCurrentPlayer = state.currentPlayer?.id === user.id;
    const wasImpostor = state.impostor?.id === user.id;
    const nextPlayer = wasCurrentPlayer ? getNextPlayer(room) : undefined;

    room.users = room.users.filter((u) => u.id !== user.id);
    state.readyUsers = state.readyUsers.filter((u) => u.id !== user.id);
    state.votes = state.votes.filter(
        (v) => v.user.id !== user.id && v.vote.id !== user.id
    );

    if (room.users.length === 0) {
        // Grace period so a quick refresh / StrictMode remount doesn't kill the room
        setRoomTimer(room.id, () => deleteRoom(room.id), EMPTY_ROOM_GRACE_MS);
        return;
    }

    if (state.phase === 'lobby') {
        broadcastRoom(room);
        broadcastToHome('roomUpdated', sanitizeRoom(room));
        return;
    }

    // Game in progress
    if (room.users.length < MIN_PLAYERS) {
        endGame(room);
        return;
    }

    if (state.phase.startsWith('round-')) {
        if (wasImpostor) {
            // The round is meaningless without an impostor: skip to the next one
            const round = getRoundNumber(room);
            if (round >= TOTAL_ROUNDS) {
                endGame(room);
            } else {
                startRound(room, round + 1);
            }
            return;
        }
        if (wasCurrentPlayer) {
            state.currentPlayer = nextPlayer;
        }
        // The leaver's pending hints no longer count toward the round total
        state.hints = state.hints.filter((h) => h.user.id !== user.id);
        if (isRoundComplete(room)) {
            startVote(room);
            return;
        }
    } else if (state.phase.startsWith('vote-')) {
        if (allVoted(room)) {
            finishVote(room);
            return;
        }
    }

    broadcastRoom(room);
};

// ---------------------------------------------------------------------------
// Game flow (lobby -> round -> vote -> scoreboard -> ... -> end)
// ---------------------------------------------------------------------------

const getRoundNumber = (room: IRoom) => {
    const parts = room.gameState.phase.split('-');
    return parseInt(parts[1] || '1', 10);
};

const getNextPlayer = (room: IRoom) => {
    const currentIndex = room.users.findIndex(
        (u) => u.id === room.gameState.currentPlayer?.id
    );
    return room.users[(currentIndex + 1) % room.users.length];
};

const isRoundComplete = (room: IRoom) =>
    room.gameState.hints.length >= HINTS_PER_PLAYER * room.users.length;

const allVoted = (room: IRoom) =>
    room.gameState.votes.length >= room.users.length;

export const setUserReady = (user: IUser, roomId: string) => {
    const room = rooms.get(roomId);
    const state = room?.gameState;

    if (
        !room ||
        !state ||
        state.phase !== 'lobby' ||
        !room.users.some((u) => u.id === user.id) ||
        state.readyUsers.some((u) => u.id === user.id)
    ) {
        return;
    }

    state.readyUsers.push(user);

    if (
        room.users.length >= MIN_PLAYERS &&
        state.readyUsers.length === room.users.length
    ) {
        // Game starts: the room is no longer joinable from the home page
        broadcastToHome('roomRemoved', room.id);
        startRound(room, 1);
        return;
    }

    broadcastRoom(room);
};

export const setUserNotReady = (user: IUser, roomId: string) => {
    const room = rooms.get(roomId);

    if (!room || room.gameState.phase !== 'lobby') {
        return;
    }

    room.gameState.readyUsers = room.gameState.readyUsers.filter(
        (u) => u.id !== user.id
    );
    broadcastRoom(room);
};

const startRound = (room: IRoom, round: number) => {
    const state = room.gameState;

    state.phase = `round-${round}`;
    state.hints = [];
    state.votes = [];
    state.revealed = undefined;
    state.phaseEndsAt = undefined;
    state.impostor =
        room.users[Math.floor(Math.random() * room.users.length)];
    state.currentPlayer =
        room.users[Math.floor(Math.random() * room.users.length)];

    broadcastRoom(room);
    sendWords(room);
};

export const addHint = (word: string, user: IUser, roomId: string) => {
    const room = rooms.get(roomId);
    const state = room?.gameState;

    if (!room || !state || !state.phase.startsWith('round-')) {
        return;
    }

    if (state.currentPlayer?.id !== user.id) {
        sendError(user.id, "Ce n'est pas votre tour.");
        return;
    }

    const cleanWord = word.trim().toLowerCase();

    if (!cleanWord) {
        sendError(user.id, "L'indice ne peut pas être vide.");
        return;
    }

    if (state.hints.some((h) => h.word === cleanWord)) {
        sendError(user.id, 'Cet indice a déjà été donné.');
        return;
    }

    const roundIndex = getRoundNumber(room) - 1;
    const pair = state.words?.[roundIndex];
    if (pair && (cleanWord === pair.word || cleanWord === pair.antonym)) {
        sendError(user.id, "L'indice ne peut pas être le mot à trouver.");
        return;
    }

    state.hints.push({ word: cleanWord, user });
    state.currentPlayer = getNextPlayer(room);

    if (isRoundComplete(room)) {
        startVote(room);
        return;
    }

    broadcastRoom(room);
};

const startVote = (room: IRoom) => {
    const state = room.gameState;

    state.phase = `vote-${getRoundNumber(room)}`;
    state.currentPlayer = undefined;
    state.votes = [];

    broadcastRoom(room);
};

export const addVote = (votee: IUser, user: IUser, roomId: string) => {
    const room = rooms.get(roomId);
    const state = room?.gameState;
    const target = room?.users.find((u) => u.id === votee.id);

    if (!room || !state || !state.phase.startsWith('vote-')) {
        return;
    }

    if (!target || target.id === user.id) {
        sendError(user.id, 'Vote invalide.');
        return;
    }

    if (state.votes.some((v) => v.user.id === user.id)) {
        sendError(user.id, 'Vous avez déjà voté.');
        return;
    }

    state.votes.push({ vote: target, user });

    if (allVoted(room)) {
        finishVote(room);
        return;
    }

    broadcastRoom(room);
};

const finishVote = (room: IRoom) => {
    const state = room.gameState;
    const round = getRoundNumber(room);
    const roundIndex = round - 1;
    const pair = state.words?.[roundIndex];

    applyScores(room);

    state.phase = `scoreboard-${round}`;
    state.revealed = {
        word: pair?.word || '',
        impostorWord: pair?.antonym || '',
        impostor: state.impostor as IUser,
    };
    state.phaseEndsAt = Date.now() + SCOREBOARD_DURATION_MS;

    broadcastRoom(room);

    // The server (not the clients) drives the transition to the next round
    setRoomTimer(
        room.id,
        () => {
            if (round >= TOTAL_ROUNDS) {
                endGame(room);
            } else {
                startRound(room, round + 1);
            }
        },
        SCOREBOARD_DURATION_MS
    );
};

const applyScores = (room: IRoom) => {
    const state = room.gameState;
    const impostorId = state.impostor?.id;
    const votesForImpostor = state.votes.filter(
        (v) => v.vote.id === impostorId
    ).length;

    room.users.forEach((user) => {
        const ownScore = state.scores.find((s) => s.user.id === user.id);
        if (!ownScore) return;

        if (user.id === impostorId) {
            if (votesForImpostor === 0) {
                ownScore.score += 200;
            } else if (votesForImpostor < room.users.length - 1) {
                ownScore.score += 100;
            }
        } else {
            const ownVote = state.votes.find((v) => v.user.id === user.id);
            const votedForImpostor = ownVote?.vote.id === impostorId;

            if (votedForImpostor && votesForImpostor === 1) {
                ownScore.score += 150;
            } else if (votedForImpostor) {
                ownScore.score += 100;
            }
        }
    });
};

const endGame = (room: IRoom) => {
    const state = room.gameState;

    clearRoomTimer(room.id);
    state.phase = 'end';
    state.currentPlayer = undefined;
    state.phaseEndsAt = undefined;

    broadcastRoom(room);
};
