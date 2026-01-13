import { defineStore } from 'pinia'
import { ref } from 'vue'
import laravelServer from '@/api/laravelServer'

export const useSrvQnairSchemasStore = defineStore('srvQnairSchemas', () => {
    const srvQnairSchemas = ref([]);

    const promiseFetchSrvQnairSchemas = async () => {
        return new Promise(resolve => {
            laravelServer.SCHEMA.GET.questionnaire().then(res => {
                    srvQnairSchemas.value = res
                    resolve(srvQnairSchemas.value)
                    
                    // console.log('QN Schema Result:', srvQnairSchemas.value)
                })
                .catch(err => {
                    srvQnairSchemas.value = [];
                    resolve(srvQnairSchemas.value)
                    
                    console.log('QN Schema Error: ', err)
                })
        })
    }

    return {
        srvQnairSchemas,
        promiseFetchSrvQnairSchemas,
    }
})
