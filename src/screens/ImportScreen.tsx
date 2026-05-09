import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, useColorScheme, FlatList, TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import api from '../lib/api'

interface ImportTransaction {
  date: string
  description: string
  amount_cents: number
  type: 'income' | 'expense'
  docto: string
  isDuplicate: boolean
  selected: boolean
  category_id: string | null
  category_name: string | null
}

interface Account { id: string; name: string }
interface Category { id: string; name: string; type: string }

interface PreviewResult {
  bankLabel: string
  total: number
  duplicates: number
  transactions: ImportTransaction[]
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const formatDateDisplay = (d: string) => {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// Remove aspas que o parser inclui nas descrições
const cleanDesc = (s: string) => s.replace(/^"+|"+$/g, '').trim()

export default function ImportScreen({ navigation }: { navigation: any }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [transactions, setTransactions] = useState<ImportTransaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  // Controla qual item está com o seletor de categoria aberto
  const [openCatIndex, setOpenCatIndex] = useState<number | null>(null)

  const c = {
    bg: dark ? '#111827' : '#f3f4f6',
    card: dark ? '#1f2937' : '#ffffff',
    text: dark ? '#f9fafb' : '#111827',
    sub: dark ? '#9ca3af' : '#6b7280',
    border: dark ? '#374151' : '#e5e7eb',
    input: dark ? '#374151' : '#f9fafb',
  }

  const loadAccounts = async () => {
    try {
      const res = await api.get('/api/accounts')
      const list: Account[] = (res.data?.data || []).map((a: any) => ({ id: a.id, name: a.name }))
      setAccounts(list)
      if (list.length > 0) setSelectedAccount(list[0].id)
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as contas.')
    }
  }

  const loadCategories = async () => {
    try {
      const res = await api.get('/api/categories')
      setCategories(res.data?.data || [])
    } catch {}
  }

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      })
      if (result.canceled) return
      const file = result.assets[0]
      if (!file.name.endsWith('.csv')) {
        Alert.alert('Formato inválido', 'Apenas arquivos CSV são suportados.')
        return
      }
      setLoading(true)
      const formData = new FormData()
      formData.append('file', { uri: file.uri, name: file.name, type: 'text/csv' } as any)
      const res = await api.post('/api/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const data: PreviewResult = res.data?.data
      setPreview(data)
      // Limpa aspas das descrições vindas do parser
      setTransactions(data.transactions.map(tx => ({ ...tx, description: cleanDesc(tx.description) })))
      await Promise.all([loadAccounts(), loadCategories()])
      setStep('preview')
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error?.message || 'Erro ao processar o arquivo.')
    } finally {
      setLoading(false)
    }
  }

  const toggleTransaction = (index: number) => {
    setTransactions(prev => prev.map((tx, i) => i === index ? { ...tx, selected: !tx.selected } : tx))
  }

  const toggleAll = (value: boolean) => {
    setTransactions(prev => prev.map(tx => ({ ...tx, selected: tx.isDuplicate ? false : value })))
  }

  const setCategory = (index: number, cat: Category | null) => {
    setTransactions(prev => prev.map((tx, i) =>
      i === index
        ? { ...tx, category_id: cat?.id || null, category_name: cat?.name || null }
        : tx
    ))
    setOpenCatIndex(null)
  }

  const selectedCount = transactions.filter(tx => tx.selected).length

  const handleConfirm = async () => {
    if (!selectedAccount) { Alert.alert('Atenção', 'Selecione uma conta.'); return }
    if (selectedCount === 0) { Alert.alert('Atenção', 'Selecione pelo menos uma transação.'); return }
    Alert.alert('Confirmar importação', `Importar ${selectedCount} transação(ões)?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Importar', onPress: async () => {
          setImporting(true)
          try {
            const res = await api.post('/api/import/confirm', { transactions, account_id: selectedAccount })
            setImportedCount(res.data?.data?.imported || selectedCount)
            setStep('done')
          } catch (e: any) {
            Alert.alert('Erro', e?.response?.data?.error?.message || 'Erro ao importar.')
          } finally {
            setImporting(false)
          }
        }
      },
    ])
  }

  const handleReset = () => {
    setStep('upload'); setPreview(null); setTransactions([])
    setSelectedAccount(null); setAccounts([]); setCategories([])
  }

  // ─── Upload ───────────────────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <View style={[s.container, { backgroundColor: c.bg }]}>
        <ScrollView contentContainerStyle={s.center}>
          <View style={[s.uploadCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={s.uploadIcon}>
              <Ionicons name="cloud-upload-outline" size={48} color="#2563eb" />
            </View>
            <Text style={[s.uploadTitle, { color: c.text }]}>Importar extrato CSV</Text>
            <Text style={[s.uploadSub, { color: c.sub }]}>
              Nubank, Inter, Bradesco, Banco do Brasil, Itaú, Santander, Caixa, C6 e outros.
            </Text>
            <TouchableOpacity style={[s.btn, loading && s.btnOff]} onPress={handlePickFile} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="document-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                   <Text style={s.btnText}>Selecionar arquivo CSV</Text></>}
            </TouchableOpacity>
          </View>

          <View style={[s.tipsCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.tipsTitle, { color: c.text }]}>Como exportar o extrato?</Text>
            {[
              { bank: 'Nubank', tip: 'App → Extrato → ícone compartilhar → Exportar CSV' },
              { bank: 'Inter', tip: 'App → Extrato → Exportar → CSV' },
              { bank: 'Bradesco', tip: 'Internet Banking → Extrato → Exportar → CSV' },
              { bank: 'BB', tip: 'Internet Banking → Extrato → Salvar como CSV' },
            ].map(({ bank, tip }) => (
              <View key={bank} style={[s.tipRow, { borderBottomColor: c.border }]}>
                <Text style={[s.tipBank, { color: '#2563eb' }]}>{bank}</Text>
                <Text style={[s.tipTxt, { color: c.sub }]}>{tip}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    )
  }

  // ─── Concluído ────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <View style={[s.container, s.center, { backgroundColor: c.bg }]}>
        <Ionicons name="checkmark-circle" size={72} color="#10b981" style={{ marginBottom: 16 }} />
        <Text style={[s.uploadTitle, { color: c.text }]}>Importação concluída!</Text>
        <Text style={[s.uploadSub, { color: c.sub }]}>{importedCount} transação(ões) importada(s).</Text>
        <TouchableOpacity style={s.btn} onPress={handleReset}>
          <Text style={s.btnText}>Importar outro arquivo</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ─── Preview ──────────────────────────────────────────────────────────────
  return (
    <View style={[s.container, { backgroundColor: c.bg }]}>

      {/* Cabeçalho */}
      <View style={[s.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={s.row}>
          <View style={[s.bankBadge, { backgroundColor: dark ? '#1e3a5f' : '#dbeafe' }]}>
            <Ionicons name="business-outline" size={13} color="#2563eb" />
            <Text style={s.bankText}>{preview?.bankLabel}</Text>
          </View>
          <Text style={[s.statText, { color: c.sub }]}>
            {preview?.total} encontrada(s) · {preview?.duplicates} duplicada(s)
          </Text>
        </View>

        {/* Conta de destino */}
        <Text style={[s.label, { color: c.sub }]}>Conta de destino</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {accounts.map(acc => (
            <TouchableOpacity
              key={acc.id}
              style={[s.chip, {
                backgroundColor: selectedAccount === acc.id ? '#2563eb' : c.input,
                borderColor: selectedAccount === acc.id ? '#2563eb' : c.border,
              }]}
              onPress={() => setSelectedAccount(acc.id)}
            >
              <Text style={[s.chipText, { color: selectedAccount === acc.id ? '#fff' : c.text }]}>
                {acc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Selecionar todas */}
        <View style={s.selRow}>
          <Text style={[s.selCount, { color: c.text }]}>{selectedCount} de {transactions.length} selecionada(s)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => toggleAll(true)} style={s.selBtn}>
              <Text style={s.selBtnText}>Todas</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleAll(false)} style={s.selBtn}>
              <Text style={s.selBtnText}>Nenhuma</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Lista */}
      <FlatList
        data={transactions}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => {
          const isOpen = openCatIndex === index
          const catList = categories.filter(cat =>
            cat.type === item.type || cat.type === 'both'
          )

          return (
            <View style={[s.txCard, {
              backgroundColor: c.card,
              borderColor: item.isDuplicate ? '#f59e0b' : c.border,
              opacity: item.isDuplicate ? 0.55 : item.selected ? 1 : 0.6,
            }]}>

              {/* Linha principal */}
              <TouchableOpacity
                style={s.txMain}
                onPress={() => !item.isDuplicate && toggleTransaction(index)}
                activeOpacity={0.7}
              >
                {/* Número */}
                <Text style={[s.txNum, { color: c.sub }]}>#{index + 1}</Text>

                {/* Checkbox */}
                <View style={[s.check, {
                  backgroundColor: item.selected ? '#2563eb' : c.input,
                  borderColor: item.selected ? '#2563eb' : c.border,
                }]}>
                  {item.selected && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>

                {/* Descrição + data */}
                <View style={{ flex: 1 }}>
                  <Text style={[s.txDesc, { color: c.text }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <Text style={[s.txDate, { color: c.sub }]}>{formatDateDisplay(item.date)}</Text>
                    {item.isDuplicate && (
                      <View style={s.dupBadge}><Text style={s.dupText}>Duplicada</Text></View>
                    )}
                  </View>
                </View>

                {/* Valor */}
                <Text style={[s.txAmount, { color: item.type === 'income' ? '#10b981' : '#ef4444' }]}>
                  {item.type === 'income' ? '+' : '-'}{formatMoney(item.amount_cents)}
                </Text>
              </TouchableOpacity>

              {/* Seletor de categoria (apenas para não-duplicadas e selecionadas) */}
              {!item.isDuplicate && item.selected && (
                <View style={[s.catRow, { borderTopColor: c.border }]}>
                  <TouchableOpacity
                    style={[s.catBtn, { backgroundColor: c.input, borderColor: c.border }]}
                    onPress={() => setOpenCatIndex(isOpen ? null : index)}
                  >
                    <Ionicons name="pricetag-outline" size={13} color={c.sub} style={{ marginRight: 5 }} />
                    <Text style={[s.catBtnText, { color: item.category_name ? '#10b981' : c.sub }]} numberOfLines={1}>
                      {item.category_name || 'Sem categoria'}
                    </Text>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={13} color={c.sub} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>

                  {/* Lista de categorias expansível */}
                  {isOpen && (
                    <View style={[s.catDropdown, { backgroundColor: c.card, borderColor: c.border }]}>
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        <TouchableOpacity style={s.catOption} onPress={() => setCategory(index, null)}>
                          <Text style={[s.catOptionText, { color: c.sub }]}>— Sem categoria</Text>
                        </TouchableOpacity>
                        {catList.map(cat => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[s.catOption, item.category_id === cat.id && { backgroundColor: dark ? '#1e3a5f' : '#eff6ff' }]}
                            onPress={() => setCategory(index, cat)}
                          >
                            <Text style={[s.catOptionText, {
                              color: item.category_id === cat.id ? '#2563eb' : c.text,
                              fontWeight: item.category_id === cat.id ? '600' : '400',
                            }]}>
                              {cat.name}
                            </Text>
                            {item.category_id === cat.id && (
                              <Ionicons name="checkmark" size={14} color="#2563eb" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </View>
          )
        }}
      />

      {/* Botão fixo */}
      <View style={[s.bar, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <TouchableOpacity
          style={[s.btn, (importing || selectedCount === 0) && s.btnOff]}
          onPress={handleConfirm}
          disabled={importing || selectedCount === 0}
        >
          {importing
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Importar {selectedCount} transação(ões)</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flexGrow: 1, justifyContent: 'center', padding: 20 },

  uploadCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 16 },
  uploadIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  uploadTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  uploadSub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  btn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnOff: { opacity: 0.5 },

  tipsCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
  tipsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  tipRow: { paddingVertical: 10, borderBottomWidth: 1 },
  tipBank: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  tipTxt: { fontSize: 12, lineHeight: 18 },

  header: { padding: 14, borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  bankBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  bankText: { color: '#2563eb', fontWeight: '700', fontSize: 12 },
  statText: { fontSize: 12 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  chipText: { fontSize: 13, fontWeight: '500' },
  selRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  selCount: { fontSize: 13, fontWeight: '500' },
  selBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#2563eb' },
  selBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  txCard: { borderRadius: 10, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  txMain: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  txNum: { fontSize: 11, fontWeight: '600', minWidth: 26, textAlign: 'right' },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  txDesc: { fontSize: 14, fontWeight: '500' },
  txDate: { fontSize: 12 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  dupBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dupText: { color: '#92400e', fontSize: 11, fontWeight: '600' },

  catRow: { borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  catBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  catBtnText: { fontSize: 13, flex: 1 },
  catDropdown: { marginTop: 6, borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  catOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  catOptionText: { fontSize: 13 },

  bar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
})