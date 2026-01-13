import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useClientSettings = defineStore('clientSettings', () => {
    const data = ref({});

    watch(() => data.value, () => {
        localStorage.setItem('serve_settings', JSON.stringify(data.value))
    }, {deep: true})

    function getSettings() {
        let str = localStorage.getItem('serve_settings');
        if( !str ) data.value = {}
        else {
            try {
                data.value = JSON.parse(str)
            } catch( err ) {
                console.log('Settings err', err)
            }
        }
    }

    function wipeSettings() {
        data.value = {}
    }

    return {
        data,
        getSettings,
        wipeSettings,
    }
})
