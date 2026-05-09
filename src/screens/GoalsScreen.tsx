import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, Modal,
  ActivityIndicator, Alert, RefreshControl,
  useColorScheme, TouchableOpacity, TextInput,
  Keyboard, ScrollView, Platform
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import api from '../lib/api'

interface Goal {
  id: string
  name: string
  target_amount_cents: number
  current_amount_cents: number
  deadline: string | null
  is_completed: boolean
}

interface Account {
  id: string
  name: string
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const formatDate = (d: string) => {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

const formatDateDisplay = (d: Date) => {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const parseCents = (val: string) => {
  const clean = val.replace(/\./g, '').replace(',', '.')
  const n = Math.round(parseFloat(clean) * 100)
  return isNaN(n) ? 0 : n
}

export default function GoalsScreen() {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const c = {
    bg: dark ? '#0f172a' : '#f8fafc',
    card: dark ? '#1e293b' : '#ffffff',
    title: dark ? '#f1f5f9' : '#1e293b',
    sub: dark ? '#94a3b8' : '#64748b',
    border: dark ? '#334155' : '#f1f5f9',
    header: dark ? '#1e3a8a' : '#1e40af',
    barBg: dark ? '#1e3a5f' : '#eff6ff',
    input: dark ? '#0f172a' : '#f1f5f9',
    inputBorder: dark ? '#334155' : '#e2e8f0',
    modalBg: dark ? '#1e293b' : '#ffffff',
    simBg: dark ? '#0f172a' : '#f0f9ff',
    simBorder: dark ? '#1e3a5f' : '#bae6fd',
    simText: dark ? '#38bdf8' : '#0369a1',
  }

  const [goals, setGoals] = useState<Goal[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [depositModal, setDepositModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositAccountId, setDepositAccountId] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)

  const [newModal, setNewModal] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newCurrent, setNewCurrent] = useState('')
  const [newDeadline, setNewDeadline] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [newLoading, setNewLoading] = useState(false)

  const [simMensal, setSimMensal] = useState('')
  const [simMeses, setSimMeses] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const [goalsRes, accRes] = await Promise.all([
        api.get('/api/goals'),
        api.get('/api/accounts'),
      ])
      setGoals(goalsRes.data.data || [])
      setAccounts(accRes.data.data || [])
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as metas.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => { setRefreshing(true); load() }

  const openDeposit = (goal: Goal) => {
    setSelectedGoal(goal)
    setDepositAmount('')
    setDepositAccountId(accounts[0]?.id || '')
    setDepositModal(true)
  }

  const handleDeposit = async () => {
    Keyboard.dismiss()
    const amount_cents = parseCents(depositAmount)
    if (amount_cents <= 0) { Alert.alert('Atenção', 'Valor inválido.'); return }
    setDepositLoading(true)
    try {
      await api.post(`/api/goals/${selectedGoal!.id}/deposit`, {
        amount_cents,
        account_id: depositAccountId || null,
      })
      setDepositModal(false)
      load()
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar o aporte.')
    } finally {
      setDepositLoading(false)
    }
  }

  const openNew = () => {
    setEditGoal(null)
    setNewName('')
    setNewTarget('')
    setNewCurrent('0')
    setNewDeadline(null)
    setSimMensal('')
    setSimMeses('')
    setNewModal(true)
  }

  const openEdit = (goal: Goal) => {
    setEditGoal(goal)
    setNewName(goal.name)
    setNewTarget((goal.target_amount_cents / 100).toFixed(2).replace('.', ','))
    setNewCurrent((goal.current_amount_cents / 100).toFixed(2).replace('.', ','))
    setNewDeadline(goal.deadline ? new Date(goal.deadline + 'T12:00:00') : null)
    setSimMensal('')
    setSimMeses('')
    setNewModal(true)
  }

  const handleSave = async () => {
    Keyboard.dismiss()
    if (!newName.trim()) { Alert.alert('Atenção', 'Informe o nome da meta.'); return }
    const target_amount_cents = parseCents(newTarget)
    const current_amount_cents = parseCents(newCurrent || '0')
    if (target_amount_cents <= 0) { Alert.alert('Atenção', 'Informe um valor alvo válido.'); return }
    setNewLoading(true)
    try {
      if (editGoal) {
        await api.put(`/api/goals/${editGoal.id}`, {
          name: newName.trim(),
          target_amount_cents,
          current_amount_cents,
          deadline: newDeadline ? toISO(newDeadline) : null,
        })
      } else {
        await api.post('/api/goals', {
          name: newName.trim(),
          target_amount_cents,
          current_amount_cents,
          deadline: newDeadline ? toISO(newDeadline) : null,
        })
      }
      setNewModal(false)
      load()
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a meta.')
    } finally {
      setNewLoading(false)
    }
  }

  const handleDelete = (goal: Goal) => {
    Alert.alert('Excluir meta', `Deseja excluir "${goal.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/api/goals/${goal.id}`)
            load()
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir.')
          }
        }
      }
    ])
  }

  const targetCents = parseCents(newTarget)
  const currentCents = parseCents(newCurrent || '0')
  const faltaCents = Math.max(targetCents - currentCents, 0)
  const simMensalCents = parseCents(simMensal)
  const simMesesNum = parseInt(simMeses) || 0
  const mesesParaAtingir = simMensalCents > 0 ? Math.ceil(faltaCents / simMensalCents) : null
  const valorPorMes = simMesesNum > 0 ? Math.ceil(faltaCents / simMesesNum) : null

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  const active = goals.filter(g => !g.is_completed)
  const completed = goals.filter(g => g.is_completed)

  const GoalCard = ({ item }: { item: Goal }) => {
    const pct = item.target_amount_cents > 0
      ? Math.min(100, Math.round((item.current_amount_cents / item.target_amount_cents) * 100))
      : 0
    const falta = Math.max(item.target_amount_cents - item.current_amount_cents, 0)
    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.cardTop}>
          <View style={[styles.icon, { backgroundColor: item.is_completed ? '#dcfce7' : c.barBg }]}>
            <Ionicons name={item.is_completed ? 'checkmark-circle' : 'trophy-outline'} size={18}
              color={item.is_completed ? '#22c55e' : '#8b5cf6'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.goalName, { color: c.title }]}>{item.name}</Text>
            {item.deadline && <Text style={[styles.goalSub, { color: c.sub }]}>Prazo: {formatDate(item.deadline)}</Text>}
          </View>
          <Text style={[styles.pct, { color: item.is_completed ? '#22c55e' : '#8b5cf6' }]}>{pct}%</Text>
        </View>

        <View style={[styles.barBg, { backgroundColor: c.barBg }]}>
          <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: item.is_completed ? '#22c55e' : '#8b5cf6' }]} />
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.footerText, { color: c.sub }]}>{formatMoney(item.current_amount_cents)} / {formatMoney(item.target_amount_cents)}</Text>
          <Text style={[styles.footerText, { color: c.sub }]}>{item.is_completed ? '🎉 Concluída' : `Falta: ${formatMoney(falta)}`}</Text>
        </View>

        <View style={styles.cardActions}>
          {!item.is_completed && (
            <TouchableOpacity style={styles.depositBtn} onPress={() => openDeposit(item)} activeOpacity={0.8}>
              <Ionicons name="add" size={14} color="#fff" />
              <Text style={styles.depositBtnText}>Aportar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.editBtn, { borderColor: c.border }]} onPress={() => openEdit(item)} activeOpacity={0.8}>
            <Ionicons name="pencil-outline" size={14} color={c.sub} />
            <Text style={[styles.editBtnText, { color: c.sub }]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { backgroundColor: c.header }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Metas</Text>
            <Text style={styles.headerSubtitle}>{goals.length} meta{goals.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openNew} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Nova</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={[...active, ...completed]}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        ListHeaderComponent={active.length > 0 ? (
          <Text style={[styles.sectionLabel, { color: c.sub }]}>EM ANDAMENTO ({active.length})</Text>
        ) : null}
        ListEmptyComponent={
          <View style={[styles.center, { paddingTop: 60 }]}>
            <Ionicons name="trophy-outline" size={48} color="#cbd5e1" />
            <Text style={[styles.emptyText, { color: c.sub }]}>Nenhuma meta cadastrada</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openNew}>
              <Text style={styles.emptyBtnText}>+ Criar primeira meta</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item, index }) => (
          <>
            {item.is_completed && index === active.length && (
              <Text style={[styles.sectionLabel, { color: c.sub, marginTop: 8 }]}>CONCLUÍDAS ({completed.length})</Text>
            )}
            <GoalCard item={item} />
          </>
        )}
      />

      {/* Modal aporte */}
      <Modal visible={depositModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { backgroundColor: c.modalBg }]}>
            <Text style={[styles.modalTitle, { color: c.title }]}>Registrar aporte</Text>
            {selectedGoal && <Text style={[styles.modalSub, { color: c.sub }]}>Meta: {selectedGoal.name}</Text>}

            {selectedGoal && (
              <View style={[styles.progressBox, { backgroundColor: c.input }]}>
                <View style={styles.progressRow}>
                  <Text style={[styles.progressText, { color: c.sub }]}>{formatMoney(selectedGoal.current_amount_cents)}</Text>
                  <Text style={[styles.progressText, { color: c.sub }]}>{formatMoney(selectedGoal.target_amount_cents)}</Text>
                </View>
                <View style={[styles.barBg, { backgroundColor: c.barBg, marginTop: 6 }]}>
                  <View style={[styles.barFill, {
                    width: `${Math.min(100, Math.round((selectedGoal.current_amount_cents / selectedGoal.target_amount_cents) * 100))}%` as any,
                    backgroundColor: '#8b5cf6'
                  }]} />
                </View>
                <Text style={[styles.progressSub, { color: c.sub }]}>
                  Falta: {formatMoney(Math.max(selectedGoal.target_amount_cents - selectedGoal.current_amount_cents, 0))}
                </Text>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: c.sub }]}>VALOR DO APORTE (R$)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.input, color: c.title, borderColor: c.inputBorder }]}
              value={depositAmount} onChangeText={setDepositAmount}
              placeholder="0,00" placeholderTextColor={c.sub}
              keyboardType="numeric" returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()} autoFocus
            />

            <Text style={[styles.inputLabel, { color: c.sub }]}>DESCONTAR DE QUAL CONTA?</Text>
            <View style={styles.accountList}>
              <TouchableOpacity
                style={[styles.accountChip, { backgroundColor: depositAccountId === '' ? '#2563eb' : c.input, borderColor: c.inputBorder }]}
                onPress={() => setDepositAccountId('')}
              >
                <Text style={{ color: depositAccountId === '' ? '#fff' : c.sub, fontSize: 12 }}>Nenhuma</Text>
              </TouchableOpacity>
              {accounts.map(acc => (
                <TouchableOpacity key={acc.id}
                  style={[styles.accountChip, { backgroundColor: depositAccountId === acc.id ? '#2563eb' : c.input, borderColor: c.inputBorder }]}
                  onPress={() => setDepositAccountId(acc.id)}
                >
                  <Text style={{ color: depositAccountId === acc.id ? '#fff' : c.sub, fontSize: 12 }}>{acc.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: c.inputBorder }]} onPress={() => { Keyboard.dismiss(); setDepositModal(false) }}>
                <Text style={{ color: c.sub }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, depositLoading && { opacity: 0.7 }]} onPress={handleDeposit} disabled={depositLoading}>
                {depositLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmText}>+ Aportar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal nova/editar meta */}
      <Modal visible={newModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalBox, { backgroundColor: c.modalBg }]}>
              <Text style={[styles.modalTitle, { color: c.title }]}>{editGoal ? 'Editar meta' : 'Nova meta'}</Text>

              <Text style={[styles.inputLabel, { color: c.sub }]}>NOME DA META</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.input, color: c.title, borderColor: c.inputBorder }]}
                value={newName} onChangeText={setNewName}
                placeholder="Ex: Viagem, Reserva de emergência..."
                placeholderTextColor={c.sub} returnKeyType="next" autoFocus
              />

              <Text style={[styles.inputLabel, { color: c.sub }]}>VALOR ALVO (R$)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.input, color: c.title, borderColor: c.inputBorder }]}
                value={newTarget} onChangeText={setNewTarget}
                placeholder="0,00" placeholderTextColor={c.sub}
                keyboardType="numeric" returnKeyType="next"
              />

              <Text style={[styles.inputLabel, { color: c.sub }]}>VALOR ATUAL (R$)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.input, color: c.title, borderColor: c.inputBorder }]}
                value={newCurrent} onChangeText={setNewCurrent}
                placeholder="0,00" placeholderTextColor={c.sub}
                keyboardType="numeric" returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <Text style={[styles.inputLabel, { color: c.sub }]}>PRAZO (OPCIONAL)</Text>
              <TouchableOpacity
                style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, justifyContent: 'center' }]}
                onPress={() => { Keyboard.dismiss(); setShowDatePicker(true) }}
              >
                <Text style={{ color: newDeadline ? c.title : c.sub, fontSize: 15 }}>
                  {newDeadline ? formatDateDisplay(newDeadline) : 'Sem prazo definido'}
                </Text>
              </TouchableOpacity>
              {newDeadline && (
                <TouchableOpacity onPress={() => setNewDeadline(null)} style={{ marginTop: 4 }}>
                  <Text style={{ color: '#ef4444', fontSize: 12 }}>✕ Remover prazo</Text>
                </TouchableOpacity>
              )}

              {/* ── DatePicker corrigido: spinner no iOS para respeitar pt-BR ── */}
              {showDatePicker && (
                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={newDeadline || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, date) => {
                      if (Platform.OS === 'android') setShowDatePicker(false)
                      if (date) setNewDeadline(date)
                    }}
                    minimumDate={new Date()}
                    themeVariant={dark ? 'dark' : 'light'}
                    locale="pt-BR"
                    style={{ width: '100%' }}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={styles.confirmDateBtn}
                    >
                      <Text style={styles.confirmDateText}>Confirmar data</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Simulação */}
              {targetCents > 0 && (
                <View style={[styles.simBox, { backgroundColor: c.simBg, borderColor: c.simBorder }]}>
                  <Text style={[styles.simTitle, { color: c.simText }]}>
                    SIMULAÇÃO — FALTAM {formatMoney(faltaCents)}
                  </Text>

                  <Text style={[styles.inputLabel, { color: c.sub, marginTop: 8 }]}>SE EU GUARDAR POR MÊS (R$)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.input, color: c.title, borderColor: c.inputBorder }]}
                    value={simMensal} onChangeText={setSimMensal}
                    placeholder="Ex: 500,00" placeholderTextColor={c.sub}
                    keyboardType="numeric" returnKeyType="done"
                  />
                  {mesesParaAtingir !== null && simMensalCents > 0 && (
                    <Text style={[styles.simResult, { color: c.simText }]}>
                      → Você atingirá a meta em {mesesParaAtingir} {mesesParaAtingir === 1 ? 'mês' : 'meses'}
                    </Text>
                  )}

                  <Text style={[styles.inputLabel, { color: c.sub, marginTop: 8 }]}>SE EU QUERO ATINGIR EM (MESES)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.input, color: c.title, borderColor: c.inputBorder }]}
                    value={simMeses} onChangeText={setSimMeses}
                    placeholder="Ex: 12" placeholderTextColor={c.sub}
                    keyboardType="numeric" returnKeyType="done"
                  />
                  {valorPorMes !== null && simMesesNum > 0 && (
                    <Text style={[styles.simResult, { color: c.simText }]}>
                      → Você precisa guardar {formatMoney(valorPorMes)} por mês
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: c.inputBorder }]}
                  onPress={() => { Keyboard.dismiss(); setNewModal(false) }}
                >
                  <Text style={{ color: c.sub }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, newLoading && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={newLoading}
                >
                  {newLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmText}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  header: { paddingHorizontal: 20, paddingTop: 58, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSubtitle: { color: '#93c5fd', fontSize: 13, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  emptyBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '600' },
  card: {
    borderRadius: 12, marginBottom: 12, padding: 14, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  icon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  goalName: { fontSize: 14, fontWeight: '600' },
  goalSub: { fontSize: 12, marginTop: 1 },
  pct: { fontSize: 15, fontWeight: '700' },
  barBg: { height: 6, borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  barFill: { height: 6, borderRadius: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  footerText: { fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  depositBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 8,
  },
  depositBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1,
  },
  editBtnText: { fontSize: 13 },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fef2f2',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalBox: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  modalSub: { fontSize: 13, marginBottom: 16 },
  progressBox: { borderRadius: 10, padding: 12, marginBottom: 16 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 12, fontWeight: '500' },
  progressSub: { fontSize: 11, marginTop: 6 },
  inputLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 4 },
  accountList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  accountChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  // ── picker ──
  pickerWrap: { marginTop: 8, marginBottom: 4 },
  confirmDateBtn: {
    marginTop: 8, padding: 12, backgroundColor: '#3b82f6',
    borderRadius: 8, alignItems: 'center',
  },
  confirmDateText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // ── sim ──
  simBox: { borderRadius: 10, padding: 14, marginTop: 16, borderWidth: 1 },
  simTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  simResult: { fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 4 },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', backgroundColor: '#2563eb' },
  confirmText: { color: '#fff', fontWeight: '700' },
})