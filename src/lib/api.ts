import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API_URL = 'https://orenfinance-backend.onrender.com'

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  const [token, impersonateId] = await AsyncStorage.multiGet(['token', 'impersonate_id'])

  if (token[1]) {
    config.headers.Authorization = `Bearer ${token[1]}`
  }
  if (impersonateId[1]) {
    config.headers['x-impersonate-id'] = impersonateId[1]
  }

  return config
})

export default api