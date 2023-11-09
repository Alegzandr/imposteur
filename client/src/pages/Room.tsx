import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PiCheckDuotone, PiXDuotone } from 'react-icons/pi';
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
        const handleReady = (user: IUser) => {
            setRoom((prevRoom) => {
                if (prevRoom) {
                    const updatedReadyUsers = new Set(
                        prevRoom.gameState.readyUsers
                    );
                    updatedReadyUsers.add(user);

                    return {
                        ...prevRoom,
                        gameState: {
                            ...prevRoom.gameState,
                            readyUsers: Array.from(updatedReadyUsers),
                        },
                    };
                }
                return prevRoom;
            });
        };

        socket?.on('ready', handleReady);

        return () => {
            socket?.off('ready', handleReady);
        };
    }, [socket]);

    useEffect(() => {
        fetchRoom();
        socket?.emit('join', id);
    }, []);

    return (
        <>
            <h2 className="text-2xl font-bold mb-4 mt-4 text-center">Lobby</h2>

            <button
                className="w-full lg:w-1/4 border focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-700 transition-all"
                onClick={handleReady}
                type="button"
            >
                {isReady ? 'Retirer prêt' : 'Mettre prêt'}
            </button>

            <h3 className="text-2xl font-bold mb-4 mt-4">Liste des joueurs</h3>
            <ul className="flex gap-2 flex-col mt-4">
                {room?.users.map((player) => (
                    <li
                        className="flex items-center w-full lg:w-1/4 font-medium mr-2 px-4 py-2 rounded bg-gray-700 text-blue-400"
                        key={player.id}
                    >
                        {room.gameState.readyUsers &&
                        room.gameState.readyUsers.some(
                            (u) => u.id === player.id
                        ) ? (
                            <span className="text-green-400 mr-2">
                                <PiCheckDuotone />
                            </span>
                        ) : (
                            <span className="text-red-400 mr-2">
                                <PiXDuotone />
                            </span>
                        )}
                        {player.username}
                    </li>
                ))}
            </ul>
        </>
    );
}

export default Room;
