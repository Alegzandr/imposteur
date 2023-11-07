import { Outlet } from 'react-router-dom';

function App() {
    return (
        <>
            <header></header>

            <main>
                <Outlet />
            </main>
        </>
    );
}

export default App;
