import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, useColorScheme
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import OrenLogo from '../components/OrenLogo'

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const token = data.session?.access_token
      const refreshToken = data.session?.refresh_token

      if (token && refreshToken) {
        await AsyncStorage.setItem('token', token)
        await AsyncStorage.setItem('refresh_token', refreshToken)
        onLogin()
      } else {
        Alert.alert('Erro', 'Sessão inválida. Tente novamente.')
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível fazer login.')
    } finally {
      setLoading(false)
    }
  }

  const themeStyles = {
    container: { backgroundColor: dark ? '#0f172a' : '#f8fafc' },
    form: {
      backgroundColor: dark ? '#1e293b' : '#ffffff',
      borderColor: dark ? '#334155' : '#e2e8f0'
    },
    input: {
      backgroundColor: dark ? '#0f172a' : '#f1f5f9',
      borderColor: dark ? '#334155' : '#e2e8f0',
      color: dark ? '#f1f5f9' : '#1e293b'
    },
    text: { color: dark ? '#f1f5f9' : '#1e293b' },
    subtitle: { color: dark ? '#94a3b8' : '#64748b' }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, themeStyles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <View style={[styles.logoCircle, { backgroundColor: dark ? '#1e3a8a' : '#1e40af' }]}>
            <OrenLogo size={44} color="#ffffff" />
          </View>
          <Text style={[styles.appName, themeStyles.text]}>Oren Finance</Text>
          <Text style={[styles.subtitle, themeStyles.subtitle]}>Entre na sua conta</Text>
        </View>

        <View style={[styles.form, themeStyles.form]}>
          <Text style={[styles.label, { color: dark ? '#94a3b8' : '#64748b' }]}>E-mail</Text>
          <TextInput
            style={[styles.input, themeStyles.input]}
            placeholder="seu@email.com"
            placeholderTextColor={dark ? '#475569' : '#94a3b8'}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: dark ? '#94a3b8' : '#64748b' }]}>Senha</Text>
          <TextInput
            style={[styles.input, themeStyles.input]}
            placeholder="••••••••"
            placeholderTextColor={dark ? '#475569' : '#94a3b8'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Entrar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  appName: { fontSize: 26, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  subtitle: { fontSize: 14 },
  form: { borderRadius: 20, padding: 24, borderWidth: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, marginBottom: 16
  },
  button: {
    backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 4, shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
})