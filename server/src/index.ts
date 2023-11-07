import express, { json } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connect } from 'mongoose';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import routes from './routes';

dotenv.config();

const app = express();
const port = 3000;

app.use(json());
connect(process.env.MONGODB_URI!, {});

const corsOptions = {
    origin: process.env.CLIENT_URL,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use('/', routes);

const server = createServer(app);
const io = new SocketIOServer(server, {
    cors: corsOptions,
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
