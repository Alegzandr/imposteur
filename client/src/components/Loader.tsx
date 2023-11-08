import { AiOutlineLoading } from 'react-icons/ai';

function Loader() {
    return (
        <div className="h-full flex flex-col items-center justify-center gap-4">
            <AiOutlineLoading className="text-9xl animate-spin text-zinc-200" />
            <h3 className="text-xl font-semibold">Connexion en cours...</h3>
        </div>
    );
}

export default Loader;
