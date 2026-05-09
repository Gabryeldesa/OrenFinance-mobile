import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, useColorScheme, ScrollView
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import OrenLogo from '../components/OrenLogo'

const validatePassword = (pwd: string) => {
  if (pwd.length < 8) return 'A senha deve ter pelo menos 8 caracteres.'
  if (!/[a-zA-Z]/.test(pwd)) return 'A senha deve conter pelo menos uma letra.'
  if (!/[0-9]/.test(pwd)) return 'A senha deve conter pelo menos um número.'
  return null
}

function PasswordStrength({ password, dark }: { password: string; dark: boolean }) {
  if (!password) return null
  const hasLength = password.length >= 8
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const sub = dark ? '#64748b' : '#94a3b8'

  return (
    <View style={{ marginBottom: 12, gap: 4 }}>
      {[
        { ok: hasLength, label: 'Mínimo 8 caracteres' },
        { ok: hasLetter, label: 'Pelo menos uma letra' },
        { ok: hasNumber, label: 'Pelo menos um número' },
      ].map(({ ok, label }) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={ok ? '#22c55e' : sub} />
          <Text style={{ fontSize: 12, color: ok ? '#22c55e' : sub }}>{label}</Text>
        </View>
      ))}
    </View>
  )
}

export default function RegisterScreen({ onBack, onLogin }: {
  onBack: () => void
  onLogin: () => void
}) {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

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

  const handleRegister = async () => {
    if (!name || !email || !password || !confirm) {
      Alert.alert('Atenção', 'Preencha todos os campos.')
      return
    }
    const pwdError = validatePassword(password)
    if (pwdError) { Alert.alert('Senha inválida', pwdError); return }
    if (password !== confirm) { Alert.alert('Atenção', 'As senhas não coincidem.'); return }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: 'https://oren-finance-frontend.vercel.app/login'
        }
      })
      if (error) throw error
      setDone(true)
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível criar a conta.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center', padding: 28 }]}>
        <View style={[styles.doneCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.doneIcon, { backgroundColor: dark ? '#14532d' : '#dcfce7' }]}>
            <Ionicons name="mail-outline" size={36} color="#22c55e" />
          </View>
          <Text style={[styles.doneTitle, { color: c.text }]}>Confirme seu e-mail</Text>
          <Text style={[styles.doneSub, { color: c.sub }]}>
            Enviamos um link de confirmação para:
          </Text>
          <Text style={styles.doneEmail}>{email}</Text>
          <Text style={[styles.doneTip, { color: c.sub }]}>
            Clique no link do e-mail para ativar sua conta. Verifique também a caixa de spam.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Ir para o login</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.logoWrap}>
          <View style={[styles.logoCircle, { backgroundColor: dark ? '#1e3a8a' : '#1e40af' }]}>
            <OrenLogo size={44} color="#ffffff" />
          </View>
          <Text style={[styles.appName, { color: c.text }]}>Criar conta</Text>
          <Text style={[styles.subtitle, { color: c.sub }]}>Comece a controlar suas finanças</Text>
        </View>

        <View style={[styles.form, { backgroundColor: c.card, borderColor: c.border }]}>

          <Text style={[styles.label, { color: c.sub }]}>Nome completo</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
            placeholder="Seu nome"
            placeholderTextColor={c.placeholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
          />

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
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={c.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              returnKeyType="next"
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={20} color={c.sub} />
            </TouchableOpacity>
          </View>
          <PasswordStrength password={password} dark={dark} />

          <Text style={[styles.label, { color: c.sub }]}>Confirmar senha</Text>
          <View style={[styles.inputWrap, { backgroundColor: c.input, borderColor: c.border }]}>
            <TextInput
              style={[styles.inputInner, { color: c.text }]}
              placeholder="Repita a senha"
              placeholderTextColor={c.placeholder}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showConf}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
            <TouchableOpacity onPress={() => setShowConf(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showConf ? 'eye-outline' : 'eye-off-outline'} size={20} color={c.sub} />
            </TouchableOpacity>
          </View>
          {confirm.length > 0 && password !== confirm && (
            <Text style={styles.errorText}>As senhas não coincidem.</Text>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Criar conta</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.loginWrap}>
          <Text style={[styles.loginText, { color: c.sub }]}>Já tem conta? </Text>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.loginLink}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  inner:        { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 20 },
  header:       { marginBottom: 8 },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  logoWrap:     { alignItems: 'center', marginBottom: 32 },
  logoCircle:   {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  appName:      { fontSize: 24, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  subtitle:     { fontSize: 14 },
  form:         { borderRadius: 20, padding: 24, borderWidth: 1 },
  label:        { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input:        { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  inputWrap:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, marginBottom: 8 },
  inputInner:   { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  eyeBtn:       { paddingHorizontal: 14 },
  errorText:    { color: '#ef4444', fontSize: 12, marginBottom: 12 },
  button:       {
    backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 8, shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText:   { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  loginWrap:    { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText:    { fontSize: 14 },
  loginLink:    { fontSize: 14, color: '#3b82f6', fontWeight: '600' },
  doneCard:     { borderRadius: 20, padding: 28, borderWidth: 1, alignItems: 'center', width: '100%' },
  doneIcon:     { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  doneTitle:    { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  doneSub:      { fontSize: 14, textAlign: 'center', marginBottom: 4 },
  doneEmail:    { fontSize: 14, color: '#3b82f6', fontWeight: '600', marginBottom: 12 },
  doneTip:      { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 24 },
})