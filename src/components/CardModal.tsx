import React, { useState, useEffect } from 'react'
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, useColorScheme, ScrollView
} from 'react-native'
import api from '../lib/api'

interface CardData {
  id: string
  name: string
  limit_cents: number
  closing_day: number
  due_day: number
  account_id: string | null
}

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
  editCard?: CardData | null
}

export default function CardModal({ visible, onClose, onSuccess, editCard }: Props) {
  const dark = useColorScheme() === 'dark'
  const c = {
    card:   dark ? '#1e293b' : '#ffffff',
    text:   dark ? '#f1f5f9' : '#1e293b',
    input:  dark ? '#0f172a' : '#f1f5f9',
    border: dark ? '#334155' : '#e2e8f0',
    sub:    dark ? '#94a3b8' : '#64748b',
  }

  const [name, setName]             = useState('')
  const [limit, setLimit]           = useState('')
  const [closingDay, setClosingDay] = useState('10')
  const [dueDay, setDueDay]         = useState('17')
  const [accountId, setAccountId]   = useState('')
  const [accounts, setAccounts]     = useState<any[]>([])
  const [loading, setLoading]       = useState(false)

  const isEdit = !!editCard

  useEffect(() => {
    if (visible) {
      loadAccounts()
      if (editCard) {
        setName(editCard.name)
        setLimit((editCard.limit_cents / 100).toFixed(2).replace('.', ','))
        setClosingDay(String(editCard.closing_day))
        setDueDay(String(editCard.due_day))
        setAccountId(editCard.account_id || '')
      } else {
        setName('')
        setLimit('')
        setClosingDay('10')
        setDueDay('17')
        setAccountId('')
      }
    }
  }, [visible, editCard])

  const loadAccounts = async () => {
    try {
      const res = await api.get('/api/accounts')
      setAccounts(res.data.data || [])
    } catch { /* conta vinculada é opcional */ }
  }

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Atenção', 'Preencha o nome do cartão.'); return }
    if (!limit)       { Alert.alert('Atenção', 'Preencha o limite.'); return }

    const closingNum = parseInt(closingDay)
    const dueNum     = parseInt(dueDay)
    if (isNaN(closingNum) || closingNum < 1 || closingNum > 31) {
      Alert.alert('Atenção', 'Dia de fechamento inválido (1-31).'); return
    }
    if (isNaN(dueNum) || dueNum < 1 || dueNum > 31) {
      Alert.alert('Atenção', 'Dia de vencimento inválido (1-31).'); return
    }

    setLoading(true)
    try {
      const cleanValue = limit.replace(/\./g, '').replace(',', '.')
      const limitCents = Math.round(parseFloat(cleanValue) * 100)

      if (isNaN(limitCents) || limitCents <= 0) {
        Alert.alert('Atenção', 'Limite inválido.')
        setLoading(false)
        return
      }

      const payload = {
        name: name.trim(),
        limit_cents: limitCents,
        closing_day: closingNum,
        due_day: dueNum,
        account_id: accountId || null,
      }

      if (isEdit) {
        await api.put(`/api/cards/${editCard!.id}`, payload)
      } else {
        await api.post('/api/cards', payload)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error?.message || 'Não foi possível salvar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: c.card }]}>
          <Text style={[styles.title, { color: c.text }]}>
            {isEdit ? 'Editar cartão' : 'Novo cartão'}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>

            <Text style={styles.label}>Nome do cartão</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.input, color: c.text, borderColor: c.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Nubank, Itaú Platinum..."
              placeholderTextColor={c.sub}
            />

            <Text style={styles.label}>Limite (R$)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.input, color: c.text, borderColor: c.border }]}
              value={limit}
              onChangeText={setLimit}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor={c.sub}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Dia fechamento</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.input, color: c.text, borderColor: c.border }]}
                  value={closingDay}
                  onChangeText={setClosingDay}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={c.sub}
                  maxLength={2}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Dia vencimento</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.input, color: c.text, borderColor: c.border }]}
                  value={dueDay}
                  onChangeText={setDueDay}
                  keyboardType="numeric"
                  placeholder="17"
                  placeholderTextColor={c.sub}
                  maxLength={2}
                />
              </View>
            </View>

            {accounts.length > 0 && (
              <>
                <Text style={styles.label}>Conta para débito (opcional)</Text>
                <View style={styles.grid}>
                  <TouchableOpacity
                    onPress={() => setAccountId('')}
                    style={[styles.gridItem, { backgroundColor: c.input, borderColor: accountId === '' ? '#3b82f6' : c.border }]}
                  >
                    <Text style={{ color: accountId === '' ? '#3b82f6' : c.sub, fontSize: 12, fontWeight: '600' }}>
                      Nenhuma
                    </Text>
                  </TouchableOpacity>
                  {accounts.map(acc => (
                    <TouchableOpacity
                      key={acc.id}
                      onPress={() => setAccountId(acc.id)}
                      style={[styles.gridItem, { backgroundColor: c.input, borderColor: accountId === acc.id ? '#3b82f6' : c.border }]}
                    >
                      <Text style={{ color: accountId === acc.id ? '#3b82f6' : c.text, fontSize: 12, fontWeight: '600' }}>
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.footer}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: c.border }]} onPress={onClose}>
                <Text style={{ color: c.sub }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveText}>Salvar</Text>
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
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 15 },
  content:   { borderRadius: 16, padding: 20, maxHeight: '85%' },
  title:     { fontSize: 18, fontWeight: '800', marginBottom: 15 },
  label:     { fontSize: 11, fontWeight: '700', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', color: '#94a3b8' },
  input:     { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, height: 48 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem:  { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 2, alignItems: 'center' },
  footer:    { flexDirection: 'row', gap: 10, marginTop: 30, marginBottom: 10 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  saveBtn:   { flex: 1, padding: 16, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center' },
  saveText:  { color: '#fff', fontWeight: '700' },
})