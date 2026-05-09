import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, Alert, RefreshControl, useColorScheme, TouchableOpacity
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import api from '../lib/api'
import AccountModal from '../components/AccountModal'

interface Account {
  id: string
  name: string
  type: string
  current_balance: number
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

export default function AccountsScreen() {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const c = {
    bg:        dark ? '#0f172a' : '#f8fafc',
    card:      dark ? '#1e293b' : '#ffffff',
    title:     dark ? '#f1f5f9' : '#1e293b',
    sub:       dark ? '#94a3b8' : '#64748b',
    border:    dark ? '#334155' : '#f1f5f9',
    header:    dark ? '#1e3a8a' : '#1e40af',
    iconBg:    dark ? '#1e3a8a' : '#eff6ff',
    iconColor: dark ? '#93c5fd' : '#2563eb',
  }

  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [total, setTotal] = useState(0)
  const [modalVisible, setModalVisible] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await api.get('/api/accounts')
      const data = res.data.data || []
      setAccounts(data)
      setTotal(data.reduce((s: number, a: Account) => s + (a.current_balance || 0), 0))
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as contas.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => { setRefreshing(true); load() }

  const handleDelete = (account: Account) => {
    Alert.alert(
      'Excluir conta',
      `Deseja excluir a conta "${account.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/accounts/${account.id}`)
              load()
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir a conta.')
            }
          }
        }
      ]
    )
  }

  const typeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    if (type === 'savings') return 'save-outline'
    if (type === 'investment') return 'trending-up-outline'
    return 'wallet-outline'
  }

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
          <Text style={styles.headerTitle}>Contas</Text>
          <Text style={styles.headerSubtitle}>Saldo total: {formatMoney(total)}</Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>Nova</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="wallet-outline" size={48} color="#cbd5e1" />
            <Text style={[styles.emptyText, { color: c.sub }]}>Nenhuma conta cadastrada</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.icon, { backgroundColor: c.iconBg }]}>
              <Ionicons name={typeIcon(item.type)} size={18} color={c.iconColor} />
            </View>
            <Text style={[styles.name, { color: c.title }]}>{item.name}</Text>
            <Text style={[
              styles.balance,
              { color: item.current_balance >= 0 ? (dark ? '#4ade80' : '#16a34a') : '#ef4444' }
            ]}>
              {formatMoney(item.current_balance)}
            </Text>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              style={[styles.actionBtn, { backgroundColor: dark ? '#450a0a' : '#fef2f2' }]}
            >
              <Ionicons name="trash-outline" size={15} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      />

      <AccountModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => { setModalVisible(false); load() }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 80 },
  header: {
    paddingHorizontal: 20, paddingTop: 58, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  headerTitle:    { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSubtitle: { color: '#93c5fd', fontSize: 13, marginTop: 2 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  newBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText:  { fontSize: 15, fontWeight: '500' },
  card: {
    borderRadius: 12, marginBottom: 8, flexDirection: 'row',
    alignItems: 'center', padding: 14, gap: 12, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  icon:      { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  name:      { flex: 1, fontSize: 14, fontWeight: '500' },
  balance:   { fontSize: 14, fontWeight: '700' },
  actionBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
})