import { Request, Response } from 'express';
import { v4 } from 'uuid';
import path from 'path';
import util from 'util';
import fs from 'fs';
import IRoom from '../interfaces/room';
import IUser from '../interfaces/user';
import IWord from '../interfaces/word';

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
            words.push(wordPairs[randomIndex]);
        }
    } catch (err) {
        console.error('Error reading the file:', err);
        return [];
    }

    return words;
};

const deleteWordsAndImpostor = (room: IRoom) => {
    const newRoom = { ...room };
    delete newRoom.gameState.words;
    delete newRoom.gameState.impostor;
    return newRoom;
};

export const addRoom = async (req: Request, res: Response) => {
    const newRoom: IRoom = {
        id: v4(),
        users: [req.body.user],
        gameState: {
            phase: 'lobby',
            readyUsers: [],
            words: await getWords(),
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
        return;
    }

    if (room.gameState.readyUsers) {
        room.gameState.readyUsers.push(user);
    } else {
        room.gameState.readyUsers = [user];
    }

    if (room.gameState.readyUsers.length === room.users.length) {
        room.gameState.phase = 'game';
        room.gameState.impostor =
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
