import { FormEvent, useState } from 'react';
import { PiUserCircleDuotone } from 'react-icons/pi';
import { useAuth } from '../contexts/Auth';
import Loader from '../components/Loader';

function Home() {
    const { isAuth, isLoading, user, signIn } = useAuth();
    const [username, setUsername] = useState<string>('');

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (username.length < 3 || username.length > 16) {
            return;
        }

        signIn(username);
    };

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
                            onSubmit={handleSubmit}
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

                            <div className="flex gap-2 flex-col mt-4">
                                <button className="border focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-700 transition-all">
                                    Créer une partie
                                </button>
                            </div>
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

                <p className="text-zinc-400 mb-2">
                    Connectez-vous avant de pouvoir rejoindre une partie.
                </p>
            </div>
        </>
    );
}

export default Home;
