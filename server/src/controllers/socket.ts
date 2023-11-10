import { Server } from 'socket.io';
import ICorsOptions from '../interfaces/corsOptions';
import IUser from '../interfaces/user';
import { addUser, deleteUser } from './user';
import {
    leaveRooms,
    setUserReady,
    setUserNotReady,
    joinRoom,
    addHint,
    endOfRound,
    addVote,
    allVoted,
} from './room';

export const handleSocket = (server: any, corsOptions: ICorsOptions) => {
    const io = new Server(server, {
        cors: corsOptions,
    });

    io.on('connection', (socket) => {
        const newUser: IUser = {
            id: socket.id,
            username: socket.handshake.query.username as string,
        };
        addUser(newUser);
        socket.join('home');
        console.log('a user connected');

        socket.on('disconnect', () => {
            leaveRooms(newUser);
            deleteUser(socket.id);
            console.log('user disconnected');
        });

        socket.on('roomCreated', (room) => {
            io.to('home').emit('roomCreated', room);
            console.log(`user ${newUser.username} created room ${room.id}`);
        });

        socket.on('join', (roomId) => {
            socket.leave('home');
            joinRoom(roomId, newUser);
            socket.join(roomId);
            io.to(roomId).emit('userJoined', newUser);
            console.log(`user ${newUser.username} joined room ${roomId}`);
        });

        socket.on('ready', (roomId) => {
            const allReady = setUserReady(newUser, roomId);
            io.to(roomId).emit('ready', newUser);
            console.log(`user ${newUser.username} is ready`);

            if (allReady) {
                io.to(roomId).emit('startGame');
                console.log(`game started in room ${roomId}`);
            }
        });

        socket.on('notReady', (roomId) => {
            setUserNotReady(newUser, roomId);
            io.to(roomId).emit('notReady', newUser);
            console.log(`user ${newUser.username} is not ready`);
        });

        socket.on('addHint', (roomId, hint) => {
            const newHint = addHint(hint.toLowerCase(), newUser, roomId);

            if (newHint) {
                io.to(roomId).emit('newHint', { word: hint, user: newUser });
                console.log(`user ${newUser.username} sent a hint`);
            }

            if (endOfRound) {
                io.to(roomId).emit('endOfRound');
                console.log(`end of round in room ${roomId}`);
            }
        });

        socket.on('addVote', (roomId, vote) => {
            const newVote = addVote(vote, newUser, roomId);

            if (newVote) {
                io.to(roomId).emit('newVote', { vote, user: newUser });
                console.log(`user ${newUser.username} voted`);
            }

            if (allVoted) {
                io.to(roomId).emit('allVoted');
                console.log(`all voted in room ${roomId}`);
            }
        });
    });
};
