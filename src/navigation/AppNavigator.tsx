import React, { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import LoginScreen from '../screens/LoginScreen'
import DashboardScreen from '../screens/DashboardScreen'
import TransactionsScreen from '../screens/TransactionsScreen'

const Stack = createNativeStackNavigator()

function DashboardWrapper({ onLogout, navigation }: any) {
  return <DashboardScreen onLogout={onLogout} navigation={navigation} />
}

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

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard">
          {(props) => <DashboardWrapper {...props} onLogout={() => setLoggedIn(false)} />}
        </Stack.Screen>
        <Stack.Screen name="Transactions" component={TransactionsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}