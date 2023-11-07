import { Outlet } from 'react-router-dom';

function App() {
    return (
        <>
            <main className="w-screen min-h-screen bg-zinc-900 text-white p-2">
                <div className="container mx-auto pt-8">
                    <Outlet />
                </div>
            </main>
        </>
    );
}

export default App;
