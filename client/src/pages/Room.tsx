import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import IRoom from '../interfaces/Room';
import { useAuth } from '../contexts/Auth';

function Room() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState<IRoom | null>(null);
    const { user } = useAuth();

    const fetchRoom = async () => {
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

            if (!data.room.users.find((u: any) => u.id === user?.id)) {
                throw new Error('You are not a member of this room.');
            }

            setRoom(data.room);
        } catch (error: any) {
            console.error(error);
            navigate('/');
        }
    };

    useEffect(() => {
        fetchRoom();
    }, []);

    return <></>;
}

export default Room;
