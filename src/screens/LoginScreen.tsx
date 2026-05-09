import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, useColorScheme, ScrollView
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import OrenLogo from '../components/OrenLogo'

export default function LoginScreen({ onLogin, onRegister, onForgot }: {
  onLogin: () => void
  onRegister: () => void
  onForgot: () => void
}) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  const c = {
    bg:     dark ? '#0f172a' : '#f8fafc',
    card:   dark ? '#1e293b' : '#ffffff',
    border: dark ? '#334155' : '#e2e8f0',
    input:  dark ? '#0f172a' : '#f1f5f9',
    text:   dark ? '#f1f5f9' : '#1e293b',
    sub:    dark ? '#94a3b8' : '#64748b',
    placeholder: dark ? '#475569' : '#94a3b8',
  }

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const token        = data.session?.access_token
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <View style={[styles.logoCircle, { backgroundColor: dark ? '#1e3a8a' : '#1e40af' }]}>
            <OrenLogo size={44} color="#ffffff" />
          </View>
          <Text style={[styles.appName, { color: c.text }]}>Oren Finance</Text>
          <Text style={[styles.subtitle, { color: c.sub }]}>Entre na sua conta</Text>
        </View>

        <View style={[styles.form, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.label, { color: c.sub }]}>E-mail</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
            placeholder="seu@email.com"
            placeholderTextColor={c.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />

          <Text style={[styles.label, { color: c.sub }]}>Senha</Text>
          <View style={[styles.inputWrap, { backgroundColor: c.input, borderColor: c.border }]}>
            <TextInput
              style={[styles.inputInner, { color: c.text }]}
              placeholder="••••••••"
              placeholderTextColor={c.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={20} color={c.sub} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onForgot} style={styles.forgotWrap}>
            <Text style={styles.forgotText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

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

        <View style={styles.registerWrap}>
          <Text style={[styles.registerText, { color: c.sub }]}>Não tem conta? </Text>
          <TouchableOpacity onPress={onRegister}>
            <Text style={styles.registerLink}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  inner:        { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  logoWrap:     { alignItems: 'center', marginBottom: 40 },
  logoCircle:   {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  appName:      { fontSize: 26, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  subtitle:     { fontSize: 14 },
  form:         { borderRadius: 20, padding: 24, borderWidth: 1 },
  label:        { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input:        { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  inputWrap:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, marginBottom: 8 },
  inputInner:   { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  eyeBtn:       { paddingHorizontal: 14 },
  forgotWrap:   { alignItems: 'flex-end', marginBottom: 20, marginTop: 4 },
  forgotText:   { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
  button:       {
    backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText:   { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  registerWrap: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  registerText: { fontSize: 14 },
  registerLink: { fontSize: 14, color: '#3b82f6', fontWeight: '600' },
})