import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import IRoom from '../interfaces/Room';
import { useAuth } from '../contexts/Auth';

function Room() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState<IRoom | null>(null);
    const { user, socket, isAuth } = useAuth();

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

            socket?.emit('joinRoom', { roomId: id });
            setRoom(data.room);
        } catch (error: any) {
            console.error(error);
            navigate('/');
        }
    };

    useEffect(() => {
        fetchRoom();
    }, []);

    return (
        <>
            <h2>Lobby</h2>
            <ul>
                {room?.users.map((player) => (
                    <li key={player.id}>{player.username}</li>
                ))}
            </ul>
        </>
    );
}

export default Room;
