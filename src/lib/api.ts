import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API_URL = 'https://orenfinance-backend.onrender.com'

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
})

// Adiciona o token em todas as requisições automaticamente
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api