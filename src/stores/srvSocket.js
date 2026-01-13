import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSrvSocketStore = defineStore('srvSocket', () => {
    const connectedPublicChannels = ref([])
    const connectedPrivateChannels = ref([])

    const connectPublic = (connection) => {
        if (!window.Echo) return console.log('No Socket Connection')

        connectedPublicChannels.value.push(connection.channel)
        let ch = window.Echo.channel(connection.channel)

        let lsnList = connection.listeners.filter(lsn => lsn.type === 'listen')

        for( let lsn of lsnList ) {
            // console.log(`Joining Public Channel [${connection.channel}.${lsn.type}${lsn.event}]`);
            ch.listen(lsn.event, data => lsn.callback(data))
        }
    }

    const connectPrivate = (user, connection) => {
        if( !user ) return console.log('User Required for Private Connections')
        if (!window.Echo) return console.log('No Socket Connection')

        connectedPrivateChannels.value.push(connection.channel)
        let ch = window.Echo.private(connection.channel)

        let lsnList = connection.listeners.filter(lsn => lsn.type === 'listen_for_whisper')
        for( let lsn of lsnList ) {
            // console.log(`Joining Private Channel [${connection.channel}.${lsn.type}${lsn.event}]`);
            ch.listenForWhisper(lsn.event, data => lsn.callback(data))
        }
    }

    const leavePublic = (channel = null) => {
        
        /** Leave Specific Public Channel(s) */
        if( channel ) {
            /** Leave Multiple Public Channels where Channel starts with "channelname." */
            if( channel.includes('.*') ) {
                let chMatch = channel.split('*')[0]
                let toLeave = connectedPublicChannels.value.filter(ch => ch.includes(chMatch))
                
                toLeave.forEach(channel => {
                    // console.log(`Left [${channel}]`);
                    window.Echo.leave(channel)
                })

                connectedPublicChannels.value = connectedPublicChannels.value.filter(ch => !ch.includes(chMatch))
            }
            
            /** Leave Specific Public Channel */
            else {
                // console.log(`Left [${channel}]`);
                window.Echo.leave(channel)
            }
        }

        /** Leave All Public Channels */
        else {
            connectedPublicChannels.value.forEach(channel => {
                // console.log(`Left [${channel}]`);
                window.Echo.leave(channel)
            })
            connectedPublicChannels.value.length = 0
        }
    }

    const leavePrivate = (channel) => {
        /** Leave Specific Private Channel(s) */
        if( channel ) {
            /** Leave Multiple Private Channels where Channel starts with "channelname." */
            if( channel.includes('.*') ) {
                let chMatch = channel.split('*')[0]
                let toLeave = connectedPrivateChannels.value.filter(ch => ch.includes(chMatch))
                
                toLeave.value.forEach(channel => {
                    // console.log(`Left [${channel}]`);
                    window.Echo.leave(channel)
                })

                connectedPrivateChannels.value = connectedPrivateChannels.value.filter(ch => !ch.includes(chMatch))
            }
            
            /** Leave Specific Private Channel */
            else {
                // console.log(`Left [${channel}]`);
                window.Echo.leave(channel)
            }
        }
        
        /** Leave All Private Channels */
        else {
            connectedPrivateChannels.value.forEach(channel => {
                // console.log(`Left [${channel}]`);
                window.Echo.leave(channel)
            })
        }
    }

    return {
        connectPublic,
        connectPrivate,
        leavePublic,
        leavePrivate,
    }
})
