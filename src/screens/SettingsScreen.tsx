import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import api from '../lib/api'
import OrenLogo from '../components/OrenLogo'

const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: '', color: '#e5e7eb' }
  let score = 0
  if (password.length >= 8) score++
  if (/[a-zA-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  if (score <= 1) return { score: 1, label: 'Fraca', color: '#ef4444' }
  if (score === 2) return { score: 2, label: 'Razoável', color: '#f59e0b' }
  if (score === 3) return { score: 3, label: 'Boa', color: '#3b82f6' }
  return { score: 4, label: 'Forte', color: '#10b981' }
}

const validatePassword = (password: string): string | null => {
  if (password.length < 8) return 'A senha deve ter pelo menos 8 caracteres'
  if (!/[a-zA-Z]/.test(password)) return 'A senha deve conter letras'
  if (!/[0-9]/.test(password)) return 'A senha deve conter números'
  return null
}

export default function SettingsScreen({ navigation }: { navigation: any }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  const [profile, setProfile] = useState<{ id: string; email: string; name: string } | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [section, setSection] = useState<'none' | 'profile' | 'password' | 'about'>('none')

  const [editName, setEditName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const colors = {
    bg: dark ? '#111827' : '#f3f4f6',
    card: dark ? '#1f2937' : '#ffffff',
    text: dark ? '#f9fafb' : '#111827',
    sub: dark ? '#9ca3af' : '#6b7280',
    border: dark ? '#374151' : '#e5e7eb',
    input: dark ? '#374151' : '#f9fafb',
    inputText: dark ? '#f9fafb' : '#111827',
  }

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingProfile(false); return }

      const email = user.email ?? ''
      let name = ''

      try {
        const res = await api.get('/api/users/profile')
        name = res.data?.data?.name || res.data?.name || ''
      } catch {
        // API falhou, tenta metadados
      }

      if (!name) {
        name = user.user_metadata?.name || user.user_metadata?.full_name || ''
      }

      if (!name) {
        name = email.split('@')[0] || 'Oren Finance'
      }

      setProfile({ id: user.id, email, name })
      setEditName(name)
    } catch {
      setProfile({ id: '', email: '', name: 'Oren Finance' })
      setEditName('Oren Finance')
    } finally {
      setLoadingProfile(false)
    }
  }

  const toggleSection = (s: 'profile' | 'password' | 'about') => {
    setSection(prev => prev === s ? 'none' : s)
  }

  const handleSaveProfile = async () => {
    if (!editName.trim()) { Alert.alert('Erro', 'O nome não pode ficar em branco.'); return }
    setSavingProfile(true)
    try {
      await api.put('/api/users/profile', { name: editName.trim() })
      setProfile(prev => prev ? { ...prev, name: editName.trim() } : prev)
      Alert.alert('Sucesso', 'Nome atualizado com sucesso!')
      setSection('none')
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o nome.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    const error = validatePassword(newPassword)
    if (error) { Alert.alert('Senha inválida', error); return }
    if (newPassword !== confirmPassword) { Alert.alert('Erro', 'As senhas não coincidem.'); return }
    setSavingPassword(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword,
      })
      if (signInError) { Alert.alert('Erro', 'Senha atual incorreta.'); return }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      Alert.alert('Sucesso', 'Senha alterada com sucesso!')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setSection('none')
    } catch {
      Alert.alert('Erro', 'Não foi possível alterar a senha.')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir conta',
      'Tem certeza? Todos os seus dados serão apagados permanentemente. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/api/users/account')
              await supabase.auth.signOut()
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir a conta. Entre em contato com o suporte.')
            }
          },
        },
      ]
    )
  }

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => { await supabase.auth.signOut() } },
    ])
  }

  const strength = getPasswordStrength(newPassword)
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword

  if (loadingProfile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color="#2563eb" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Cabeçalho ── */}
        <View style={[styles.profileHeader, { backgroundColor: colors.card }]}>
          <View style={styles.logoWrap}>
            <OrenLogo size={28} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
              {profile?.name || 'Oren Finance'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.sub }]} numberOfLines={1}>
              {profile?.email}
            </Text>
          </View>
        </View>

        {/* ── CONTA ── */}
        <Text style={[styles.sectionLabel, { color: colors.sub }]}>CONTA</Text>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => toggleSection('profile')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: dark ? '#1e3a5f' : '#dbeafe' }]}>
            <Ionicons name="person-outline" size={18} color="#2563eb" />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Editar nome</Text>
          <Ionicons name={section === 'profile' ? 'chevron-up' : 'chevron-down'} size={16} color={colors.sub} />
        </TouchableOpacity>

        {section === 'profile' && (
          <View style={[styles.expandBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.inputLabel, { color: colors.sub }]}>Nome</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.inputText, borderColor: colors.border }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Seu nome"
              placeholderTextColor={colors.sub}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            <TouchableOpacity
              style={[styles.btn, savingProfile && styles.btnDisabled]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnText}>Salvar nome</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => toggleSection('password')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: dark ? '#1e3a5f' : '#dbeafe' }]}>
            <Ionicons name="lock-closed-outline" size={18} color="#2563eb" />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Trocar senha</Text>
          <Ionicons name={section === 'password' ? 'chevron-up' : 'chevron-down'} size={16} color={colors.sub} />
        </TouchableOpacity>

        {section === 'password' && (
          <View style={[styles.expandBox, { backgroundColor: colors.card, borderColor: colors.border }]}>

            <Text style={[styles.inputLabel, { color: colors.sub }]}>Senha atual</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <TextInput
                style={[styles.inputFlex, { color: colors.inputText }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.sub}
                secureTextEntry={!showCurrent}
                returnKeyType="next"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowCurrent(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.sub} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.sub, marginTop: 12 }]}>Nova senha</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <TextInput
                style={[styles.inputFlex, { color: colors.inputText }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.sub}
                secureTextEntry={!showNew}
                returnKeyType="next"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.sub} />
              </TouchableOpacity>
            </View>

            {newPassword.length > 0 && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map(i => (
                    <View
                      key={i}
                      style={[styles.strengthBar, { backgroundColor: i <= strength.score ? strength.color : colors.border }]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: colors.sub, marginTop: 12 }]}>Confirmar nova senha</Text>
            <View style={[styles.inputRow, {
              backgroundColor: colors.input,
              borderColor: confirmPassword.length > 0 ? (passwordsMatch ? '#10b981' : '#ef4444') : colors.border,
            }]}>
              <TextInput
                style={[styles.inputFlex, { color: colors.inputText }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.sub}
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.sub} />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && (
              <Text style={[styles.matchText, { color: passwordsMatch ? '#10b981' : '#ef4444' }]}>
                {passwordsMatch ? '✓ As senhas coincidem' : '✗ As senhas não coincidem'}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.btn, { marginTop: 16 }, savingPassword && styles.btnDisabled]}
              onPress={handleChangePassword}
              disabled={savingPassword}
            >
              {savingPassword
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnText}>Alterar senha</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── SOBRE ── */}
        <Text style={[styles.sectionLabel, { color: colors.sub, marginTop: 24 }]}>SOBRE</Text>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => toggleSection('about')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: dark ? '#1e3a5f' : '#dbeafe' }]}>
            <Ionicons name="information-circle-outline" size={18} color="#2563eb" />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Sobre o aplicativo</Text>
          <Ionicons name={section === 'about' ? 'chevron-up' : 'chevron-down'} size={16} color={colors.sub} />
        </TouchableOpacity>

        {section === 'about' && (
          <View style={[styles.expandBox, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: 'hidden' }]}>
            <AboutRow label="Aplicativo" value="Oren Finance" colors={colors} />
            <AboutRow label="Versão" value="3.0.0" colors={colors} />
            <AboutRow label="Plataforma" value="React Native + Expo SDK 54" colors={colors} />
            <AboutRow label="Banco de dados" value="Supabase (PostgreSQL)" colors={colors} />
            <AboutRow label="Desenvolvedor" value="Gabryel Albuquerque" colors={colors} border={false} />
            <Text style={[styles.copyright, { color: colors.sub, marginBottom: 14 }]}>
              © {new Date().getFullYear()} Oren Finance. Todos os direitos reservados.
            </Text>
          </View>
        )}

        {/* ── ZONA DE PERIGO ── */}
        <Text style={[styles.sectionLabel, { color: '#ef4444', marginTop: 24 }]}>ZONA DE PERIGO</Text>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: dark ? '#3b1f1f' : '#fee2e2' }]}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          </View>
          <Text style={[styles.rowLabel, { color: '#ef4444' }]}>Sair da conta</Text>
          <Ionicons name="chevron-forward" size={16} color="#ef4444" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: dark ? '#3b1f1f' : '#fee2e2' }]}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </View>
          <Text style={[styles.rowLabel, { color: '#ef4444' }]}>Excluir minha conta</Text>
          <Ionicons name="chevron-forward" size={16} color="#ef4444" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function AboutRow({ label, value, colors, border = true }: {
  label: string; value: string; colors: any; border?: boolean
}) {
  return (
    <View style={[
      styles.aboutRow,
      border && { borderBottomWidth: 1, borderBottomColor: colors.border },
    ]}>
      <Text style={[styles.aboutLabel, { color: colors.sub }]}>{label}</Text>
      <Text style={[styles.aboutValue, { color: colors.text }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1e40af',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: { fontSize: 17, fontWeight: '600' },
  profileEmail: { fontSize: 13, marginTop: 2 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },

  expandBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    marginTop: -4,
  },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputFlex: { flex: 1, paddingVertical: 10, fontSize: 15 },
  eyeBtn: { padding: 4 },

  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '600', width: 56, textAlign: 'right' },
  matchText: { fontSize: 12, marginTop: 4 },

  btn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  aboutLabel: { fontSize: 14 },
  aboutValue: { fontSize: 14, fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 8 },
  copyright: { fontSize: 11, textAlign: 'center', marginTop: 8 },
})