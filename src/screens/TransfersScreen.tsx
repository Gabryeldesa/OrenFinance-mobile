import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, useColorScheme, Alert
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import api from '../lib/api'
import TransferModal from '../components/TransferModal'

interface Transfer {
  id: string
  amount_cents: number
  date: string
  notes: string | null
  from_account: { id: string; name: string }
  to_account: { id: string; name: string }
}

interface Account {
  id: string
  name: string
  current_balance: number
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const formatDateDisplay = (dateStr: string) => {
  const [year, month, day] = dateStr.split('T')[0].split('-')
  return `${day}/${month}/${year}`
}

export default function TransfersScreen() {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const loadData = async () => {
    try {
      const [tRes, aRes] = await Promise.all([
        api.get('/api/transfers'),
        api.get('/api/accounts'),
      ])
      setTransfers(tRes.data.data || [])
      setAccounts(aRes.data.data || [])
    } catch (err: any) {
      console.log('ERRO transfers:', err?.message, err?.response?.data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [])

  const handleDelete = (id: string) => {
    Alert.alert('Excluir transferência', 'Tem certeza que deseja excluir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/transfers/${id}`)
            loadData()
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir.')
          }
        }
      }
    ])
  }

  const bg       = dark ? '#0f172a' : '#f8fafc'
  const card     = dark ? '#1e293b' : '#ffffff'
  const border   = dark ? '#334155' : '#f1f5f9'
  const textMain = dark ? '#f1f5f9' : '#111827'
  const textSub  = dark ? '#94a3b8' : '#6b7280'

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: card, borderBottomColor: border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: textMain }]}>Transferências</Text>
          <Text style={[styles.headerSub, { color: textSub }]}>Movimentações entre suas contas</Text>
        </View>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addBtnText}>Nova</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {/* Cards de saldo das contas */}
        {accounts.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {accounts.map(acc => (
              <View key={acc.id} style={[styles.accountCard, { backgroundColor: card, borderColor: border }]}>
                <Text style={[styles.accountName, { color: textSub }]} numberOfLines={1}>{acc.name}</Text>
                <Text style={[
                  styles.accountBalance,
                  { color: (acc.current_balance || 0) >= 0 ? textMain : '#ef4444' }
                ]}>
                  {formatCurrency(acc.current_balance || 0)}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Lista de transferências */}
        {loading ? (
          <Text style={[styles.emptyText, { color: textSub }]}>Carregando...</Text>
        ) : transfers.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: card, borderColor: border }]}>
            <Text style={styles.emptyIcon}>🔀</Text>
            <Text style={[styles.emptyTitle, { color: textMain }]}>Nenhuma transferência registrada</Text>
            <Text style={[styles.emptySub, { color: textSub }]}>Mova dinheiro entre suas contas</Text>
            <TouchableOpacity onPress={() => setShowModal(true)}>
              <Text style={styles.emptyLink}>Fazer primeira transferência</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.listBox, { backgroundColor: card, borderColor: border }]}>
            {transfers.map((t, index) => (
              <View
                key={t.id}
                style={[
                  styles.transferRow,
                  index !== transfers.length - 1 && { borderBottomWidth: 1, borderBottomColor: border }
                ]}
              >
                <View style={[styles.transferIcon, { backgroundColor: dark ? '#1e3a5f' : '#eff6ff' }]}>
                  <Text style={{ fontSize: 16 }}>🔀</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.transferTitle, { color: textMain }]}>
                    {t.from_account?.name} → {t.to_account?.name}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                    <Text style={[styles.transferDate, { color: textSub }]}>{formatDateDisplay(t.date)}</Text>
                    {t.notes ? <Text style={[styles.transferDate, { color: textSub }]}>· {t.notes}</Text> : null}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={styles.transferAmount}>{formatCurrency(t.amount_cents)}</Text>
                  <TouchableOpacity onPress={() => handleDelete(t.id)}>
                    <Text style={styles.deleteBtn}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TransferModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSaved={loadData}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle:    { fontSize: 22, fontWeight: '700' },
  headerSub:      { fontSize: 13, marginTop: 2 },
  addBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  addBtnText:     { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  accountCard:    { borderWidth: 1, borderRadius: 12, padding: 14, marginRight: 10, minWidth: 130 },
  accountName:    { fontSize: 12, marginBottom: 4 },
  accountBalance: { fontSize: 14, fontWeight: '700' },
  emptyText:      { textAlign: 'center', marginTop: 40, fontSize: 14 },
  emptyBox:       { borderWidth: 1, borderRadius: 16, padding: 40, alignItems: 'center' },
  emptyIcon:      { fontSize: 40, marginBottom: 10 },
  emptyTitle:     { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySub:       { fontSize: 13, marginBottom: 12 },
  emptyLink:      { color: '#3b82f6', fontSize: 14 },
  listBox:        { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  transferRow:    { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  transferIcon:   { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  transferTitle:  { fontSize: 14, fontWeight: '600' },
  transferDate:   { fontSize: 12 },
  transferAmount: { fontSize: 14, fontWeight: '700', color: '#3b82f6' },
  deleteBtn:      { fontSize: 12, color: '#ef4444' },
})