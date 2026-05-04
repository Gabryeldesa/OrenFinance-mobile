import React, { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

import LoginScreen from '../screens/LoginScreen'
import DashboardScreen from '../screens/DashboardScreen'

export default function AppNavigator() {
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('token').then(token => {
      setLoggedIn(!!token)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />
  }

  return <DashboardScreen onLogout={() => setLoggedIn(false)} />
}