import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
        watch: {
            // File watching on Docker bind mounts requires polling
            usePolling: process.env.DOCKER === 'true',
        },
    },
});
