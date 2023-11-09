import IHint from './hint';
import IUser from './user';
import IWord from './word';

interface gameState {
    phase: string;
    readyUsers: IUser[];
    words?: IWord[];
    impostor?: IUser;
    currentPlayer?: IUser;
    hints?: IHint[];
}

export default gameState;
