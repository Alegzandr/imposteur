import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Ready from '../components/Ready';
import NotReady from '../components/NotReady';
import IRoom from '../interfaces/Room';
import IUser from '../interfaces/User';
import { useAuth } from '../contexts/Auth';
import capitalize from '../utils/capitalize';

function Room() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState<IRoom | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [currentWord, setCurrentWord] = useState('');
    const [currentHint, setCurrentHint] = useState('');
    const [hasVoted, setHasVoted] = useState(false);
    const { socket, isAuth, user } = useAuth();

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
        if (room && room.users.length > 1) {
            const newState = !isReady;
            setIsReady(newState);
            socket?.emit(newState ? 'ready' : 'notReady', id);
        }
    };

    const fetchCurrentWord = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/rooms/${id}/word`,
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

            setCurrentWord(capitalize(data.word));
        } catch (error: any) {
            console.error(error);
        }
    };

    const fetchCurrentPlayer = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/rooms/${id}/player`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            setRoom((prevRoom) => {
                if (prevRoom) {
                    return {
                        ...prevRoom,
                        gameState: {
                            ...prevRoom.gameState,
                            currentPlayer: data.currentPlayer,
                        },
                    };
                }
                return prevRoom;
            });
        } catch (error: any) {
            setRoom((prevRoom) => {
                if (prevRoom) {
                    return {
                        ...prevRoom,
                        gameState: {
                            ...prevRoom.gameState,
                            currentPlayer: undefined,
                        },
                    };
                }
                return prevRoom;
            });
            console.error(error);
        }
    };

    const handleAddHint = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (
            currentHint === currentWord ||
            !currentHint.replace(/<[^>]*>?/gm, '').trim() ||
            room?.gameState?.hints?.some(
                (h) => h.word.toLowerCase() === currentHint.toLowerCase()
            )
        ) {
            return;
        }

        socket?.emit('addHint', id, currentHint.trim());
        setCurrentHint('');
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
                    const readyUsers = prevRoom.gameState.readyUsers || [];
                    const isAlreadyReady = readyUsers.some(
                        (u) => u.id === user.id
                    );

                    if (!isAlreadyReady) {
                        return {
                            ...prevRoom,
                            gameState: {
                                ...prevRoom.gameState,
                                readyUsers: [...readyUsers, user],
                            },
                        };
                    }
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
        const handleNotReady = (user: IUser) => {
            setRoom((prevRoom) => {
                if (prevRoom) {
                    const readyUsers = prevRoom.gameState.readyUsers || [];
                    const updatedReadyUsers = readyUsers.filter(
                        (u) => u.id !== user.id
                    );

                    return {
                        ...prevRoom,
                        gameState: {
                            ...prevRoom.gameState,
                            readyUsers: updatedReadyUsers,
                        },
                    };
                }
                return prevRoom;
            });
        };

        socket?.on('notReady', handleNotReady);

        return () => {
            socket?.off('notReady', handleNotReady);
        };
    }, [socket]);

    useEffect(() => {
        const handleStartGame = () => {
            setRoom((prevRoom) => {
                if (prevRoom) {
                    fetchCurrentWord();
                    fetchCurrentPlayer();
                    return {
                        ...prevRoom,
                        gameState: {
                            ...prevRoom.gameState,
                            phase: 'round-1',
                        },
                    };
                }
                return prevRoom;
            });
        };

        socket?.on('startGame', handleStartGame);

        return () => {
            socket?.off('startGame', handleStartGame);
        };
    }, [socket]);

    useEffect(() => {
        const handleNewHint = (hint: { word: string; user: IUser }) => {
            setRoom((prevRoom) => {
                if (prevRoom) {
                    fetchCurrentPlayer();
                    return {
                        ...prevRoom,
                        gameState: {
                            ...prevRoom.gameState,
                            hints: [...(prevRoom.gameState.hints || []), hint],
                        },
                    };
                }
                return prevRoom;
            });
        };

        socket?.on('newHint', handleNewHint);

        return () => {
            socket?.off('newHint', handleNewHint);
        };
    }, [socket]);

    useEffect(() => {
        const handleEndOfRound = () => {
            setRoom((prevRoom) => {
                if (prevRoom) {
                    return {
                        ...prevRoom,
                        gameState: {
                            ...prevRoom.gameState,
                            phase: `vote-${prevRoom.gameState.phase.substring(
                                6
                            )}`,
                            hints: [],
                        },
                    };
                }
                return prevRoom;
            });
        };

        socket?.on('endOfRound', handleEndOfRound);

        return () => {
            socket?.off('endOfRound', handleEndOfRound);
        };
    }, [socket]);

    useEffect(() => {
        fetchRoom();
        socket?.emit('join', id);
    }, []);

    return room && room.gameState && room.gameState.phase === 'lobby' ? (
        <>
            <h2 className="text-2xl font-bold mb-4 mt-4 text-center">Lobby</h2>

            <button
                className="w-full lg:w-1/4 border focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleReady}
                disabled={room.users.length < 2}
                type="button"
            >
                {isReady ? (
                    <span className="flex items-center justify-center">
                        <NotReady /> Retirer prêt
                    </span>
                ) : (
                    <span className="flex items-center justify-center">
                        <Ready /> Mettre prêt
                    </span>
                )}
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
                            <Ready />
                        ) : (
                            <NotReady />
                        )}
                        {player.username}
                    </li>
                ))}
            </ul>
        </>
    ) : room && room.gameState && room.gameState.phase.startsWith('round-') ? (
        <>
            <h2 className="text-5xl lg:text-6xl font-bold mt-4 text-center select-none">
                {currentWord ? currentWord : 'Chargement...'}
            </h2>
            <h3 className="text-sm text-center mb-2 mt-4">
                Tour {room.gameState.phase.substring(6)}/13
            </h3>

            <form
                className="w-full flex items-center gap-4 mt-4"
                onSubmit={handleAddHint}
            >
                <input
                    type="text"
                    className="text-sm rounded-lg block w-full p-4 bg-zinc-700 border-zinc-600 placeholder-zinc-400 text-white focus:ring-zinc-500 focus:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder={
                        room?.gameState?.currentPlayer?.id === user?.id
                            ? 'Votre indice'
                            : 'En attente...'
                    }
                    required
                    value={currentHint}
                    onChange={(e) =>
                        setCurrentHint(capitalize(e.target.value.trimStart()))
                    }
                    min={1}
                    max={32}
                    disabled={room?.gameState?.currentPlayer?.id !== user?.id}
                />
                <button
                    className="border focus:outline-none font-medium rounded-lg text-sm px-5 py-4 bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    disabled={room?.gameState?.currentPlayer?.id !== user?.id}
                >
                    Valider
                </button>
            </form>

            <div className="flex flex-col gap-4 mt-4 lg:flex-row lg:flex-wrap">
                {room?.users.map((player, index) => (
                    <div
                        className={`${
                            room?.gameState?.currentPlayer?.id === player?.id
                                ? 'outline'
                                : ''
                        } rounded-xl bg-zinc-800 p-8 w-full flex gap-4 justify-between px-4 lg:flex-col lg:w-1/4 lg:justify-start`}
                        key={`player-${index + 1}`}
                    >
                        <h2 className="text-2xl font-bold mb-4 mt-4 text-center lg:mt-0">
                            {player.username}
                        </h2>

                        <ul className="flex flex-col gap-4 items-center justify-center">
                            {room?.gameState?.hints
                                ?.filter((h) => h.user.id === player?.id)
                                .map((hint, index) => (
                                    <li key={`hint-${index + 1}`}>
                                        {capitalize(hint.word)}
                                    </li>
                                ))}
                        </ul>
                    </div>
                ))}
            </div>
        </>
    ) : room && room.gameState && room.gameState.phase.startsWith('vote-') ? (
        <>
            <h2 className="text-5xl lg:text-6xl font-bold mt-4 text-center select-none">
                Votes
            </h2>
            <h3 className="text-sm text-center mb-2 mt-4">
                Tour {room.gameState.phase.substring(5)}/13
            </h3>

            <form
                className="w-full flex flex-col items-center gap-4 mt-4"
                onSubmit={handleAddHint}
            >
                <button
                    className="w-full border focus:outline-none font-medium rounded-lg text-sm px-5 py-4 bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    disabled={hasVoted}
                >
                    Valider
                </button>

                <div className="w-full flex flex-col gap-4 lg:flex-row lg:flex-wrap">
                    {room?.users.map((player, playerIndex) => (
                        <div
                            className="lg:w-1/4 flex items-center px-4 border rounded border-zinc-700"
                            key={`player-${playerIndex + 1}`}
                        >
                            <input
                                id={`player-${playerIndex + 1}`}
                                type="radio"
                                value={player.id}
                                name="player"
                                className="w-4 h-4 focus:ring-blue-600 ring-offset-zinc-800 focus:ring-2 bg-zinc-700 border-zinc-600"
                                required
                            />
                            <label
                                htmlFor={`player-${playerIndex + 1}`}
                                className="w-full py-4 ml-2 text-lg font-medium text-zinc-300 flex justify-between items-center lg:flex-col"
                            >
                                <span>{player.username}</span>

                                <div className="flex flex-wrap gap-1 ml-2 lg:my-4">
                                    {room.gameState.votes &&
                                        room.gameState.votes
                                            .filter(
                                                (item) =>
                                                    item.vote.id === player.id
                                            )
                                            .map((vote, voteIndex) => (
                                                <span
                                                    className="text-xs py-1 px-2 mr-2 rounded-3xl bg-zinc-700 text-red-400 border text-center"
                                                    key={`vote-${playerIndex}-${voteIndex}`}
                                                >
                                                    {vote.user.username}
                                                </span>
                                            ))}
                                </div>
                            </label>
                        </div>
                    ))}
                </div>
            </form>
        </>
    ) : (
        <></>
    );
}

export default Room;
