/* global process */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// BASE_PATH : sous-dossier de publication (ex. /onesheetTrimestre/ sur GitHub Pages). Par défaut, la racine du site.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
})
