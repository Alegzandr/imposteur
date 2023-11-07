import { PiUserCircleDuotone } from 'react-icons/pi';

function Home() {
    return (
        <>
            <h1 className="text-4xl font-extrabold text-center">
                Imposteur Epitech
            </h1>

            <div className="flex flex-col lg:flex-row gap-4 mt-8">
                <div className="rounded-xl bg-zinc-800 p-8 w-full text-center flex items-center flex-col">
                    <h2 className="text-2xl font-bold mb-4 self-start">
                        Jouer
                    </h2>

                    <div className="text-9xl text-zinc-200">
                        <PiUserCircleDuotone />
                        <h3 className="text-xl font-semibold">Joueur</h3>
                    </div>

                    <div className="flex gap-2 flex-col mt-4">
                        <button className="border focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-700 transition-all">
                            Se connecter
                        </button>
                        <button className="border focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-700 transition-all">
                            Créer une partie
                        </button>
                    </div>
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
                    Aucune partie n'est disponible pour le moment.
                </p>
            </div>
        </>
    );
}

export default Home;
