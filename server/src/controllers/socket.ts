import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import ICorsOptions from '../interfaces/corsOptions';
import IUser from '../interfaces/user';
import { addUser, deleteUser } from './user';
import {
    initGame,
    joinRoom,
    leaveRoom,
    handleDisconnect,
    setUserReady,
    setUserNotReady,
    addHint,
    addVote,
} from '../services/game';

export const handleSocket = (server: HttpServer, corsOptions: ICorsOptions) => {
    const io = new Server(server, {
        cors: corsOptions,
    });

    initGame(io);

    io.on('connection', (socket) => {
        const username = (socket.handshake.query.username as string) || '';

        if (!username.trim()) {
            socket.disconnect(true);
            return;
        }

        const user: IUser = {
            id: socket.id,
            username: username.trim().slice(0, 16),
        };
        addUser(user);
        socket.join('home');
        console.log(`user ${user.username} connected`);

        socket.on('disconnect', () => {
            handleDisconnect(user);
            deleteUser(socket.id);
            console.log(`user ${user.username} disconnected`);
        });

        socket.on('join', (roomId: string) => {
            if (typeof roomId !== 'string') return;
            // Join the socket.io channel before mutating game state so this
            // socket receives the resulting roomUpdate broadcast.
            socket.leave('home');
            socket.join(roomId);
            const room = joinRoom(roomId, user);
            if (room) {
                console.log(`user ${user.username} joined room ${roomId}`);
            } else {
                socket.leave(roomId);
                socket.join('home');
            }
        });

        socket.on('leave', (roomId: string) => {
            if (typeof roomId !== 'string') return;
            socket.leave(roomId);
            socket.join('home');
            leaveRoom(roomId, user);
            console.log(`user ${user.username} left room ${roomId}`);
        });

        socket.on('ready', (roomId: string) => {
            if (typeof roomId !== 'string') return;
            setUserReady(user, roomId);
        });

        socket.on('notReady', (roomId: string) => {
            if (typeof roomId !== 'string') return;
            setUserNotReady(user, roomId);
        });

        socket.on('addHint', (roomId: string, hint: string) => {
            if (typeof roomId !== 'string' || typeof hint !== 'string') return;
            addHint(hint, user, roomId);
        });

        socket.on('addVote', (roomId: string, votee: IUser) => {
            if (typeof roomId !== 'string' || !votee?.id) return;
            addVote(votee, user, roomId);
        });
    });

    return io;
};
