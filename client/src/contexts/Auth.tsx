import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import IAuthContext from '../interfaces/AuthContext';
import IUser from '../interfaces/User';
import IProviderProps from '../interfaces/ProviderProps';

const AuthContext = createContext<IAuthContext | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
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
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [socket, setSocket] = useState<Socket | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const signIn = (username: string) => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        setIsLoading(true);
        setError('');

        const newSocket = io(import.meta.env.VITE_API_URL, {
            query: {
                username,
            },
        });
        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            // socket.id changes on every (re)connection: keep the user in sync
            setSocket(newSocket);
            setUser({ id: newSocket.id as string, username });
            setIsAuth(true);
            setIsLoading(false);
            setError('');
        });

        newSocket.on('connect_error', () => {
            setIsLoading(false);
            setError('Impossible de se connecter au serveur.');
        });
    };

    useEffect(() => {
        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    const value = {
        isAuth,
        isLoading,
        error,
        user,
        signIn,
        socket,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};
