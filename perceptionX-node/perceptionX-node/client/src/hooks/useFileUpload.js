import { useState, useEffect, useRef } from 'react'
import api from '../utils/axiosConfig'

export const useFileUpload = (socket) => {
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('Initializing...')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [fileId, setFileId] = useState(null)
  const pollIntervalRef = useRef(null)
  const progressRef = useRef(0)
  const fileIdRef = useRef(null)

  // Listen to socket progress updates
  useEffect(() => {
    if (!socket) return

    const handleProgress = (progressData) => {
      const progressValue = typeof progressData === 'number' 
        ? progressData 
        : progressData.progress || progressData
      
      const message = typeof progressData === 'object' && progressData.message 
        ? progressData.message 
        : progressValue >= 100 ? "Complete!" : 
          progressValue >= 95 ? "Saving..." :
          progressValue >= 85 ? "Converting to MP4..." :
          progressValue >= 50 ? "Processing frames..." :
          progressValue >= 35 ? "Analyzing video..." :
          progressValue >= 30 ? "Starting processing..." :
          progressValue >= 20 ? "Uploading..." :
          "Preparing..."
      
      console.log("📊 Progress update:", progressValue + "%", message)
      progressRef.current = progressValue
      setProgress(progressValue)
      setStatusMessage(message)

      // Stop repeated polling once the backend reports completion.
      // Do one last metadata fetch shortly after 100% so the UI can pick up the final URLs.
      if (progressValue >= 100 && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
        setTimeout(async () => {
          try {
            if (!fileIdRef.current) return
            const metaResponse = await api.get(`/file/${fileIdRef.current}/metadata`)
            if (metaResponse.data.isProcessed) {
              setProgress(100)
              setStatusMessage("Processing complete!")
              setIsUploading(false)
            }
          } catch (err) {
            console.error('Final metadata check failed:', err)
          }
        }, 2000)
      }
    }

    socket.on('progress', handleProgress)

    return () => {
      socket.off('progress', handleProgress)
    }
  }, [socket])

  // Poll for processed file
  const pollForProcessedFile = (fileId) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    let attempts = 0
    const maxAttempts = 300
    let lastProgress = 30

    pollIntervalRef.current = setInterval(async () => {
      attempts++

      if (attempts < maxAttempts) {
        const progress = Math.min(30 + (attempts / maxAttempts * 60), 90)
        if (progress > lastProgress + 5) {
          lastProgress = progress
          setProgress(Math.floor(progress))
          setStatusMessage("Processing frames...")
        }
      }

      if (attempts > maxAttempts) {
        clearInterval(pollIntervalRef.current)
        setProgress(90)
        setStatusMessage("Taking longer than expected...")
        return
      }

      try {
        if (progressRef.current >= 100) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
          return
        }

        const metaResponse = await api.get(`/file/${fileId}/metadata`)
        if (metaResponse.data.isProcessed) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
          setProgress(100)
          setStatusMessage("Processing complete!")
          setIsUploading(false)
        }
      } catch (err) {
        console.error('Error polling for processed file:', err)
      }
    }, 2000)
  }

  const uploadFile = async (file, serviceType = null) => {
    if (!file) {
      setError('Please select a file.')
      return null
    }

    if (!serviceType) {
      setError('Please select a service type.')
      return null
    }

    if (isUploading) {
      console.warn('Upload already in progress, returning null')
      return null
    }

    setIsUploading(true)
    setProgress(5)
    setStatusMessage('Uploading file...')
    setError(null)
    setFileId(null)

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    progressRef.current = 0
    fileIdRef.current = null

    const formData = new FormData()
    formData.append('file', file)
    formData.append('serviceType', serviceType)

    try {
      const response = await api.post('/process', formData)

      const data = response.data

      if (response.status === 200 || data.fileId || data.cloudinaryId) {
        const returnedFileId = data.fileId || data.cloudinaryId
        setFileId(returnedFileId)
        fileIdRef.current = returnedFileId
        setProgress(10)
        setStatusMessage('File uploaded, starting processing...')

        if (data.warning) {
          console.log('Warning:', data.warning)
        }

        pollForProcessedFile(returnedFileId)

        return returnedFileId
      } else {
        throw new Error(data.error || data.details || 'Failed to process the file.')
      }
    } catch (err) {
      setIsUploading(false)
      setProgress(0)
      
      let errorMsg = 'Error processing file'
      
      if (err.response) {
        if (err.response.status === 401) {
          errorMsg = 'Authentication required. Please log in.'
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        } else {
          errorMsg = err.response.data?.error || 
                     err.response.data?.details || 
                     err.response.data?.message ||
                     `Server error: ${err.response.status}`
        }
      } else if (err.request) {
        errorMsg = 'No response from server. Please check if the backend is running.'
      } else {
        errorMsg = err.message || 'Error processing file'
      }
      
      setError(errorMsg)
      console.error('Upload error:', err)
      return null
    }
  }

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  return {
    uploadFile,
    progress,
    statusMessage,
    isUploading,
    error,
    fileId,
  }
}