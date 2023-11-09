import IUser from './user';
import IWord from './word';

interface gameState {
    phase: string;
    readyUsers?: IUser[];
    words?: IWord[];
    impostor?: IUser;
}

export default gameState;
