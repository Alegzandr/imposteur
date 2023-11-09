import IUser from './User';

interface gameState {
    phase: string;
    readyUsers?: IUser[];
    words?: { word: string; antonym: string }[];
    impostor?: IUser;
}

export default gameState;
