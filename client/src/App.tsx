import { Outlet } from 'react-router-dom';
import { BsIncognito } from 'react-icons/bs';

function App() {
    return (
        <div className="bg-zinc-900 text-white p-2 min-h-screen w-screen">
            <header className="w-full pt-8">
                <h1 className="text-4xl font-extrabold text-center opacity-75">
                    Imposteur V2
                    <BsIncognito className="inline-block ml-2" />
                </h1>
            </header>

            <main className="w-full">
                <div className="container mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default App;
