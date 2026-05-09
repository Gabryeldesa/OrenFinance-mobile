import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, Alert, RefreshControl, useColorScheme, TouchableOpacity
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import api from '../lib/api'
import TransactionModal from '../components/TransactionModal'

interface Transaction {
  id: string
  description: string
  amount_cents: number
  type: 'income' | 'expense'
  date: string
  categories: { name: string } | null
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const getMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const getMonthLabel = () =>
  new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

export default function TransactionsScreen() {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  const c = {
    bg: dark ? '#0f172a' : '#f8fafc',
    card: dark ? '#1e293b' : '#ffffff',
    title: dark ? '#f1f5f9' : '#1e293b',
    sub: dark ? '#94a3b8' : '#64748b',
    border: dark ? '#334155' : '#f1f5f9',
    header: dark ? '#1e3a8a' : '#1e40af',
  }

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)

  useEffect(() => { loadTransactions() }, [])

  const loadTransactions = async () => {
    try {
      const month = getMonth()
      const res = await api.get(`/api/transactions?month=${month}&limit=50&sort=date&order=desc`)
      setTransactions(res.data.data || [])
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as transações.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => { setRefreshing(true); loadTransactions() }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { backgroundColor: c.header }]}>
        <View>
          <Text style={styles.headerTitle}>Transações</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {getMonthLabel()}
          </Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>Nova</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="receipt-outline" size={48} color={dark ? '#334155' : '#cbd5e1'} />
            <Text style={[styles.emptyText, { color: c.sub }]}>Nenhuma transação este mês</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[
              styles.typeIcon,
              { backgroundColor: item.type === 'income' ? (dark ? '#064e3b' : '#dcfce7') : (dark ? '#7f1d1d' : '#fee2e2') }
            ]}>
              <Ionicons
                name={item.type === 'income' ? 'arrow-up' : 'arrow-down'}
                size={16}
                color={item.type === 'income' ? '#22c55e' : '#ef4444'}
              />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardDesc, { color: c.title }]} numberOfLines={1}>{item.description}</Text>
              <Text style={[styles.cardMeta, { color: c.sub }]}>
                {formatDate(item.date)}
                {item.categories ? ` · ${item.categories.name}` : ''}
              </Text>
            </View>
            <Text style={[
              styles.cardValue,
              { color: item.type === 'income' ? '#22c55e' : '#ef4444' }
            ]}>
              {item.type === 'income' ? '+' : '-'}{formatMoney(item.amount_cents)}
            </Text>
          </View>
        )}
      />

      <TransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => { setModalVisible(false); loadTransactions() }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  header: {
    paddingHorizontal: 20, paddingTop: 58, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSubtitle: { color: '#93c5fd', fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  newBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 15, fontWeight: '500' },
  card: {
    borderRadius: 12, marginBottom: 8, flexDirection: 'row',
    alignItems: 'center', padding: 12, gap: 12, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  typeIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1 },
  cardDesc: { fontSize: 14, fontWeight: '600' },
  cardMeta: { fontSize: 12, marginTop: 2 },
  cardValue: { fontSize: 14, fontWeight: '700' },
})