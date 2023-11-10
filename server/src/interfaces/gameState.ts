import IHint from './hint';
import IScore from './score';
import IUser from './user';
import IVote from './vote';
import IWord from './word';

interface gameState {
    phase: string;
    readyUsers: IUser[];
    words?: IWord[];
    previousImpostor?: IUser;
    impostor?: IUser;
    currentPlayer?: IUser;
    hints?: IHint[];
    votes?: IVote[];
    scores: IScore[];
}

export default gameState;
