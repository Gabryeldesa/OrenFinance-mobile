import React, { useState, useEffect } from 'react'
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Alert, useColorScheme
} from 'react-native'
import api from '../lib/api'

interface RecurringRule {
  id: string
  description: string
  amount_cents: number
  type: string
  day_of_month: number
  is_active: boolean
  credit_card_id: string | null
}

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
  editRule?: RecurringRule | null
}

const TYPES = [
  { label: '↓ Despesa', value: 'expense' },
  { label: '↑ Receita', value: 'income' },
]

export default function RecurringModal({ visible, onClose, onSuccess, editRule }: Props) {
  const dark = useColorScheme() === 'dark'
  const c = {
    card:   dark ? '#1e293b' : '#ffffff',
    text:   dark ? '#f1f5f9' : '#1e293b',
    input:  dark ? '#0f172a' : '#f1f5f9',
    border: dark ? '#334155' : '#e2e8f0',
    sub:    dark ? '#94a3b8' : '#64748b',
  }

  const [type, setType] = useState('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('5')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [creditCardId, setCreditCardId] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const isEditing = !!editRule
  const isCard = !!creditCardId

  useEffect(() => {
    if (visible) {
      loadOptions()
      if (editRule) {
        setType(editRule.type)
        setDescription(editRule.description)
        setAmount((editRule.amount_cents / 100).toFixed(2).replace('.', ','))
        setDayOfMonth(String(editRule.day_of_month))
        setCreditCardId(editRule.credit_card_id || '')
        setCategoryId('')
        setAccountId('')
      } else {
        setType('expense')
        setDescription('')
        setAmount('')
        setDayOfMonth('5')
        setCategoryId('')
        setAccountId('')
        setCreditCardId('')
      }
    }
  }, [visible, editRule])

  const loadOptions = async () => {
    try {
      const [resCat, resAcc, resCards] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/accounts'),
        api.get('/api/cards'),
      ])
      setCategories(resCat.data.data || [])
      setAccounts(resAcc.data.data || [])
      setCards(resCards.data.data || [])
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as opções.')
    }
  }

  const handleSave = async () => {
    if (!description.trim()) { Alert.alert('Atenção', 'Preencha a descrição.'); return }
    if (!amount) { Alert.alert('Atenção', 'Preencha o valor.'); return }
    if (!dayOfMonth) { Alert.alert('Atenção', 'Preencha o dia do mês.'); return }

    setLoading(true)
    try {
      const cleanValue = amount.replace(/\./g, '').replace(',', '.')
      const amountCents = Math.round(parseFloat(cleanValue) * 100)

      const body: any = {
        description: description.trim(),
        amount_cents: amountCents,
        type,
        category_id: categoryId || null,
        account_id: creditCardId ? null : (accountId || null),
        credit_card_id: creditCardId || null,
        day_of_month: parseInt(dayOfMonth),
        total_installments: null,
      }

      if (isEditing) {
        await api.put(`/api/recurring/${editRule!.id}`, body)
      } else {
        await api.post('/api/recurring', body)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error?.message || 'Não foi possível salvar.')
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = categories.filter(
    (c: any) => c.type === type || c.type === 'both'
  )

  const SelectionGrid = ({ data, selectedId, onSelect }: any) => (
    <View style={styles.grid}>
      {(data || []).map((item: any) => (
        <TouchableOpacity
          key={item.id}
          onPress={() => onSelect(selectedId === item.id ? '' : item.id)}
          style={[
            styles.gridItem,
            { backgroundColor: c.input, borderColor: selectedId === item.id ? '#3b82f6' : c.border }
          ]}
        >
          <Text style={{ color: selectedId === item.id ? '#3b82f6' : c.text, fontSize: 12, fontWeight: '600' }}>
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: c.card }]}>
          <Text style={[styles.title, { color: c.text }]}>
            {isEditing ? 'Editar recorrente' : 'Nova regra recorrente'}
          </Text>

          <View style={styles.typeRow}>
            {TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                onPress={() => { setType(t.value); setCategoryId('') }}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: type === t.value
                      ? (t.value === 'income' ? '#22c55e' : '#ef4444')
                      : c.input
                  }
                ]}
              >
                <Text style={{ color: type === t.value ? '#fff' : c.sub, fontWeight: '700' }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.input, color: c.text, borderColor: c.border }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Netflix, Aluguel, Salário..."
              placeholderTextColor={c.sub}
            />

            <Text style={styles.label}>Valor (R$)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.input, color: c.text, borderColor: c.border }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor={c.sub}
            />

            <Text style={styles.label}>Todo dia (do mês)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.input, color: c.text, borderColor: c.border }]}
              value={dayOfMonth}
              onChangeText={setDayOfMonth}
              keyboardType="numeric"
              placeholder="Ex: 5"
              placeholderTextColor={c.sub}
            />
            <Text style={{ color: c.sub, fontSize: 11, marginTop: 4 }}>
              Use até o dia 28 para funcionar em todos os meses
            </Text>

            <Text style={styles.label}>Categoria</Text>
            <SelectionGrid
              data={filteredCategories}
              selectedId={categoryId}
              onSelect={setCategoryId}
            />

            <Text style={styles.label}>Cartão de crédito</Text>
            <SelectionGrid
              data={cards}
              selectedId={creditCardId}
              onSelect={(id: string) => { setCreditCardId(id); setAccountId('') }}
            />

            {!isCard && (
              <>
                <Text style={styles.label}>Conta</Text>
                <SelectionGrid
                  data={accounts}
                  selectedId={accountId}
                  onSelect={setAccountId}
                />
              </>
            )}

            <View style={styles.footer}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: c.border }]} onPress={onClose}>
                <Text style={{ color: c.sub }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveText}>{isEditing ? 'Salvar' : 'Criar'}</Text>
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
  content:   { borderRadius: 16, padding: 20, maxHeight: '92%' },
  title:     { fontSize: 18, fontWeight: '800', marginBottom: 15 },
  typeRow:   { flexDirection: 'row', gap: 10, marginBottom: 15 },
  typeBtn:   { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  label:     { fontSize: 11, fontWeight: '700', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', color: '#94a3b8' },
  input:     { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, height: 48 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem:  { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 2, minWidth: '30%', alignItems: 'center' },
  footer:    { flexDirection: 'row', gap: 10, marginTop: 30, marginBottom: 10 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  saveBtn:   { flex: 1, padding: 16, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center' },
  saveText:  { color: '#fff', fontWeight: '700' },
})