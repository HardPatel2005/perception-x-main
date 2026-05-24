import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

export const useSocket = () => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Connect to socket.io - same as original EJS: var socket = io();
    const socketInstance = io()
    
    socketInstance.on('connect', () => {
      console.log('✅ Connected to server')
      setIsConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('❌ Disconnected from server')
      setIsConnected(false)
    })

    setSocket(socketInstance)

    return () => {
      if (socketInstance) {
        socketInstance.close()
      }
    }
  }, [])

  return { socket, isConnected }
}
