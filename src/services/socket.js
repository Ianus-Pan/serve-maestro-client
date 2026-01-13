import { io } from 'socket.io-client'

const socket = io(import.meta.env.VITE_MAESTRO_SOCKET_SERVER, { withCredentials: true })

export default socket
