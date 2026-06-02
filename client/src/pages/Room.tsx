import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';
import Ready from '../components/Ready';
import NotReady from '../components/NotReady';
import IRoom from '../interfaces/Room';
import IUser from '../interfaces/User';
import { useAuth } from '../contexts/Auth';
import capitalize from '../utils/capitalize';

const TOTAL_ROUNDS = 13;

function Room() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { socket, isAuth, user } = useAuth();
    const [room, setRoom] = useState<IRoom | null>(null);
    const [currentWord, setCurrentWord] = useState('');
    const [error, setError] = useState('');
    const [currentHint, setCurrentHint] = useState('');
    const [currentVote, setCurrentVote] = useState<IUser | null>(null);
    const [countdown, setCountdown] = useState(0);
    const [isWordHidden, setIsWordHidden] = useState<boolean>(false);

    const phase = room?.gameState.phase || '';
    const roundNumber = phase.includes('-') ? phase.split('-')[1] : '';

    // Derived from server state: no local duplicates that can drift
    const isReady =
        room?.gameState.readyUsers.some((u) => u.id === user?.id) || false;
    const hasVoted =
        room?.gameState.votes.some((v) => v.user.id === user?.id) || false;
    const isMyTurn = room?.gameState.currentPlayer?.id === user?.id;

    // Single source of truth: the server broadcasts the whole room state on
    // every change, plus each player's word privately.
    useEffect(() => {
        if (!isAuth || !socket) {
            navigate('/');
            return;
        }

        const handleRoomUpdate = (newRoom: IRoom) => {
            setRoom((prevRoom) => {
                // Reset per-phase local inputs when the phase changes
                if (prevRoom?.gameState.phase !== newRoom.gameState.phase) {
                    setError('');
                    setCurrentHint('');
                    setCurrentVote(null);
                    if (!newRoom.gameState.phase.startsWith('round-')) {
                        setCurrentWord('');
                    }
                }
                return newRoom;
            });
        };

        const handleWord = (word: string) => {
            setCurrentWord(capitalize(word));
        };

        const handleJoinError = (message: string) => {
            console.error(message);
            navigate('/');
        };

        const handleActionError = (message: string) => {
            setError(message);
        };

        socket.on('roomUpdate', handleRoomUpdate);
        socket.on('yourWord', handleWord);
        socket.on('joinError', handleJoinError);
        socket.on('actionError', handleActionError);

        socket.emit('join', id);

        return () => {
            socket.off('roomUpdate', handleRoomUpdate);
            socket.off('yourWord', handleWord);
            socket.off('joinError', handleJoinError);
            socket.off('actionError', handleActionError);
            socket.emit('leave', id);
        };
    }, [socket, isAuth, id, navigate]);

    // Countdown display driven by the server-provided deadline
    useEffect(() => {
        const phaseEndsAt = room?.gameState.phaseEndsAt;

        if (!phaseEndsAt) {
            setCountdown(0);
            return;
        }

        const update = () => {
            setCountdown(
                Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000))
            );
        };

        update();
        const interval = setInterval(update, 250);

        return () => {
            clearInterval(interval);
        };
    }, [room?.gameState.phaseEndsAt]);

    const handleReady = () => {
        if (room && room.users.length > 1) {
            socket?.emit(isReady ? 'notReady' : 'ready', id);
        }
    };

    const handleAddHint = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        const hint = currentHint.replace(/<[^>]*>?/gm, '').trim();

        if (!hint) {
            setError("L'indice ne peut pas être vide.");
            return;
        }

        if (hint.toLowerCase() === currentWord.toLowerCase()) {
            setError("L'indice ne peut pas être le mot à trouver.");
            return;
        }

        socket?.emit('addHint', id, hint);
        setCurrentHint('');
    };

    const handleAddVote = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!currentVote) {
            return;
        }

        socket?.emit('addVote', id, currentVote);
    };

    if (!room) {
        return (
            <h2 className="text-2xl font-bold mb-4 mt-4 text-center">
                Chargement...
            </h2>
        );
    }

    if (phase === 'lobby') {
        return (
            <>
                <h2 className="text-2xl font-bold mb-4 mt-4 text-center">
                    Lobby
                </h2>

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

                <h3 className="text-2xl font-bold mb-4 mt-4">
                    Liste des joueurs
                </h3>
                <ul className="flex gap-2 flex-col mt-4">
                    {room.users.map((player) => (
                        <li
                            className="flex items-center w-full lg:w-1/4 font-medium mr-2 px-4 py-2 rounded bg-gray-700 text-blue-400"
                            key={player.id}
                        >
                            {room.gameState.readyUsers.some(
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
        );
    }

    if (phase.startsWith('round-')) {
        return (
            <>
                <h2 className="text-5xl lg:text-6xl font-bold mt-4 text-center select-none">
                    {currentWord ? (
                        <div className="flex items-center justify-center gap-2">
                            <span
                                className={`${
                                    isWordHidden ? 'opacity-0' : 'opacity-100'
                                }`}
                            >
                                {currentWord}
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsWordHidden(!isWordHidden)}
                            >
                                {!isWordHidden ? (
                                    <AiFillEyeInvisible />
                                ) : (
                                    <AiFillEye />
                                )}
                            </button>
                        </div>
                    ) : (
                        <span>Chargement...</span>
                    )}
                </h2>
                <h3 className="text-sm text-center mb-2 mt-4">
                    Tour {roundNumber}/{TOTAL_ROUNDS}
                </h3>

                <form
                    className="w-full flex items-center gap-4 mt-4"
                    onSubmit={handleAddHint}
                >
                    <input
                        type="text"
                        className="text-sm rounded-lg block w-full p-4 bg-zinc-700 border-zinc-600 placeholder-zinc-400 text-white focus:ring-zinc-500 focus:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder={isMyTurn ? 'Votre indice' : 'En attente...'}
                        required
                        value={currentHint}
                        onChange={(e) =>
                            setCurrentHint(
                                capitalize(e.target.value.trimStart())
                            )
                        }
                        minLength={1}
                        maxLength={32}
                        disabled={!isMyTurn}
                    />
                    <button
                        className="border focus:outline-none font-medium rounded-lg text-sm px-5 py-4 bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        disabled={!isMyTurn}
                    >
                        Valider
                    </button>
                </form>
                <p className="text-red-400 text-sm text-center mt-2">{error}</p>

                <div className="flex flex-col gap-4 mt-4 lg:flex-row lg:flex-wrap">
                    {room.users.map((player) => (
                        <div
                            className={`${
                                room.gameState.currentPlayer?.id === player.id
                                    ? 'outline'
                                    : ''
                            } rounded-xl bg-zinc-800 p-8 w-full flex gap-4 justify-between px-4 lg:flex-col lg:w-1/4 lg:justify-start`}
                            key={player.id}
                        >
                            <h2 className="text-2xl font-bold mb-4 mt-4 text-center lg:mt-0">
                                {player.username}
                            </h2>

                            <ul className="flex flex-col gap-4 items-center justify-center">
                                {room.gameState.hints
                                    .filter((h) => h.user.id === player.id)
                                    .map((hint, index) => (
                                        <li key={`${player.id}-hint-${index}`}>
                                            {capitalize(hint.word)}
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </>
        );
    }

    if (phase.startsWith('vote-')) {
        return (
            <>
                <h2 className="text-5xl lg:text-6xl font-bold mt-4 text-center select-none">
                    Votes
                </h2>
                <h3 className="text-sm text-center mb-2 mt-4">
                    Tour {roundNumber}/{TOTAL_ROUNDS}
                </h3>

                <form
                    className="w-full flex flex-col items-center gap-4 mt-4"
                    onSubmit={handleAddVote}
                >
                    <button
                        className="w-full border focus:outline-none font-medium rounded-lg text-sm px-5 py-4 bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        disabled={hasVoted}
                    >
                        {!hasVoted ? 'Voter' : 'Vote enregistré'}
                    </button>
                    <p className="text-red-400 text-sm text-center">{error}</p>

                    <div className="w-full flex flex-col gap-4 lg:flex-row lg:flex-wrap">
                        {room.users.map((player) => (
                            <div
                                className={`${
                                    hasVoted || player.id === user?.id
                                        ? 'opacity-50 cursor-not-allowed'
                                        : ''
                                } lg:w-1/4 flex items-center px-4 border rounded border-zinc-700`}
                                key={player.id}
                            >
                                <input
                                    id={`player-${player.id}`}
                                    type="radio"
                                    value={player.username}
                                    onChange={() => {
                                        setCurrentVote(player);
                                    }}
                                    name="player"
                                    className="w-4 h-4 focus:ring-blue-600 ring-offset-zinc-800 focus:ring-2 bg-zinc-700 border-zinc-600"
                                    disabled={hasVoted || player.id === user?.id}
                                    required
                                />
                                <label
                                    htmlFor={`player-${player.id}`}
                                    className="w-full py-4 ml-2 text-lg font-medium text-zinc-300 flex justify-between items-center lg:flex-col"
                                >
                                    <span className="font-bold">
                                        {player.username}
                                    </span>
                                    {room.gameState.hints
                                        .filter((h) => h.user.id === player.id)
                                        .map((hint, index) => (
                                            <p
                                                className="text-sm"
                                                key={`${player.id}-hint-${index}`}
                                            >
                                                {capitalize(hint.word)}
                                            </p>
                                        ))}

                                    <div className="flex flex-wrap gap-1 ml-2 lg:my-4">
                                        {room.gameState.votes
                                            .filter(
                                                (item) =>
                                                    item.vote.id === player.id
                                            )
                                            .map((vote) => (
                                                <span
                                                    className="text-xs py-1 px-2 mr-2 rounded-3xl bg-zinc-700 text-red-400 border text-center"
                                                    key={`vote-${vote.user.id}`}
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
        );
    }

    if (phase.startsWith('scoreboard-') || phase === 'end') {
        const isEnd = phase === 'end';
        const maxScore = room.gameState.scores.reduce(
            (max, current) => (current.score > max ? current.score : max),
            0
        );

        return (
            <>
                <h2 className="text-5xl lg:text-6xl font-bold mt-4 text-center select-none">
                    {isEnd ? 'Partie terminée' : 'Scores'}
                </h2>
                {!isEnd ? (
                    <h3 className="text-sm text-center mb-2 mt-4">
                        Tour {roundNumber}/{TOTAL_ROUNDS}
                    </h3>
                ) : (
                    <></>
                )}

                {!isEnd && room.gameState.revealed ? (
                    <div className="flex w-full justify-between gap-4">
                        <div className="rounded-xl bg-zinc-800 p-8 w-full mt-4 text-zinc-400 text-lg">
                            <p>
                                Le mot était :{' '}
                                <span className="font-bold">
                                    {capitalize(room.gameState.revealed.word)}
                                </span>
                            </p>
                            <p>
                                Le mot de l'imposteur était :{' '}
                                <span className="font-bold">
                                    {capitalize(
                                        room.gameState.revealed.impostorWord
                                    )}
                                </span>
                            </p>
                            <p>
                                L'imposteur était :{' '}
                                <span className="font-bold">
                                    {
                                        room.gameState.revealed.impostor
                                            .username
                                    }
                                </span>
                            </p>
                        </div>
                        <div className="rounded-xl bg-zinc-800 p-8 w-1/6 mt-4 text-zinc-400 text-2xl flex items-center justify-center">
                            <p>{countdown}s</p>
                        </div>
                    </div>
                ) : (
                    <></>
                )}

                <div className="flex flex-col gap-4 mt-4 lg:flex-row lg:flex-wrap">
                    {room.gameState.scores
                        .filter((score) =>
                            room.users.some((u) => u.id === score.user.id)
                        )
                        .map((score) => (
                            <div
                                className={`${
                                    score.score === maxScore ? 'outline' : ''
                                } rounded-xl bg-zinc-800 p-8 w-full flex gap-4 justify-between px-4 lg:flex-col lg:w-1/4 lg:justify-start`}
                                key={score.user.id}
                            >
                                <h2 className="text-2xl font-bold mb-4 mt-4 text-center lg:mt-0">
                                    {score.user.username}
                                </h2>

                                <p className="text-xl">{score.score}</p>
                            </div>
                        ))}
                </div>

                {isEnd ? (
                    <Link
                        to="/"
                        className="block w-full lg:w-1/4 mt-8 text-center border focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-700 transition-all"
                    >
                        Retour à l'accueil
                    </Link>
                ) : (
                    <></>
                )}
            </>
        );
    }

    return <></>;
}

export default Room;
