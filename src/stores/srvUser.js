// stores/user.js
import laravelServer from '@/api/laravelServer'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useSrvUserStore = defineStore('srvUser', () => {
  /**
   * { [uID]: userObject, ... }
   */
  const loading = ref(false)
  const srvUsers = ref([])
  const srvGroups = ref([])
  const selectedUser = ref(null)

  const promiseFetchUser = () => {
    loading.value = true
    return new Promise( resolve => {
      laravelServer.USER.GET.single()
        .then(res => {
          selectedUser.value = res._id
          resolve(!!selectedUser.value)

          if( !srvUsers.value.length )
            srvUsers.value = [ res ]
        })
        .catch( err => {
          console.log('Fetch User: ', err)
          selectedUser.value = null
          resolve(false)
        })
        .finally(() => loading.value = false)
    })
  }

  const promiseFetchAllUsers = () => {
    loading.value = true
    return new Promise( resolve => {
      laravelServer.USER.GET.all().then(res => {
        srvUsers.value = res
        resolve(srvUsers.value)
      })
      .catch( err => {
        console.log('Fetch All Users: ', err)
        srvUsers.value = []
        resolve(srvUsers.value)
      })
      .finally(() => loading.value = false)
    })
  }

  const getUser = (uID = null) => {
    if( !srvUsers.value.length ) return null
    if( !uID && !selectedUser.value ) return null
    
    return srvUsers.value.find(usr => usr._id === (uID ?? selectedUser.value)) ?? null
  }

  const setUser = (user) => {
    let foundUser = getUser(user._id)
    if( !foundUser ) srvUsers.value.push(user)
    else {
      srvUsers.value = srvUsers.value.map(usr => {
        if(usr._id === user._id) return user
        else return usr
      })
    }
  }

  const promiseFetchGroups = () => {
    loading.value = true
    return new Promise( resolve => {
      laravelServer.USER_GROUP.GET.single('all').then(res => {
        srvGroups.value = res
        resolve(srvGroups.value)
      })
      .catch( err => {
        console.log('Fetch User: ', err)
        srvGroups.value = []
        resolve(srvGroups.value)
      })
      .finally(() => loading.value = false)
    })
  }

  const getGroup = (gID = null) => {
    if( !srvGroups.value.length ) return null
    if( !gID && !selectedUser.value ) return null

    let userGrps = srvGroups.value.filter(grp => {
      return grp.owner === selectedUser.value ||
        grp.admins.includes(selectedUser.value) ||
        grp.members.includes(selectedUser.value)
    })
    
    return srvGroups.value.filter(grp => {
      if( gID ) return grp._id === gID
      return userGrps.map(grp => grp._id).includes(grp._id)
    }) ?? []
  }

  watch(() => selectedUser.value, () => {
    promiseFetchGroups()
  })

  return {
    loading,
    selectedUser,
    srvUsers,
    getUser,
    setUser,
    
    srvGroups,
    getGroup,

    promiseFetchUser,
    promiseFetchAllUsers,
    promiseFetchGroups
  }
})