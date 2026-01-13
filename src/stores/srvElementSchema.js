import { defineStore } from 'pinia'
import { ref } from 'vue'
import laravelServer from '@/api/laravelServer'

export const useSrvElementSchemasStore = defineStore('srvElementSchemas', () => {
  const srvElementSchemas = ref([]);

  const promiseFetchSrvElementSchemas = async () => {
    return new Promise( resolve => {
      laravelServer.SCHEMA.GET.element().then( res => {
        srvElementSchemas.value = res
        resolve(srvElementSchemas.value)
                    
        // console.log('EL Schema Result: ', srvElementSchemas.value)
      })
      .catch( err => {
        srvElementSchemas.value = [];
        resolve(srvElementSchemas.value)
        
        console.log('EL Schema Error: ', err)
      })
    })
  }

  return {
    srvElementSchemas,
    promiseFetchSrvElementSchemas,
  }
})
