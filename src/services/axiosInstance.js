import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_MAESTRO_LARAVEL + '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
})

axiosInstance.defaults.withCredentials = true
axiosInstance.defaults.withXSRFToken = true

axiosInstance.interceptors.response.use(
  (response) => {
    if (response.status === 200 || response.status === 201) {
      return Promise.resolve(response)
    } else {
      return Promise.reject(response)
    }
  },
  (error) => {
    if (error.response.status) {
      switch (error.response.status) {
        case 401:
          console.error('Axios Error:', error)
          // window.location.href = import.meta.env.VITE_MAESTRO_LOGIN
          break
        case 404:
        default:
          throw error
      }
      return Promise.reject(error.response)
    }
  }
)

export default axiosInstance
