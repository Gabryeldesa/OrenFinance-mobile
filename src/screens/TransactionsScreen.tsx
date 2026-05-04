import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native'
import api from '../lib/api'

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

export default function TransactionsScreen({ navigation }: any) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      const month = getMonth()
      const res = await api.get(`/api/transactions?month=${month}&limit=50&sort=date&order=desc`)
      setTransactions(res.data.data || [])
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as transações.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transações</Text>
        <View style={{ width: 60 }} />
      </View>

      {transactions.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Nenhuma transação este mês.</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[
                styles.indicator,
                { backgroundColor: item.type === 'income' ? '#22c55e' : '#ef4444' }
              ]} />
              <View style={styles.cardBody}>
                <Text style={styles.cardDesc}>{item.description}</Text>
                <Text style={styles.cardMeta}>
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
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#3b82f6', padding: 20, paddingTop: 56,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  back: { color: '#bfdbfe', fontSize: 14, width: 60 },
  empty: { color: '#6b7280', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  indicator: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14 },
  cardDesc: { fontSize: 15, fontWeight: '500', color: '#111827' },
  cardMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardValue: { fontSize: 14, fontWeight: '600', paddingRight: 14 },
})