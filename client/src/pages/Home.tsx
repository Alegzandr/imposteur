import { FormEvent, useCallback, useEffect, useState } from 'react';
import { PiUserCircleDuotone } from 'react-icons/pi';
import { AiOutlineReload } from 'react-icons/ai';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Auth';
import Loader from '../components/Loader';
import IRoom from '../interfaces/Room';
import capitalize from '../utils/capitalize';

function Home() {
    const { isAuth, isLoading, error, user, signIn, socket } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState<string>('');
    const [rooms, setRooms] = useState<IRoom[]>([]);
    const [createError, setCreateError] = useState<string>('');

    const handleLogin = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const newUsername = username.trim();
        if (newUsername.length < 3 || newUsername.length > 16) {
            return;
        }

        signIn(newUsername);
    };

    const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCreateError('');

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

            navigate(`/room/${data.room.id}`);
        } catch (err) {
            console.error(err);
            setCreateError('Impossible de créer la partie.');
        }
    };

    const fetchRooms = useCallback(async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/rooms`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            setRooms(data.rooms);
        } catch (err) {
            console.error(err);
        }
    }, []);

    // The room list stays in sync through socket events; the refresh button
    // is only a manual fallback.
    useEffect(() => {
        if (!socket) {
            return;
        }

        const handleRoomCreated = (newRoom: IRoom) => {
            setRooms((prevRooms) =>
                prevRooms.some((r) => r.id === newRoom.id)
                    ? prevRooms
                    : [...prevRooms, newRoom]
            );
        };

        const handleRoomUpdated = (updatedRoom: IRoom) => {
            setRooms((prevRooms) =>
                prevRooms.map((r) =>
                    r.id === updatedRoom.id ? updatedRoom : r
                )
            );
        };

        const handleRoomRemoved = (roomId: string) => {
            setRooms((prevRooms) => prevRooms.filter((r) => r.id !== roomId));
        };

        socket.on('roomCreated', handleRoomCreated);
        socket.on('roomUpdated', handleRoomUpdated);
        socket.on('roomRemoved', handleRoomRemoved);

        return () => {
            socket.off('roomCreated', handleRoomCreated);
            socket.off('roomUpdated', handleRoomUpdated);
            socket.off('roomRemoved', handleRoomRemoved);
        };
    }, [socket]);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms, isAuth]);

    return (
        <>
            <div className="flex flex-col lg:flex-row gap-4 mt-8">
                <div className="rounded-xl bg-zinc-800 p-8 w-full text-center flex items-center flex-col">
                    <h2 className="text-2xl font-bold mb-4 self-start">
                        Jouer
                    </h2>

                    {isLoading ? (
                        <Loader />
                    ) : !isAuth ? (
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
                                    setUsername(
                                        capitalize(e.target.value.trimStart())
                                    )
                                }
                                minLength={3}
                                maxLength={16}
                            />
                            <button className="border focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-700 transition-all">
                                Se connecter
                            </button>
                            {error ? (
                                <p className="text-red-400 text-sm">{error}</p>
                            ) : (
                                <></>
                            )}
                        </form>
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
                                {createError ? (
                                    <p className="text-red-400 text-sm">
                                        {createError}
                                    </p>
                                ) : (
                                    <></>
                                )}
                            </form>
                        </>
                    )}
                </div>

                <div className="hidden lg:block rounded-xl bg-zinc-800 p-8 w-full">
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
                <div className="w-full flex justify-between items-start">
                    <h2 className="text-2xl font-bold mb-4">
                        Liste des parties
                    </h2>
                    {isAuth ? (
                        <button
                            className="border focus:outline-none font-medium rounded-lg text-sm p-2 h-full bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button"
                            onClick={() => fetchRooms()}
                        >
                            <AiOutlineReload />
                        </button>
                    ) : (
                        <></>
                    )}
                </div>

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
                        {rooms.map((room) =>
                            room.users.length > 0 ? (
                                <li key={room.id}>
                                    <Link
                                        to={`/room/${room.id}`}
                                        className="font-medium mr-2 px-4 py-2 rounded bg-gray-700 text-blue-400 border hover:border-blue-400 transition-all"
                                    >
                                        Room de {room.users[0].username} (
                                        {room.users.length}/10)
                                    </Link>
                                </li>
                            ) : (
                                <></>
                            )
                        )}
                    </ul>
                )}
            </div>
        </>
    );
}

export default Home;
