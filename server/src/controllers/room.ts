import { Request, Response } from 'express';
import { v4 } from 'uuid';
import IRoom from '../interfaces/room';
import IUser from '../interfaces/user';

const rooms: IRoom[] = [];

export const addRoom = (req: Request, res: Response) => {
    const newRoom: IRoom = {
        id: v4(),
        users: [req.body.user],
    };

    rooms.push(newRoom);
    res.status(201).json({ room: newRoom });
};

export const getRooms = (_req: Request, res: Response) => {
    res.status(200).json({ rooms });
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
