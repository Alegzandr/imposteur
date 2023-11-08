import express, { json } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import routes from './routes';
import { handleSocket } from './controllers/socket';
import ICorsOptions from './interfaces/corsOptions';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(json());

const corsOptions: ICorsOptions = {
    origin: process.env.CLIENT_URL as string,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use('/api', routes);

const server = createServer(app);
handleSocket(server, corsOptions);

server.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
});
