import { FormEvent, useEffect, useState } from 'react';
import { PiUserCircleDuotone } from 'react-icons/pi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Auth';
import Loader from '../components/Loader';
import IRoom from '../interfaces/Room';

function Home() {
    const { isAuth, isLoading, user, signIn, socket } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState<string>('');
    const [rooms, setRooms] = useState<IRoom[]>([]);

    const handleLogin = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (username.length < 3 || username.length > 16) {
            return;
        }

        signIn(username);
    };

    const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/rooms`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            socket?.emit('roomCreated', data.room);
            navigate(`/room/${data.room.id}`);
        } catch (error: any) {
            console.error(error);
        }
    };

    const fetchRooms = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/rooms`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            setRooms(data.rooms);
        } catch (error: any) {
            console.error(error);
        }
    };

    useEffect(() => {
        const handleRoomCreated = (newRoom: IRoom) => {
            setRooms((prevRooms) => [...prevRooms, newRoom]);
        };

        socket?.on('roomCreated', handleRoomCreated);

        return () => {
            socket?.off('roomCreated', handleRoomCreated);
        };
    }, [socket]);

    useEffect(() => {
        fetchRooms();
    }, []);

    return (
        <>
            <div className="flex flex-col lg:flex-row gap-4 mt-8">
                <div className="rounded-xl bg-zinc-800 p-8 w-full text-center flex items-center flex-col">
                    <h2 className="text-2xl font-bold mb-4 self-start">
                        Jouer
                    </h2>

                    {!isAuth ? (
                        <form
                            className="h-full flex flex-col justify-center gap-4"
                            onSubmit={handleLogin}
                        >
                            <input
                                type="text"
                                className="text-center text-sm rounded-lg block w-full p-2.5 bg-zinc-700 border-zinc-600 placeholder-zinc-400 text-white focus:ring-zinc-500 focus:border-zinc-500"
                                placeholder="Philippe"
                                required
                                value={username}
                                onChange={(e) =>
                                    setUsername(e.target.value.trim())
                                }
                                min={3}
                                max={16}
                            />
                            <button className="border focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-700 transition-all">
                                Se connecter
                            </button>
                        </form>
                    ) : isLoading ? (
                        <Loader />
                    ) : (
                        <>
                            <div className="text-9xl text-zinc-200">
                                <PiUserCircleDuotone />
                                <h3 className="text-xl font-semibold">
                                    {user?.username}
                                </h3>
                            </div>

                            <form
                                className="flex gap-2 flex-col mt-4"
                                onSubmit={handleCreate}
                            >
                                <button className="border focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-700 transition-all">
                                    Créer une partie
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <div className="rounded-xl bg-zinc-800 p-8 w-full">
                    <h2 className="text-2xl font-bold mb-4">Règles</h2>

                    <p className="text-zinc-400 text-lg mb-2">
                        Chaque personne détient un mot identique, à l'exception
                        d'une seule : l'imposteur. Ce dernier ignore sa propre
                        identité en tant qu'imposteur. À tour de rôle, proposez
                        un mot qui démontre que vous n'êtes pas l'imposteur. Si
                        l'imposteur passe inaperçu et n'est pas majoritairement
                        désigné à la fin, il remporte la partie. Autrement, la
                        victoire revient au reste des joueurs.
                    </p>
                </div>
            </div>

            <div className="rounded-xl bg-zinc-800 p-8 w-full text-center flex items-center flex-col mt-4">
                <h2 className="text-2xl font-bold mb-4 self-start">
                    Liste des parties
                </h2>

                {!isAuth ? (
                    <p className="text-zinc-400 mb-2">
                        Connectez-vous avant de pouvoir rejoindre une partie.
                    </p>
                ) : rooms.length < 1 ? (
                    <p className="text-zinc-400 mb-2">
                        Aucune partie n'est en cours.
                    </p>
                ) : (
                    <ul className="flex gap-2 flex-wrap self-start">
                        {rooms.map((room) => (
                            <li key={room.id}>
                                {room.users.length > 0 ? (
                                    <Link
                                        to={`/room/${room.id}`}
                                        className="font-medium mr-2 px-4 py-2 rounded bg-gray-700 text-blue-400 border hover:border-blue-400 transition-all"
                                    >
                                        Room de {room.users[0].username}
                                    </Link>
                                ) : (
                                    <></>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}

export default Home;
