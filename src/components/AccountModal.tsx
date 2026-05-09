import React, { useState } from 'react'
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, useColorScheme, ScrollView
} from 'react-native'
import api from '../lib/api'

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

const ACCOUNT_TYPES = [
  { label: 'Conta Corrente', value: 'checking' },
  { label: 'Poupança',       value: 'savings' },
  { label: 'Investimento',   value: 'investment' },
  { label: 'Dinheiro',       value: 'cash' },
]

export default function AccountModal({ visible, onClose, onSuccess }: Props) {
  const dark = useColorScheme() === 'dark'
  const c = {
    bg:     dark ? '#0f172a' : '#f8fafc',
    card:   dark ? '#1e293b' : '#ffffff',
    text:   dark ? '#f1f5f9' : '#1e293b',
    input:  dark ? '#0f172a' : '#f1f5f9',
    border: dark ? '#334155' : '#e2e8f0',
    sub:    dark ? '#94a3b8' : '#64748b',
  }

  const [name, setName] = useState('')
  const [type, setType] = useState('checking')
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Atenção', 'Preencha o nome da conta.'); return }

    setLoading(true)
    try {
      const cleanValue = balance.replace(/\./g, '').replace(',', '.')
      const balanceCents = Math.round(parseFloat(cleanValue || '0') * 100)
      const safeCents = isNaN(balanceCents) ? 0 : balanceCents

      await api.post('/api/accounts', {
        name: name.trim(),
        type,
        initial_balance: safeCents,
      })

      onSuccess()
      handleClose()
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error?.message || 'Não foi possível salvar.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setType('checking')
    setBalance('0')
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: c.card }]}>
          <Text style={[styles.title, { color: c.text }]}>Nova conta</Text>

          <ScrollView showsVerticalScrollIndicator={false}>

            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.input, color: c.text, borderColor: c.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Nubank, Bradesco..."
              placeholderTextColor={c.sub}
            />

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.grid}>
              {ACCOUNT_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setType(t.value)}
                  style={[
                    styles.gridItem,
                    { backgroundColor: c.input, borderColor: type === t.value ? '#3b82f6' : c.border }
                  ]}
                >
                  <Text style={{ color: type === t.value ? '#3b82f6' : c.text, fontSize: 13, fontWeight: '600' }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Saldo inicial (R$)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.input, color: c.text, borderColor: c.border }]}
              value={balance}
              onChangeText={setBalance}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor={c.sub}
            />

            <View style={styles.footer}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: c.border }]} onPress={handleClose}>
                <Text style={{ color: c.sub }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveText}>Criar</Text>
                }
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 15 },
  content:  { borderRadius: 16, padding: 20, maxHeight: '85%' },
  title:    { fontSize: 18, fontWeight: '800', marginBottom: 15 },
  label:    { fontSize: 11, fontWeight: '700', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', color: '#94a3b8' },
  input:    { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, height: 48 },
  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 2, alignItems: 'center' },
  footer:   { flexDirection: 'row', gap: 10, marginTop: 30, marginBottom: 10 },
  cancelBtn:{ flex: 1, padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  saveBtn:  { flex: 1, padding: 16, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
})