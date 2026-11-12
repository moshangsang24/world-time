import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@data': path.resolve(__dirname, './src/data'),
    }
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'luxon': ['luxon'],
          'react-vendor': ['react', 'react-dom'],
          'three-vendor': ['@react-three/fiber', '@react-three/drei'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['three', 'luxon', '@react-three/fiber', '@react-three/drei', 'suncalc']
  },
  server: {
    port: 3000,
    open: true
  }
})