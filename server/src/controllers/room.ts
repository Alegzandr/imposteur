import { Request, Response } from 'express';
import { v4 } from 'uuid';
import path from 'path';
import util from 'util';
import fs from 'fs';
import IRoom from '../interfaces/room';
import IUser from '../interfaces/user';
import IWord from '../interfaces/word';
import IVote from '../interfaces/vote';

const rooms: IRoom[] = [];

const readFile = util.promisify(fs.readFile);

const getWords = async () => {
    const words: IWord[] = [];
    const filePath = path.join(__dirname, '..', 'data', 'antonyms.json');

    try {
        const data = await readFile(filePath, 'utf8');
        const wordPairs = JSON.parse(data);

        for (let i = 0; i < 13; i++) {
            const randomIndex = Math.floor(Math.random() * wordPairs.length);
            const pair = wordPairs[randomIndex];

            if (Math.random() > 0.5) {
                words.push({ word: pair.antonym, antonym: pair.word });
            } else {
                words.push(pair);
            }
        }
    } catch (err) {
        console.error('Error reading the file:', err);
        return [];
    }

    return words;
};

const deleteWordsAndImpostor = (room: IRoom) => {
    const newRoom = {
        ...room,
        gameState: {
            ...room.gameState,
            words: undefined,
            impostor: undefined,
        },
    };

    return newRoom;
};

export const addRoom = async (req: Request, res: Response) => {
    const words = await getWords();
    const newRoom: IRoom = {
        id: v4(),
        users: [req.body.user],
        gameState: {
            phase: 'lobby',
            readyUsers: [],
            words,
        },
    };

    rooms.push(newRoom);
    res.status(201).json({ room: deleteWordsAndImpostor(newRoom) });
};

export const getRooms = (_req: Request, res: Response) => {
    const roomsWithoutWordsAndImpostor = rooms.map((room) =>
        deleteWordsAndImpostor(room)
    );
    const roomsInLobbyPhase = roomsWithoutWordsAndImpostor.filter(
        (room) => room.gameState.phase === 'lobby'
    );
    res.status(200).json({ rooms: roomsInLobbyPhase });
};

export const leaveRooms = (user: IUser) => {
    rooms.forEach((room) => {
        const index = room.users.findIndex((u) => u.id === user.id);
        if (index !== -1) {
            room.users.splice(index, 1);
        }

        if (room.users.length === 0) {
            const roomIndex = rooms.findIndex((r) => r.id === room.id);
            if (roomIndex !== -1) {
                rooms.splice(roomIndex, 1);
            }
        }
    });
};

export const getRoom = (req: Request, res: Response) => {
    const room = rooms.find((r) => r.id === req.params.id);
    if (room) {
        res.status(200).json({ room });
    } else {
        res.status(404).json({ message: 'Room not found' });
    }
};

export const setUserReady = (user: IUser, roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);

    if (
        !room ||
        !room.users.find((u) => u.id === user.id) ||
        room.gameState.phase !== 'lobby' ||
        room.users.length < 2 ||
        room.gameState.readyUsers?.find((u) => u.id === user.id)
    ) {
        return false;
    }

    if (room.gameState.readyUsers) {
        room.gameState.readyUsers.push(user);
    } else {
        room.gameState.readyUsers = [user];
    }

    if (
        room.gameState.readyUsers.length === room.users.length &&
        room.users.length > 1
    ) {
        room.gameState.phase = 'round-1';
        room.gameState.impostor =
            room.users[Math.floor(Math.random() * room.users.length)];
        room.gameState.currentPlayer =
            room.users[Math.floor(Math.random() * room.users.length)];

        return true;
    }
};

export const setUserNotReady = (user: IUser, roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);

    if (!room || room.gameState.phase !== 'lobby') {
        return;
    }

    if (room.gameState.readyUsers) {
        const index = room.gameState.readyUsers.findIndex(
            (u) => u.id === user.id
        );
        if (index !== -1) {
            room.gameState.readyUsers.splice(index, 1);
        }
    }
};

export const joinRoom = (roomId: string, user: IUser) => {
    const room = rooms.find((r) => r.id === roomId);
    if (
        room &&
        room.users.length < 10 &&
        !room.users.find((u) => u.id === user.id)
    ) {
        room.users.push(user);
    }
};

const isImpostor = (user: IUser, room: IRoom) => {
    return user.id === room.gameState.impostor?.id;
};

export const getCurrentWord = (req: Request, res: Response) => {
    const room = rooms.find((r) => r.id === req.params.id);

    if (
        room &&
        room.gameState.phase &&
        !room.gameState.phase.startsWith('round-')
    ) {
        res.status(404).json({ message: 'Phase is not round' });
        return;
    }

    const user = room?.users.find((u) => u.id === req.body.user.id);
    const roundIndex = parseInt(room?.gameState.phase.substring(6) || '') - 1;

    if (user && room && !isImpostor(user, room)) {
        res.status(200).json({
            word: room?.gameState?.words?.[roundIndex].word,
        });
    } else if (user && room && isImpostor(user, room)) {
        res.status(200).json({
            word: room?.gameState?.words?.[roundIndex].antonym,
        });
    }
};

const getNextPlayer = (room: IRoom) => {
    const currentPlayerIndex = room.users.findIndex(
        (u) => u.id === room.gameState.currentPlayer?.id
    );
    const nextPlayerIndex =
        currentPlayerIndex === room.users.length - 1
            ? 0
            : currentPlayerIndex + 1;

    return room.users[nextPlayerIndex];
};

const setNextPhase = (room: IRoom) => {
    const currentPhase = room.gameState.phase.split('-');
    let nextPhase;

    if (currentPhase[0] === 'scoreboard' && currentPhase[1] === '13') {
        return false;
    } else if (currentPhase[0] === 'vote') {
        room.gameState.votes = [];
        nextPhase = `scoreboard-${currentPhase[1]}`;
    } else if (currentPhase[0] === 'round') {
        room.gameState.hints = [];
        nextPhase = `vote-${currentPhase[1]}`;
    } else {
        nextPhase = `round-${parseInt(currentPhase[1]) + 1}`;
    }

    room.gameState.phase = nextPhase;
    return true;
};

export let endOfRound = false;
export let endOfGame = false;

export const addHint = (word: string, user: IUser, roomId: string) => {
    endOfRound = false;
    const room = rooms.find((r) => r.id === roomId);

    if (
        room &&
        room.gameState.hints &&
        room.gameState.hints.length === 2 * room.users.length - 1
    ) {
        endOfRound = true;
    }

    const userHints = room?.gameState.hints?.filter(
        (h) => h.user.id === user.id
    );

    if (
        !room?.gameState.phase.startsWith('round-') ||
        room?.gameState?.currentPlayer?.id !== user.id ||
        (userHints && userHints.length >= 2) ||
        room?.gameState.hints?.find((h) => h.word === word)
    ) {
        return false;
    }

    if (room.gameState.hints) {
        room.gameState.hints.push({ word, user });
    } else {
        room.gameState.hints = [{ word, user }];
    }

    const nextPlayer = getNextPlayer(room);
    room.gameState.currentPlayer = nextPlayer;

    if (endOfRound) {
        setNextPhase(room);
    }

    return true;
};

export const getCurrentPlayer = (req: Request, res: Response) => {
    const room = rooms.find((r) => r.id === req.params.id);

    if (room && room.gameState.phase.startsWith('round-')) {
        res.status(200).json({ currentPlayer: room.gameState.currentPlayer });
    } else {
        res.status(404).json({ message: 'Phase is not round' });
    }
};

export let allVoted = false;

export const addVote = (votee: IUser, user: IUser, roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    const vote = room?.users.find((u) => u.id === votee.id);

    if (
        !room ||
        !room.gameState.phase.startsWith('vote-') ||
        room.gameState.votes?.find((v) => v.user.id === user?.id) ||
        !vote
    ) {
        return false;
    }

    if (room.gameState.votes && user) {
        room.gameState.votes.push({ vote: vote, user });
    } else if (user) {
        room.gameState.votes = [{ vote: vote, user }];
    }

    if (room.gameState.votes) {
        allVoted = room.gameState.votes.length === room.users.length;
    }

    if (allVoted) {
        setNextPhase(room);
    }
};
