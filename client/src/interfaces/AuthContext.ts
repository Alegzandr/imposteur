import { Socket } from 'socket.io-client';
import IUser from './User';

interface IAuthContext {
    isAuth: boolean;
    isLoading: boolean;
    user: IUser | null;
    signIn: (username: string) => void;
    socket: Socket | null;
}

export default IAuthContext;
