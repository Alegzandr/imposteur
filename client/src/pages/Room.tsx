import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import IRoom from '../interfaces/Room';
import IUser from '../interfaces/User';
import { useAuth } from '../contexts/Auth';

function Room() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState<IRoom | null>(null);
    const [isReady, setIsReady] = useState(false);
    const { socket, isAuth } = useAuth();

    const fetchRoom = async () => {
        if (!isAuth) {
            navigate('/');
            return;
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/rooms/${id}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            if (data.room.gameState.phase !== 'lobby') {
                throw new Error('Game has already started.');
            }

            socket?.emit('join', id);
            setRoom(data.room);
        } catch (error: any) {
            console.error(error);
            navigate('/');
        }
    };

    const handleReady = () => {
        setIsReady(true);
        socket?.emit('ready', id);
    };

    useEffect(() => {
        const handleUserJoined = (user: IUser) => {
            setRoom((prevRoom) => {
                if (prevRoom && !prevRoom.users.some((u) => u.id === user.id)) {
                    return {
                        ...prevRoom,
                        users: [...prevRoom.users, user],
                    };
                }
                return prevRoom;
            });
        };

        socket?.on('userJoined', handleUserJoined);

        return () => {
            socket?.off('userJoined', handleUserJoined);
        };
    }, [socket]);

    useEffect(() => {
        fetchRoom();
    }, []);

    return (
        <>
            <h2>Lobby</h2>

            <button onClick={handleReady} type="button">
                {isReady ? 'Retirer prêt' : 'Mettre prêt'}
            </button>

            <ul>
                {room?.users.map((player) => (
                    <li key={player.id}>{player.username}</li>
                ))}
            </ul>
        </>
    );
}

export default Room;
