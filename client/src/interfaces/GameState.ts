import IUser from './User';

interface gameState {
    phase: string;
    readyUsers?: IUser[];
    words?: { word: string; antonym: string }[];
    impostor?: IUser;
    currentPlayer?: IUser;
    hints?: { word: string; user: IUser }[];
    votes?: { vote: IUser; user: IUser }[];
}

export default gameState;
