import { Request, Response } from 'express';
import {
    createRoom,
    getLobbyRooms,
    getRoom,
    sanitizeRoom,
} from '../services/game';

export const addRoom = (req: Request, res: Response) => {
    const user = req.body.user;

    if (!user?.id || !user?.username) {
        res.status(400).json({ message: 'Invalid user' });
        return;
    }

    const newRoom = createRoom({
        id: user.id,
        username: String(user.username).slice(0, 16),
    });
    res.status(201).json({ room: sanitizeRoom(newRoom) });
};

export const getRooms = (_req: Request, res: Response) => {
    res.status(200).json({ rooms: getLobbyRooms() });
};

export const getRoomById = (req: Request, res: Response) => {
    const room = getRoom(req.params.id);

    if (room) {
        res.status(200).json({ room: sanitizeRoom(room) });
    } else {
        res.status(404).json({ message: 'Room not found' });
    }
};
