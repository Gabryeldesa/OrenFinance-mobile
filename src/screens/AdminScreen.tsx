import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, useColorScheme, Modal, FlatList, RefreshControl,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import api from '../lib/api'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface User {
  id: string
  email: string
  name: string
  is_admin: boolean
  is_blocked: boolean
  created_at: string
  last_sign_in: string | null
}

interface UserData {
  accounts: Array<{ id: string; name: string; current_balance: number }>
  transactions: Array<{
    id: string; description: string; amount_cents: number
    type: string; date: string; categories?: { name: string }
  }>
  goals: Array<{
    id: string; name: string
    target_amount_cents: number; current_amount_cents: number
  }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const formatDateDisplay = (d: string) => {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

const formatDateTime = (iso: string | null) => {
  if (!iso) return 'Nunca'
  const d = new Date(iso)
  const day   = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year  = d.getFullYear()
  const h     = String(d.getHours()).padStart(2, '0')
  const min   = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${h}:${min}`
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function AdminScreen({
  navigation,
  onImpersonate,
}: {
  navigation: any
  onImpersonate?: (email: string) => void
}) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  const [users, setUsers]         = useState<User[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]         = useState('')

  const [modalVisible, setModalVisible] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userData, setUserData]         = useState<UserData | null>(null)
  const [loadingData, setLoadingData]   = useState(false)

  const c = {
    bg:     dark ? '#111827' : '#f3f4f6',
    card:   dark ? '#1f2937' : '#ffffff',
    text:   dark ? '#f9fafb' : '#111827',
    sub:    dark ? '#9ca3af' : '#6b7280',
    border: dark ? '#374151' : '#e5e7eb',
  }

  // ── Carregar usuários ────────────────────────────────────────────────────
  const loadUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/admin/users')
      setUsers(res.data?.data || [])
    } catch {
      setError('Acesso negado ou erro ao carregar usuários.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  // ── Abrir detalhes ───────────────────────────────────────────────────────
  const openUser = async (user: User) => {
    setSelectedUser(user)
    setUserData(null)
    setModalVisible(true)
    setLoadingData(true)
    try {
      const res = await api.get(`/api/admin/users/${user.id}/data`)
      setUserData(res.data?.data || null)
    } catch {
      setUserData(null)
    } finally {
      setLoadingData(false)
    }
  }

  // ── Impersonation ────────────────────────────────────────────────────────
  const handleImpersonate = (user: User) => {
    Alert.alert(
      'Acessar como usuário',
      `Navegar como ${user.email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Acessar',
          onPress: async () => {
            await AsyncStorage.multiSet([
              ['impersonate_id',    user.id],
              ['impersonate_email', user.email],
            ])
            setModalVisible(false)
            setTimeout(() => onImpersonate?.(user.email), 300)
          },
        },
      ]
    )
  }

  // ── Bloquear / desbloquear ───────────────────────────────────────────────
  const handleBlock = (user: User) => {
    const action = user.is_blocked ? 'desbloquear' : 'bloquear'
    Alert.alert(
      `${user.is_blocked ? 'Desbloquear' : 'Bloquear'} usuário`,
      `Deseja ${action} ${user.email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: user.is_blocked ? 'Desbloquear' : 'Bloquear',
          style: user.is_blocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/api/admin/users/${user.id}/block`, { is_blocked: !user.is_blocked })
              const updated = { ...user, is_blocked: !user.is_blocked }
              setSelectedUser(updated)
              setUsers(prev => prev.map(u => u.id === user.id ? updated : u))
            } catch {
              Alert.alert('Erro', 'Não foi possível atualizar o usuário.')
            }
          },
        },
      ]
    )
  }

  // ── Excluir ──────────────────────────────────────────────────────────────
  const handleDelete = (user: User) => {
    Alert.alert(
      'Excluir usuário',
      `Excluir permanentemente ${user.email}? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/users/${user.id}`)
              setModalVisible(false)
              setSelectedUser(null)
              setUserData(null)
              loadUsers()
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir o usuário.')
            }
          },
        },
      ]
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.container, { backgroundColor: c.bg }]}>

      {error ? (
        <View style={[s.errorBox, { backgroundColor: dark ? '#3b0000' : '#fef2f2', borderColor: '#ef4444' }]}>
          <Ionicons name="lock-closed-outline" size={16} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#2563eb" size="large" />
          <Text style={[s.loadingText, { color: c.sub }]}>Carregando usuários...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => u.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadUsers(true)} tintColor="#2563eb" />
          }
          ListHeaderComponent={
            <View style={[s.headerCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={s.headerRow}>
                <View style={[s.iconWrap, { backgroundColor: dark ? '#1e3a5f' : '#dbeafe' }]}>
                  <Ionicons name="shield-checkmark-outline" size={22} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.headerTitle, { color: c.text }]}>Painel Admin</Text>
                  <Text style={[s.headerSub, { color: c.sub }]}>{users.length} usuário(s) no sistema</Text>
                </View>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.userCard, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => openUser(item)}
              activeOpacity={0.7}
            >
              <View style={[s.avatarWrap, { backgroundColor: item.is_admin ? '#dbeafe' : (dark ? '#374151' : '#f3f4f6') }]}>
                <Ionicons
                  name={item.is_admin ? 'shield-checkmark' : 'person'}
                  size={18}
                  color={item.is_admin ? '#2563eb' : c.sub}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.userEmail, { color: c.text }]} numberOfLines={1}>{item.email}</Text>
                <Text style={[s.userDate, { color: c.sub }]}>
                  Criado em {formatDateDisplay(item.created_at.split('T')[0])}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                {item.is_admin && (
                  <View style={s.badgeAdmin}><Text style={s.badgeAdminText}>Admin</Text></View>
                )}
                {item.is_blocked && (
                  <View style={s.badgeBlocked}><Text style={s.badgeBlockedText}>Bloqueado</Text></View>
                )}
                <Ionicons name="chevron-forward" size={16} color={c.sub} />
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* ── Modal de detalhes ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[s.modal, { backgroundColor: c.bg }]}>

          <View style={[s.modalHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={s.backBtn}>
              <Ionicons name="chevron-down" size={22} color={c.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: c.text }]} numberOfLines={1}>
              {selectedUser?.email}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

            {/* Info do usuário */}
            {selectedUser && (
              <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={s.userInfoRow}>
                  <View style={[s.avatarLg, { backgroundColor: selectedUser.is_admin ? '#dbeafe' : (dark ? '#374151' : '#f3f4f6') }]}>
                    <Ionicons
                      name={selectedUser.is_admin ? 'shield-checkmark' : 'person'}
                      size={28}
                      color={selectedUser.is_admin ? '#2563eb' : c.sub}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.userEmailLg, { color: c.text }]} numberOfLines={1}>{selectedUser.email}</Text>
                    <Text style={[s.userMeta, { color: c.sub }]}>Criado: {formatDateTime(selectedUser.created_at)}</Text>
                    <Text style={[s.userMeta, { color: c.sub }]}>Último acesso: {formatDateTime(selectedUser.last_sign_in)}</Text>
                    <Text style={[s.userMeta, { color: c.sub }]} numberOfLines={1}>ID: {selectedUser.id}</Text>
                  </View>
                </View>

                {/* Badges */}
                <View style={[s.badgeRow, { borderTopColor: c.border }]}>
                  {selectedUser.is_admin && (
                    <View style={s.badgeAdmin}><Text style={s.badgeAdminText}>Administrador</Text></View>
                  )}
                  {selectedUser.is_blocked && (
                    <View style={s.badgeBlocked}><Text style={s.badgeBlockedText}>Bloqueado</Text></View>
                  )}
                  {!selectedUser.is_admin && !selectedUser.is_blocked && (
                    <View style={[s.badgeOk, { backgroundColor: dark ? '#064e3b' : '#d1fae5' }]}>
                      <Text style={[s.badgeOkText, { color: '#10b981' }]}>Ativo</Text>
                    </View>
                  )}
                </View>

                {/* Ações — só para não-admins */}
                {!selectedUser.is_admin && (
                  <View style={[s.actionsRow, { borderTopColor: c.border }]}>

                    {/* Acessar conta */}
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: dark ? '#1e3a5f' : '#dbeafe' }]}
                      onPress={() => handleImpersonate(selectedUser)}
                    >
                      <Ionicons name="person-outline" size={15} color="#2563eb" style={{ marginRight: 6 }} />
                      <Text style={[s.actionBtnText, { color: '#2563eb' }]}>Acessar</Text>
                    </TouchableOpacity>

                    {/* Bloquear / Desbloquear */}
                    <TouchableOpacity
                      style={[s.actionBtn, {
                        backgroundColor: selectedUser.is_blocked
                          ? (dark ? '#064e3b' : '#d1fae5')
                          : (dark ? '#451a03' : '#fef3c7'),
                      }]}
                      onPress={() => handleBlock(selectedUser)}
                    >
                      <Ionicons
                        name={selectedUser.is_blocked ? 'lock-open-outline' : 'lock-closed-outline'}
                        size={15}
                        color={selectedUser.is_blocked ? '#10b981' : '#f59e0b'}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[s.actionBtnText, { color: selectedUser.is_blocked ? '#10b981' : '#f59e0b' }]}>
                        {selectedUser.is_blocked ? 'Desbloquear' : 'Bloquear'}
                      </Text>
                    </TouchableOpacity>

                    {/* Excluir */}
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: dark ? '#3b0000' : '#fef2f2' }]}
                      onPress={() => handleDelete(selectedUser)}
                    >
                      <Ionicons name="trash-outline" size={15} color="#ef4444" style={{ marginRight: 6 }} />
                      <Text style={[s.actionBtnText, { color: '#ef4444' }]}>Excluir</Text>
                    </TouchableOpacity>

                  </View>
                )}
              </View>
            )}

            {/* Dados financeiros */}
            {loadingData ? (
              <View style={[s.section, { backgroundColor: c.card, borderColor: c.border, alignItems: 'center', paddingVertical: 32 }]}>
                <ActivityIndicator color="#2563eb" />
                <Text style={[s.loadingText, { color: c.sub }]}>Carregando dados...</Text>
              </View>
            ) : userData ? (
              <>
                {/* Contas */}
                <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[s.sectionTitle, { color: c.text }]}>Contas ({userData.accounts.length})</Text>
                  {userData.accounts.length === 0 ? (
                    <Text style={[s.empty, { color: c.sub }]}>Nenhuma conta</Text>
                  ) : userData.accounts.map(acc => (
                    <View key={acc.id} style={[s.dataRow, { borderBottomColor: c.border }]}>
                      <Text style={[s.dataLabel, { color: c.text }]}>{acc.name}</Text>
                      <Text style={[s.dataValue, { color: (acc.current_balance || 0) >= 0 ? c.text : '#ef4444' }]}>
                        {formatMoney(acc.current_balance || 0)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Metas */}
                <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[s.sectionTitle, { color: c.text }]}>Metas ({userData.goals.length})</Text>
                  {userData.goals.length === 0 ? (
                    <Text style={[s.empty, { color: c.sub }]}>Nenhuma meta</Text>
                  ) : userData.goals.map(goal => {
                    const pct = goal.target_amount_cents > 0
                      ? Math.min(Math.round((goal.current_amount_cents / goal.target_amount_cents) * 100), 100)
                      : 0
                    return (
                      <View key={goal.id} style={[s.goalRow, { borderBottomColor: c.border }]}>
                        <View style={s.goalTop}>
                          <Text style={[s.dataLabel, { color: c.text }]} numberOfLines={1}>{goal.name}</Text>
                          <Text style={[s.goalPct, { color: c.sub }]}>{pct}%</Text>
                        </View>
                        <View style={[s.progressBg, { backgroundColor: dark ? '#374151' : '#e5e7eb' }]}>
                          <View style={[s.progressFill, { width: `${pct}%` as any }]} />
                        </View>
                        <Text style={[s.goalAmounts, { color: c.sub }]}>
                          {formatMoney(goal.current_amount_cents)} / {formatMoney(goal.target_amount_cents)}
                        </Text>
                      </View>
                    )
                  })}
                </View>

                {/* Transações */}
                <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[s.sectionTitle, { color: c.text }]}>Últimas transações ({userData.transactions.length})</Text>
                  {userData.transactions.length === 0 ? (
                    <Text style={[s.empty, { color: c.sub }]}>Nenhuma transação</Text>
                  ) : userData.transactions.map(tx => (
                    <View key={tx.id} style={[s.txRow, { borderBottomColor: c.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.dataLabel, { color: c.text }]} numberOfLines={1}>{tx.description}</Text>
                        <Text style={[s.txMeta, { color: c.sub }]}>
                          {formatDateDisplay(tx.date)}{tx.categories ? ` · ${tx.categories.name}` : ''}
                        </Text>
                      </View>
                      <Text style={[s.txAmount, { color: tx.type === 'income' ? '#10b981' : '#ef4444' }]}>
                        {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount_cents)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

          </ScrollView>
        </View>
      </Modal>

    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:    { flex: 1 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText:  { marginTop: 12, fontSize: 14 },

  errorBox:  { flexDirection: 'row', alignItems: 'center', margin: 16, padding: 14, borderRadius: 10, borderWidth: 1 },
  errorText: { color: '#ef4444', fontSize: 14, flex: 1 },

  headerCard:  { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap:    { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub:   { fontSize: 13, marginTop: 2 },

  userCard:   { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  userEmail:  { fontSize: 14, fontWeight: '600' },
  userDate:   { fontSize: 12, marginTop: 2 },

  badgeAdmin:       { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeAdminText:   { color: '#2563eb', fontSize: 11, fontWeight: '700' },
  badgeBlocked:     { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeBlockedText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
  badgeOk:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeOkText:      { fontSize: 11, fontWeight: '700' },

  modal:       { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1 },
  backBtn:     { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  modalTitle:  { flex: 1, fontSize: 15, fontWeight: '600', textAlign: 'center' },

  section:      { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  empty:        { fontSize: 13, fontStyle: 'italic' },

  userInfoRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatarLg:    { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  userEmailLg: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  userMeta:    { fontSize: 12, lineHeight: 18 },

  badgeRow:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingTop: 12, marginTop: 12, borderTopWidth: 1 },
  actionsRow: { flexDirection: 'row', gap: 8, paddingTop: 12, marginTop: 4, borderTopWidth: 1 },
  actionBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },

  dataRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  dataLabel: { fontSize: 14, flex: 1, marginRight: 8 },
  dataValue: { fontSize: 14, fontWeight: '600' },

  goalRow:      { paddingVertical: 10, borderBottomWidth: 1 },
  goalTop:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalPct:      { fontSize: 12 },
  progressBg:   { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: 6, backgroundColor: '#2563eb', borderRadius: 3 },
  goalAmounts:  { fontSize: 11 },

  txRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  txMeta:   { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700', flexShrink: 0 },
})