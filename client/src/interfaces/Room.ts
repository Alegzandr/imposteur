import IUser from './User';
import IGameState from './GameState';

interface IRoom {
    id: string;
    users: IUser[];
    gameState: IGameState;
}

export default IRoom;
