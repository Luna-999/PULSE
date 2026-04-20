import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  // Vite clears the terminal screen by default, which Tauri doesn't like
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
})
