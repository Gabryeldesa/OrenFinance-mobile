import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, Alert, RefreshControl, useColorScheme, TouchableOpacity
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import api from '../lib/api'
import RecurringModal from '../components/RecurringModal'

interface RecurringRule {
  id: string
  description: string
  amount_cents: number
  type: string
  day_of_month: number
  is_active: boolean
  credit_card_id: string | null
  categories?: { name: string }
  accounts?: { name: string }
  credit_cards?: { name: string }
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

export default function RecurringScreen() {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const c = {
    bg:     dark ? '#0f172a' : '#f8fafc',
    card:   dark ? '#1e293b' : '#ffffff',
    title:  dark ? '#f1f5f9' : '#1e293b',
    sub:    dark ? '#94a3b8' : '#64748b',
    border: dark ? '#334155' : '#f1f5f9',
    header: dark ? '#1e3a8a' : '#1e40af',
  }

  const [rules, setRules] = useState<RecurringRule[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editRule, setEditRule] = useState<RecurringRule | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await api.get('/api/recurring')
      setRules(res.data.data || [])
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os recorrentes.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => { setRefreshing(true); load() }

  const handleNew = () => { setEditRule(null); setModalVisible(true) }
  const handleEdit = (rule: RecurringRule) => { setEditRule(rule); setModalVisible(true) }

  const handleDelete = (rule: RecurringRule) => {
    Alert.alert(
      'Excluir regra',
      `Deseja excluir "${rule.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/recurring/${rule.id}`)
              load()
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir.')
            }
          }
        }
      ]
    )
  }

  const handleToggle = async (rule: RecurringRule) => {
    try {
      await api.put(`/api/recurring/${rule.id}`, { is_active: !rule.is_active })
      load()
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar.')
    }
  }

  const handleApply = () => {
    Alert.alert(
      'Aplicar este mês',
      'Isso vai criar as transações recorrentes do mês atual que ainda não foram lançadas. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aplicar', onPress: async () => {
            setApplying(true)
            try {
              await api.post('/api/recurring/apply')
              Alert.alert('Sucesso', 'Transações criadas com sucesso!')
              load()
            } catch {
              Alert.alert('Erro', 'Não foi possível aplicar os recorrentes.')
            } finally {
              setApplying(false)
            }
          }
        }
      ]
    )
  }

  const active = rules.filter(r => r.is_active)
  const inactive = rules.filter(r => !r.is_active)

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  const renderRule = (rule: RecurringRule) => (
    <View key={rule.id} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.cardMain}>
        <View style={[styles.bar, { backgroundColor: rule.type === 'income' ? '#22c55e' : '#ef4444' }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: c.title }]}>{rule.description}</Text>
          <Text style={[styles.cardSub, { color: c.sub }]}>
            Todo dia {rule.day_of_month}
            {rule.categories ? ` · ${rule.categories.name}` : ''}
            {rule.accounts ? ` · ${rule.accounts.name}` : ''}
            {rule.credit_cards ? ` · 💳 ${rule.credit_cards.name}` : ''}
          </Text>
        </View>
        <Text style={[
          styles.cardAmount,
          { color: rule.type === 'income' ? (dark ? '#4ade80' : '#16a34a') : '#ef4444' }
        ]}>
          {rule.type === 'income' ? '+' : '-'}{formatMoney(rule.amount_cents)}
        </Text>
      </View>

      <View style={[styles.cardActions, { borderTopColor: c.border }]}>
        <TouchableOpacity onPress={() => handleToggle(rule)} style={styles.actionBtn}>
          <Ionicons
            name={rule.is_active ? 'pause-outline' : 'play-outline'}
            size={14}
            color={rule.is_active ? '#f59e0b' : '#22c55e'}
          />
          <Text style={{ color: rule.is_active ? '#f59e0b' : '#22c55e', fontSize: 12, fontWeight: '600' }}>
            {rule.is_active ? 'Pausar' : 'Ativar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleEdit(rule)} style={styles.actionBtn}>
          <Ionicons name="pencil-outline" size={14} color={c.sub} />
          <Text style={{ color: c.sub, fontSize: 12, fontWeight: '600' }}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(rule)} style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={14} color="#ef4444" />
          <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>

      <View style={[styles.header, { backgroundColor: c.header }]}>
        <View>
          <Text style={styles.headerTitle}>Recorrentes</Text>
          <Text style={styles.headerSubtitle}>Despesas e receitas fixas mensais</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={handleNew} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>Nova</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={null}
        renderItem={null}
        ListHeaderComponent={
          <>
            <TouchableOpacity
              style={[styles.applyBtn, { borderColor: c.border, backgroundColor: c.card }]}
              onPress={handleApply}
              disabled={applying}
            >
              {applying
                ? <ActivityIndicator size="small" color="#3b82f6" />
                : <>
                    <Ionicons name="play-circle-outline" size={18} color="#3b82f6" />
                    <Text style={styles.applyText}>Aplicar este mês</Text>
                  </>
              }
            </TouchableOpacity>

            {rules.length === 0 ? (
              <View style={styles.center}>
                <Ionicons name="repeat-outline" size={48} color={dark ? '#334155' : '#cbd5e1'} />
                <Text style={[styles.emptyText, { color: c.sub }]}>Nenhuma regra cadastrada</Text>
              </View>
            ) : (
              <>
                {active.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: c.sub }]}>ATIVAS ({active.length})</Text>
                    {active.map(renderRule)}
                  </>
                )}
                {inactive.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: c.sub, marginTop: 20 }]}>
                      PAUSADAS ({inactive.length})
                    </Text>
                    <View style={{ opacity: 0.6 }}>
                      {inactive.map(renderRule)}
                    </View>
                  </>
                )}
              </>
            )}
          </>
        }
      />

      <RecurringModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setEditRule(null) }}
        onSuccess={() => { setModalVisible(false); setEditRule(null); load() }}
        editRule={editRule}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 80 },
  header:         { paddingHorizontal: 20, paddingTop: 58, paddingBottom: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerTitle:    { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSubtitle: { color: '#93c5fd', fontSize: 13, marginTop: 2 },
  newBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  newBtnText:     { color: '#fff', fontSize: 14, fontWeight: '600' },
  applyBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  applyText:      { color: '#3b82f6', fontSize: 14, fontWeight: '700' },
  sectionTitle:   { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  emptyText:      { fontSize: 15, fontWeight: '500' },
  card:           { borderRadius: 12, marginBottom: 10, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardMain:       { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  bar:            { width: 4, height: '100%', borderRadius: 2, minHeight: 40 },
  cardTitle:      { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardSub:        { fontSize: 12 },
  cardAmount:     { fontSize: 14, fontWeight: '800' },
  cardActions:    { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 8, paddingHorizontal: 14 },
  actionBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4 },
})