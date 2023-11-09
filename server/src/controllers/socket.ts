import { Server } from 'socket.io';
import ICorsOptions from '../interfaces/corsOptions';
import IUser from '../interfaces/user';
import { addUser, deleteUser } from './user';
import { leaveRooms, setUserReady, setUserNotReady, joinRoom } from './room';

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
        console.log('a user connected');

        socket.on('disconnect', () => {
            leaveRooms(newUser);
            deleteUser(socket.id);
            console.log('user disconnected');
        });

        socket.on('join', (roomId) => {
            joinRoom(roomId, newUser);
            socket.join(roomId);
            io.to(roomId).emit('userJoined', newUser);
            console.log(`user ${newUser.username} joined room ${roomId}`);
        });

        socket.on('ready', (roomId) => {
            const allReady = setUserReady(newUser, roomId);
            io.to(roomId).emit('ready', newUser);

            if (allReady) {
                io.to(roomId).emit('startGame');
            }
        });

        socket.on('notReady', (roomId) => {
            setUserNotReady(newUser, roomId);
            io.to(roomId).emit('notReady', newUser);
        });
    });
};
