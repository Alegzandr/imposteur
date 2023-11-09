import IUser from './user';

interface gameState {
    phase: string;
    readyUsers?: IUser[];
    words?: { word: string; antonym: string }[];
    impostor?: IUser;
}

export default gameState;
