import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    test: {
        environment: 'jsdom',
        include: ['src/components/__tests__/*.spec.js'],
        globals: true
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
})
