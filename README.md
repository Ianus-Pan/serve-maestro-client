# SERVE

## About SERVE
SERVE's innovative functionality enables users to assess the risk, impact, and attractiveness of any public space, providing comprehensive insights for improved safety and management.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Setup .env.dev and attach to maestro-backend

```sh
VITE_MAESTRO_LARAVEL=http://localhost:8000
VITE_LINK_DASHBOARD=http://localhost:8000
VITE_LINK_CHAT=http://localhost:5173
```

> Note the ports for ```VITE_LINK_CHAT```, & any other external Vite plugins we intend to be able to direct the user to, are included in their respective ```vite.config.js``` files.
```
export default defineConfig({
    server: {
        host: '127.0.0.1',
        port: 5174
    },
})
```

### Compile Tailwind for Development

```sh
npx tailwindcss -i ./src/assets/tailwind.css -o ./public/assets/tailwind.css --watch
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```