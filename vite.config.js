import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Social-Media-App/', // Yeh hona zaroori hai GitHub Pages ke liye
})