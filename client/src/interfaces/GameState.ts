import IUser from './User';

interface IRevealed {
    word: string;
    impostorWord: string;
    impostor: IUser;
}

interface IGameState {
    phase: string;
    readyUsers: IUser[];
    currentPlayer?: IUser;
    hints: { word: string; user: IUser }[];
    votes: { vote: IUser; user: IUser }[];
    scores: { score: number; user: IUser }[];
    revealed?: IRevealed;
    phaseEndsAt?: number;
}

export default IGameState;
export type { IRevealed };
