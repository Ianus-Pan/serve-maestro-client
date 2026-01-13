import './assets/tailwind.css'
import 'floating-vue/dist/style.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import {LoadingPlugin} from 'vue-loading-overlay';
import 'vue-loading-overlay/dist/css/index.css';
// https://floating-vue.starpad.dev/guide/installation
import { vTooltip } from 'floating-vue'

/** Socket Support Start */
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Pusher.logToConsole = true;
window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    wssPort: import.meta.env.VITE_REVERB_PORT,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER, 
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: [ 'ws', 'wss' ],
    authEndpoint: `${import.meta.env.VITE_MAESTRO_LARAVEL}/broadcasting/auth`,
    auth: { withCredentials: true }
});
/** Socket Support End */

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(LoadingPlugin);
app.directive('tooltip', vTooltip)

app.mount('#app')