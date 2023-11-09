import IUser from './user';
import IGameState from './gameState';

interface IRoom {
    id: string;
    users: IUser[];
    gameState: IGameState;
}

export default IRoom;
