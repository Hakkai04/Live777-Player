import path from 'node:path'
import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import React from '@vitejs/plugin-react'

const PlayerRoot = path.resolve(import.meta.dirname)
const SrcRoot = path.resolve(PlayerRoot, 'src')

export default defineConfig({
  root: PlayerRoot,
  publicDir: path.resolve(PlayerRoot, 'public'),
  server: {
    port: 3000,
    proxy: {
      '^/whip/.*': 'http://localhost:7777',
      '^/whep/.*': 'http://localhost:7777',
      '^/bridge/.*': 'http://localhost:4001'
    }
  },
  build: {
    outDir: path.resolve(PlayerRoot, 'dist'),
    emptyOutDir: true
  },
  plugins: [
    UnoCSS(path.resolve(PlayerRoot, 'uno.config.ts')),
    React()
  ],
  resolve: {
    alias: {
      '@': SrcRoot
    }
  }
})
