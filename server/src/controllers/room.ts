import { Request, Response } from 'express';
import { v4 } from 'uuid';
import IRoom from '../interfaces/room';

const rooms: IRoom[] = [];

export const addRoom = (req: Request, res: Response) => {
    const newRoom: IRoom = {
        id: v4(),
        users: [req.body.user],
    };

    rooms.push(newRoom);
    res.status(201).json({ room: newRoom });
};
