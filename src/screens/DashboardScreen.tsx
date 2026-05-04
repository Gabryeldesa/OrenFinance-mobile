import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import api from '../lib/api'

interface Summary {
  income: number
  expense: number
  balance: number
}

interface Account {
  id: string
  name: string
  current_balance: number
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const getMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function DashboardScreen({ onLogout }: { onLogout: () => void }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const month = getMonth()
      const [summaryRes, accountsRes] = await Promise.all([
        api.get(`/api/transactions/summary?month=${month}`),
        api.get('/api/accounts'),
      ])
      setSummary(summaryRes.data.data)
      setAccounts(accountsRes.data.data || [])
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os dados.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token')
    onLogout()
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Oren Finance</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Sair</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Resumo do mês</Text>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderTopColor: '#22c55e' }]}>
          <Text style={styles.summaryLabel}>Receitas</Text>
          <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
            {formatMoney(summary?.income || 0)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { borderTopColor: '#ef4444' }]}>
          <Text style={styles.summaryLabel}>Despesas</Text>
          <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
            {formatMoney(summary?.expense || 0)}
          </Text>
        </View>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo do mês</Text>
        <Text style={[
          styles.balanceValue,
          { color: (summary?.balance || 0) >= 0 ? '#22c55e' : '#ef4444' }
        ]}>
          {formatMoney(summary?.balance || 0)}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Contas</Text>
      {accounts.map(account => (
        <View key={account.id} style={styles.accountCard}>
          <Text style={styles.accountName}>{account.name}</Text>
          <Text style={[
            styles.accountBalance,
            { color: account.current_balance >= 0 ? '#111827' : '#ef4444' }
          ]}>
            {formatMoney(account.current_balance)}
          </Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#3b82f6', padding: 20, paddingTop: 56,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  logout: { color: '#bfdbfe', fontSize: 14 },
  sectionTitle: {
    fontSize: 16, fontWeight: '600', color: '#374151',
    marginHorizontal: 16, marginTop: 20, marginBottom: 8
  },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  summaryLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  balanceCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginHorizontal: 16, marginTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  balanceLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  balanceValue: { fontSize: 24, fontWeight: '700' },
  accountCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginHorizontal: 16, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  accountName: { fontSize: 15, color: '#374151', fontWeight: '500' },
  accountBalance: { fontSize: 15, fontWeight: '600' },
})