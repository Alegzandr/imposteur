import IHint from './hint';
import IScore from './score';
import IUser from './user';
import IVote from './vote';
import IWord from './word';

interface IRevealed {
    word: string;
    impostorWord: string;
    impostor: IUser;
}

interface IGameState {
    phase: string;
    readyUsers: IUser[];
    words?: IWord[];
    impostor?: IUser;
    currentPlayer?: IUser;
    hints: IHint[];
    votes: IVote[];
    scores: IScore[];
    revealed?: IRevealed;
    phaseEndsAt?: number;
}

export default IGameState;
export { IRevealed };
