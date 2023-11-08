import { createContext, useContext, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import IAuthContext from '../interfaces/AuthContext';
import IUser from '../interfaces/User';
import IProviderProps from '../interfaces/ProviderProps';

const AuthContext = createContext<IAuthContext | null>(null);

export const useAuth = (): IAuthContext => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};

export const AuthProvider = ({ children }: IProviderProps) => {
    const [isAuth, setIsAuth] = useState<boolean>(false);
    const [user, setUser] = useState<IUser | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [socket, setSocket] = useState<Socket | null>(null);

    const signIn = (username: string) => {
        const newSocket = io(import.meta.env.VITE_API_URL, {
            query: {
                username,
            },
        });

        newSocket.on('connect', () => {
            setSocket(newSocket);
            setUser({ id: newSocket.id, username });
            setIsAuth(true);
            setIsLoading(false);
        });
    };

    const value = {
        isAuth,
        isLoading,
        user,
        signIn,
        socket,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};
