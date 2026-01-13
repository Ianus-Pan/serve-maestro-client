import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useSrvCaseStore } from './srvCase.js';
// @ts-ignore
import laravelServer from '@/api/laravelServer'

export const useSrvInsertCategoryStore = defineStore('srvInsertCategory', () => {
  const srvInsertCategories = ref([]);
  const srvCaseID = ref(null)

  const srvCaseStore = useSrvCaseStore()

  const promiseFetchSrvInsertCategories = async () => {
    return new Promise( resolve => {
      laravelServer.MAP_INSERT.GET.category().then( res => {
        srvInsertCategories.value = res
        resolve(srvInsertCategories.value)
        
        // console.log('Insert Category Result: ', srvInsertCategories.value)
      })
      .catch( err => {
        srvInsertCategories.value = [];
        resolve(srvInsertCategories.value)
                    
        console.log('Insert Category Error: ', err)
      })
    })
  }

  function setSrvCaseID(cID) {
    srvCaseID.value = cID
  }

  watch(() => [srvCaseID.value, srvInsertCategories.value], () => {
    if( !srvInsertCategories.value.length || !srvCaseID.value ) return

    srvInsertCategories.value.forEach((cat, i) => {
      cat.elements.forEach((el, j) => {
        srvInsertCategories.value[i].elements[j].case_id = srvCaseID.value
      })
    });
  })

  return {
    srvInsertCategories,
    promiseFetchSrvInsertCategories,
    setSrvCaseID,
  }
})
