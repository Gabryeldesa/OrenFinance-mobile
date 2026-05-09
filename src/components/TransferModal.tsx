import React, { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  useColorScheme, Platform, KeyboardAvoidingView, Keyboard
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import api from '../lib/api'

interface Account {
  id: string
  name: string
  current_balance: number
}

interface Props {
  visible: boolean
  onClose: () => void
  onSaved: () => void
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const formatDateDisplay = (d: Date) => {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

const formatDateButton = (d: Date) => {
  return `${String(d.getDate()).padStart(2, '0')} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

export default function TransferModal({ visible, onClose, onSaved }: Props) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  const [accounts, setAccounts] = useState<Account[]>([])
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    if (visible) {
      loadAccounts()
      setFromAccountId('')
      setToAccountId('')
      setAmount('')
      setDate(new Date())
      setNotes('')
      setError('')
    }
  }, [visible])

  const loadAccounts = async () => {
    try {
      const res = await api.get('/api/accounts')
      setAccounts(res.data.data || [])
    } catch {
      setError('Erro ao carregar contas.')
    }
  }

  const handleSave = async () => {
    if (!fromAccountId) { setError('Selecione a conta de origem.'); return }
    if (!toAccountId) { setError('Selecione a conta de destino.'); return }
    if (fromAccountId === toAccountId) { setError('Conta de origem e destino não podem ser iguais.'); return }
    if (!amount) { setError('Valor é obrigatório.'); return }

    setSaving(true)
    setError('')
    try {
      const amount_cents = Math.round(
        parseFloat(amount.replace(/\./g, '').replace(',', '.')) * 100
      )
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      await api.post('/api/transfers', {
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount_cents,
        date: dateStr,
        notes: notes || null
      })
      onSaved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const bg       = dark ? '#1f2937' : '#ffffff'
  const bgInput  = dark ? '#374151' : '#f9fafb'
  const textMain = dark ? '#ffffff' : '#111827'
  const textSub  = dark ? '#9ca3af' : '#6b7280'
  const border   = dark ? '#4b5563' : '#e5e7eb'
  const overlay  = dark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)'

  const destAccounts = accounts.filter(a => a.id !== fromAccountId)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.overlay, { backgroundColor: overlay }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={Keyboard.dismiss} />
          <View style={[styles.sheet, { backgroundColor: bg }]}>
            <Text style={[styles.title, { color: textMain }]}>Nova transferência</Text>

            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: dark ? '#450a0a' : '#fef2f2', borderColor: dark ? '#7f1d1d' : '#fecaca' }]}>
                <Text style={{ color: dark ? '#fca5a5' : '#dc2626', fontSize: 13 }}>{error}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Conta de origem */}
              <Text style={[styles.label, { color: textSub }]}>Conta de origem</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {accounts.map(acc => (
                  <TouchableOpacity
                    key={acc.id}
                    onPress={() => {
                      setFromAccountId(acc.id)
                      if (toAccountId === acc.id) setToAccountId('')
                    }}
                    style={[
                      styles.accountChip,
                      {
                        backgroundColor: fromAccountId === acc.id ? '#2563eb' : bgInput,
                        borderColor: fromAccountId === acc.id ? '#2563eb' : border,
                      }
                    ]}
                  >
                    <Text style={{ color: fromAccountId === acc.id ? '#ffffff' : textMain, fontSize: 13, fontWeight: '600' }}>
                      {acc.name}
                    </Text>
                    <Text style={{ color: fromAccountId === acc.id ? 'rgba(255,255,255,0.8)' : textSub, fontSize: 11, marginTop: 2 }}>
                      {formatCurrency(acc.current_balance || 0)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Conta de destino */}
              <Text style={[styles.label, { color: textSub }]}>Conta de destino</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {destAccounts.map(acc => (
                  <TouchableOpacity
                    key={acc.id}
                    onPress={() => setToAccountId(acc.id)}
                    style={[
                      styles.accountChip,
                      {
                        backgroundColor: toAccountId === acc.id ? '#2563eb' : bgInput,
                        borderColor: toAccountId === acc.id ? '#2563eb' : border,
                      }
                    ]}
                  >
                    <Text style={{ color: toAccountId === acc.id ? '#ffffff' : textMain, fontSize: 13, fontWeight: '600' }}>
                      {acc.name}
                    </Text>
                    <Text style={{ color: toAccountId === acc.id ? 'rgba(255,255,255,0.8)' : textSub, fontSize: 11, marginTop: 2 }}>
                      {formatCurrency(acc.current_balance || 0)}
                    </Text>
                  </TouchableOpacity>
                ))}
                {destAccounts.length === 0 && (
                  <Text style={{ color: textSub, fontSize: 13, paddingVertical: 8 }}>
                    {fromAccountId ? 'Nenhuma outra conta disponível.' : 'Selecione a origem primeiro.'}
                  </Text>
                )}
              </ScrollView>

              {/* Valor */}
              <Text style={[styles.label, { color: textSub }]}>Valor (R$)</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                placeholderTextColor={textSub}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                style={[styles.input, { backgroundColor: bgInput, borderColor: border, color: textMain }]}
              />

              {/* Data */}
              <Text style={[styles.label, { color: textSub }]}>Data</Text>
              <TouchableOpacity
                onPress={() => { Keyboard.dismiss(); setShowDatePicker(true) }}
                style={[styles.input, { backgroundColor: bgInput, borderColor: border, justifyContent: 'center' }]}
              >
                <Text style={{ color: textMain, fontSize: 15 }}>{formatDateButton(date)}</Text>
              </TouchableOpacity>

              {showDatePicker && (
               <DateTimePicker
  value={date}
  mode="date"
  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
  themeVariant={dark ? 'dark' : 'light'}
  locale="pt-BR"
  onChange={(_, selected) => {
    if (Platform.OS === 'android') setShowDatePicker(false)
    if (selected) setDate(selected)
  }}
/>
              )}
              {showDatePicker && Platform.OS === 'ios' && (
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={[styles.confirmDateBtn, { backgroundColor: '#2563eb' }]}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>Confirmar data</Text>
                </TouchableOpacity>
              )}

              {/* Observação */}
              <Text style={[styles.label, { color: textSub }]}>Observação (opcional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Ex: Pagamento de aluguel..."
                placeholderTextColor={textSub}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                style={[styles.input, { backgroundColor: bgInput, borderColor: border, color: textMain }]}
              />

            </ScrollView>

            {/* Botões */}
            <View style={styles.buttons}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.btnCancel, { borderColor: border }]}
              >
                <Text style={{ color: textSub, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[styles.btnSave, { opacity: saving ? 0.6 : 1 }]}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#ffffff', fontWeight: '700' }}>Transferir</Text>
                }
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay:        { flex: 1, justifyContent: 'flex-end' },
  sheet:          { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  title:          { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  errorBox:       { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  label:          { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input:          { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  accountChip:    { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginRight: 10, minWidth: 120, alignItems: 'center' },
  confirmDateBtn: { borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16 },
  buttons:        { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnCancel:      { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnSave:        { flex: 1, backgroundColor: '#2563eb', borderRadius: 12, padding: 14, alignItems: 'center' },
})