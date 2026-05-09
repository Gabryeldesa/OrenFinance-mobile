import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  useColorScheme, ScrollView
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import OrenLogo from '../components/OrenLogo'

export default function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

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

  const handleSubmit = async () => {
    if (!email) { setError('Informe seu e-mail.'); return }
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://oren-finance-frontend.vercel.app/reset-password',
      })
      if (error) {
        if (error.message?.includes('rate limit') || error.status === 429) {
          setError('Aguarde alguns minutos antes de solicitar outro link.')
        } else {
          setError('Erro ao enviar o e-mail. Verifique o endereço e tente novamente.')
        }
        return
      }
      setSent(true)
    } catch {
      setError('Erro inesperado. Tente novamente.')
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

        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.logoWrap}>
          <View style={[styles.logoCircle, { backgroundColor: dark ? '#1e3a8a' : '#1e40af' }]}>
            <OrenLogo size={44} color="#ffffff" />
          </View>
          <Text style={[styles.appName, { color: c.text }]}>Recuperar senha</Text>
          <Text style={[styles.subtitle, { color: c.sub }]}>Enviaremos um link para o seu e-mail</Text>
        </View>

        <View style={[styles.form, { backgroundColor: c.card, borderColor: c.border }]}>
          {sent ? (
            <View style={styles.sentWrap}>
              <View style={[styles.sentIcon, { backgroundColor: dark ? '#14532d' : '#dcfce7' }]}>
                <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
              </View>
              <Text style={[styles.sentTitle, { color: c.text }]}>E-mail enviado!</Text>
              <Text style={[styles.sentSub, { color: c.sub }]}>
                Verifique sua caixa de entrada e clique no link para redefinir sua senha. Pode levar alguns minutos.
              </Text>
              <TouchableOpacity onPress={onBack} style={styles.button}>
                <Text style={styles.buttonText}>Voltar para o login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {error.length > 0 && (
                <View style={[styles.errorBox, { backgroundColor: dark ? '#450a0a' : '#fef2f2', borderColor: dark ? '#991b1b' : '#fecaca' }]}>
                  <Text style={{ color: dark ? '#fca5a5' : '#dc2626', fontSize: 13 }}>{error}</Text>
                </View>
              )}

              <Text style={[styles.label, { color: c.sub }]}>E-mail</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
                placeholder="seu@email.com"
                placeholderTextColor={c.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>Enviar link de recuperação</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={onBack} style={styles.backLink}>
                <Text style={[styles.backLinkText, { color: c.sub }]}>Lembrou a senha? </Text>
                <Text style={styles.backLinkBlue}>Voltar para o login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  inner:      { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 20 },
  header:     { marginBottom: 8 },
  backBtn:    { width: 40, height: 40, justifyContent: 'center' },
  logoWrap:   { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  appName:    { fontSize: 24, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  subtitle:   { fontSize: 14 },
  form:       { borderRadius: 20, padding: 24, borderWidth: 1 },
  label:      { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input:      { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  button:     {
    backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  errorBox:   { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  backLink:   { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  backLinkText: { fontSize: 14 },
  backLinkBlue: { fontSize: 14, color: '#3b82f6', fontWeight: '600' },
  sentWrap:   { alignItems: 'center' },
  sentIcon:   { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  sentTitle:  { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  sentSub:    { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
})