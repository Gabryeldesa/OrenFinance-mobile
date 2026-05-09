import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl, useColorScheme, StatusBar
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import OrenLogo from '../components/OrenLogo'
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

interface Transaction {
  id: string
  description: string
  amount_cents: number
  type: 'income' | 'expense'
  date: string
  categories: { name: string; icon?: string } | null
}

interface CategoryTotal {
  name: string
  total: number
  icon?: string
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const getMonthLabel = () =>
  new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

export default function DashboardScreen({ onLogout }: any) {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'

  const c = {
    bg:      isDark ? '#0f172a' : '#f8fafc',
    card:    isDark ? '#1e293b' : '#ffffff',
    title:   isDark ? '#f1f5f9' : '#1e293b',
    sub:     isDark ? '#94a3b8' : '#64748b',
    border:  isDark ? '#334155' : '#e2e8f0',
    header:  isDark ? '#1e293b' : '#1e40af',
    accent:  '#2563eb',
    success: '#22c55e',
    danger:  '#ef4444',
  }

  const [summary, setSummary]               = useState<Summary | null>(null)
  const [accounts, setAccounts]             = useState<Account[]>([])
  const [recentTxs, setRecentTxs]           = useState<Transaction[]>([])
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([])
  const [loading, setLoading]               = useState(true)
  const [refreshing, setRefreshing]         = useState(false)

  const loadData = useCallback(async () => {
    try {
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const [summaryRes, accountsRes, txsRes] = await Promise.all([
        api.get(`/api/transactions/summary?month=${month}`),
        api.get('/api/accounts'),
        api.get(`/api/transactions?month=${month}&limit=5&sort=date&order=desc`),
      ])

      setSummary(summaryRes.data.data)
      setAccounts(Array.isArray(accountsRes.data.data) ? accountsRes.data.data : [])

      const txsRaw = txsRes.data?.data
      const txs: Transaction[] = Array.isArray(txsRaw) ? txsRaw : []
      setRecentTxs(txs)

      const catMap: Record<string, CategoryTotal> = {}
      for (const tx of txs) {
        if (tx.type !== 'expense') continue
        const name = tx.categories?.name || 'Sem categoria'
        if (!catMap[name]) catMap[name] = { name, total: 0 }
        catMap[name].total += tx.amount_cents
      }
      setCategoryTotals(Object.values(catMap).sort((a, b) => b.total - a.total).slice(0, 5))

    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os dados.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Recarrega toda vez que a tela recebe foco (inclusive após impersonation)
  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      loadData()
    }, [loadData])
  )

  const onRefresh = () => { setRefreshing(true); loadData() }

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem('token')
          onLogout()
        }
      }
    ])
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    )
  }

  const totalBalance = accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0)
  const maxCat = categoryTotals[0]?.total || 1

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
    >
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { backgroundColor: c.header }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoWrap}>
            <OrenLogo size={24} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Oren Finance</Text>
            <Text style={styles.headerSubtitle}>{getMonthLabel()}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: c.card }]}>
            <Text style={[styles.cardLabel, { color: c.sub }]}>Receitas</Text>
            <Text style={[styles.cardValue, { color: c.success }]}>{formatMoney(summary?.income || 0)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: c.card }]}>
            <Text style={[styles.cardLabel, { color: c.sub }]}>Despesas</Text>
            <Text style={[styles.cardValue, { color: c.danger }]}>{formatMoney(summary?.expense || 0)}</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: c.card }]}>
            <Text style={[styles.cardLabel, { color: c.sub }]}>Saldo Mês</Text>
            <Text style={[styles.cardValue, { color: (summary?.balance || 0) >= 0 ? c.success : c.danger }]}>
              {formatMoney(summary?.balance || 0)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: c.card }]}>
            <Text style={[styles.cardLabel, { color: c.sub }]}>Total Contas</Text>
            <Text style={[styles.cardValue, { color: totalBalance >= 0 ? c.accent : c.danger }]}>
              {formatMoney(totalBalance)}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: c.title }]}>Transações recentes</Text>
        <View style={[styles.listCard, { backgroundColor: c.card, borderColor: c.border }]}>
          {recentTxs.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.sub }]}>Nenhuma transação.</Text>
          ) : (
            recentTxs.map((tx, idx) => (
              <View key={tx.id}>
                <View style={styles.txRow}>
                  <View style={[styles.txIndicator, { backgroundColor: tx.type === 'income' ? c.success : c.danger }]} />
                  <View style={styles.txBody}>
                    <Text style={[styles.txDesc, { color: c.title }]} numberOfLines={1}>{tx.description}</Text>
                    <Text style={[styles.txMeta, { color: c.sub }]}>{formatDate(tx.date)}</Text>
                  </View>
                  <Text style={[styles.txValue, { color: tx.type === 'income' ? c.success : c.danger }]}>
                    {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount_cents)}
                  </Text>
                </View>
                {idx < recentTxs.length - 1 && <View style={[styles.divider, { backgroundColor: c.border }]} />}
              </View>
            ))
          )}
        </View>

        {categoryTotals.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: c.title }]}>Gastos por categoria</Text>
            <View style={[styles.listCard, { backgroundColor: c.card, borderColor: c.border, padding: 16 }]}>
              {categoryTotals.map((cat, idx) => (
                <View key={cat.name} style={{ marginBottom: idx < categoryTotals.length - 1 ? 16 : 0 }}>
                  <View style={styles.catHeader}>
                    <Text style={[styles.catName, { color: c.title }]}>{cat.name}</Text>
                    <Text style={[styles.catValue, { color: c.title }]}>{formatMoney(cat.total)}</Text>
                  </View>
                  <View style={[styles.barBg, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                    <View style={[styles.barFill, { width: `${(cat.total / maxCat) * 100}%`, backgroundColor: c.accent }]} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1e40af',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle:    { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textTransform: 'capitalize' },
  logoutBtn:      { padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  body:           { paddingHorizontal: 16, paddingTop: 20 },
  summaryGrid:    { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: {
    flex: 1, padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  cardLabel:    { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  cardValue:    { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 12 },
  listCard:     { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  emptyText:    { padding: 20, textAlign: 'center' },
  txRow:        { flexDirection: 'row', alignItems: 'center', padding: 14 },
  txIndicator:  { width: 4, height: 30, borderRadius: 2, marginRight: 12 },
  txBody:       { flex: 1 },
  txDesc:       { fontSize: 14, fontWeight: '600' },
  txMeta:       { fontSize: 12, marginTop: 2 },
  txValue:      { fontSize: 14, fontWeight: '700' },
  divider:      { height: 1 },
  catHeader:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catName:      { fontSize: 13, fontWeight: '500' },
  catValue:     { fontSize: 13, fontWeight: '600' },
  barBg:        { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 3 },
})