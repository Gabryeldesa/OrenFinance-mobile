import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, Modal, ScrollView,
  ActivityIndicator, Alert, RefreshControl, useColorScheme, TouchableOpacity
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import api from '../lib/api'
import CardModal from '../components/CardModal'

interface Invoice {
  id: string
  total_cents: number
  due_date: string
  closing_date: string
  reference_month: string
  status: 'open' | 'paid' | 'preview' | 'closed'
}

interface Card {
  id: string
  name: string
  limit_cents: number
  used_limit_cents: number
  available_limit_cents: number
  closing_day: number
  due_day: number
  account_id: string | null
  current_invoice: Invoice | null
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const formatDateShort = (dateStr: string) => {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const formatMonthYear = (dateStr: string) => {
  if (!dateStr) return ''
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const [y, m] = dateStr.split('-')
  return `${months[parseInt(m) - 1]} de ${y}`
}

const STATUS_LABEL: Record<string, string> = {
  open:    'Aberta',
  paid:    'Paga',
  preview: 'Prevista',
  closed:  'Fechada',
}
const STATUS_COLOR: Record<string, string> = {
  open:    '#f59e0b',
  paid:    '#22c55e',
  preview: '#94a3b8',
  closed:  '#6366f1',
}

export default function CardsScreen() {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const c = {
    bg:      dark ? '#0f172a' : '#f8fafc',
    card:    dark ? '#1e293b' : '#ffffff',
    title:   dark ? '#f1f5f9' : '#1e293b',
    sub:     dark ? '#94a3b8' : '#64748b',
    border:  dark ? '#334155' : '#f1f5f9',
    header:  dark ? '#1e3a8a' : '#1e40af',
    bar:     dark ? '#334155' : '#e2e8f0',
    invoice: dark ? '#0f172a' : '#f8fafc',
  }

  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editCard, setEditCard] = useState<Card | null>(null)
  const [invoicesCard, setInvoicesCard] = useState<Card | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await api.get('/api/cards')
      setCards(res.data.data || [])
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os cartões.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => { setRefreshing(true); load() }

  const handleDelete = (card: Card) => {
    Alert.alert(
      'Excluir cartão',
      `Deseja excluir o cartão "${card.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/cards/${card.id}`)
              load()
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir o cartão.')
            }
          }
        }
      ]
    )
  }

  const handleEdit = (card: Card) => {
    setEditCard(card)
    setModalVisible(true)
  }

  const handleNew = () => {
    setEditCard(null)
    setModalVisible(true)
  }

  const handleViewInvoices = async (card: Card) => {
    setInvoicesCard(card)
    setInvoicesLoading(true)
    try {
      const res = await api.get(`/api/cards/${card.id}/invoices`)
      setInvoices(res.data.data || [])
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as faturas.')
    } finally {
      setInvoicesLoading(false)
    }
  }

  const handlePayInvoice = async (invoiceId: string) => {
    if (!invoicesCard) return
    Alert.alert(
      'Pagar fatura',
      'Confirma o pagamento desta fatura?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar', onPress: async () => {
            setPayingId(invoiceId)
            try {
              await api.post(`/api/cards/${invoicesCard.id}/invoices/${invoiceId}/pay`)
              const res = await api.get(`/api/cards/${invoicesCard.id}/invoices`)
              setInvoices(res.data.data || [])
              load()
            } catch {
              Alert.alert('Erro', 'Não foi possível pagar a fatura.')
            } finally {
              setPayingId(null)
            }
          }
        }
      ]
    )
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
          <Text style={styles.headerTitle}>Cartões</Text>
          <Text style={styles.headerSubtitle}>
            {cards.length} cartão{cards.length !== 1 ? 'ões' : ''} cadastrado{cards.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={handleNew} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>Novo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cards}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="card-outline" size={48} color={dark ? '#334155' : '#cbd5e1'} />
            <Text style={[styles.emptyText, { color: c.sub }]}>Nenhum cartão cadastrado</Text>
          </View>
        }
        renderItem={({ item }) => {
          const used = item.used_limit_cents ?? 0
          const available = item.available_limit_cents ?? (item.limit_cents - used)
          const pct = item.limit_cents > 0
            ? Math.min(100, Math.round((used / item.limit_cents) * 100))
            : 0
          const barColor = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#3b82f6'
          const inv = item.current_invoice

          return (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>

              <View style={styles.cardTop}>
                <View style={[styles.iconWrap, { backgroundColor: dark ? '#1e3a5f' : '#eff6ff' }]}>
                  <Ionicons name="card-outline" size={20} color="#3b82f6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardName, { color: c.title }]}>{item.name}</Text>
                  <Text style={[styles.cardSub, { color: c.sub }]}>
                    Fecha dia {item.closing_day} · Vence dia {item.due_day}
                  </Text>
                </View>
              </View>

              <Text style={[styles.availableLabel, { color: c.sub }]}>Limite disponível</Text>
              <Text style={[styles.availableValue, { color: available >= 0 ? (dark ? '#4ade80' : '#16a34a') : '#ef4444' }]}>
                {formatMoney(available)}
              </Text>
              <Text style={[styles.limitTotal, { color: c.sub }]}>
                de {formatMoney(item.limit_cents)} no total
              </Text>

              <View style={{ marginTop: 12 }}>
                <View style={[styles.barBg, { backgroundColor: c.bar }]}>
                  <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
                </View>
                <View style={styles.barLabels}>
                  <Text style={[styles.barLabel, { color: c.sub }]}>Utilizado: {formatMoney(used)}</Text>
                  <Text style={[styles.barLabel, { color: barColor, fontWeight: '700' }]}>{pct}%</Text>
                </View>
              </View>

              {inv && (
                <View style={[styles.invoiceBox, { backgroundColor: c.invoice, borderColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.invoiceLabel, { color: c.sub }]}>Fatura atual</Text>
                    <Text style={[styles.invoiceValue, { color: c.title }]}>{formatMoney(inv.total_cents)}</Text>
                    <Text style={[styles.invoiceDue, { color: c.sub }]}>Vence {formatDateShort(inv.due_date)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[inv.status] ?? '#94a3b8') + '22' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[inv.status] ?? '#94a3b8' }]}>
                      {STATUS_LABEL[inv.status] ?? inv.status}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: c.border }]}
                  onPress={() => handleViewInvoices(item)}
                >
                  <Ionicons name="receipt-outline" size={14} color={c.sub} />
                  <Text style={[styles.actionText, { color: c.sub }]}>Ver faturas</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: c.border }]}
                  onPress={() => handleEdit(item)}
                >
                  <Ionicons name="pencil-outline" size={14} color={c.sub} />
                  <Text style={[styles.actionText, { color: c.sub }]}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: '#fee2e2' }]}
                  onPress={() => handleDelete(item)}
                >
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                  <Text style={[styles.actionText, { color: '#ef4444' }]}>Excluir</Text>
                </TouchableOpacity>
              </View>

            </View>
          )
        }}
      />

      {/* Modal de faturas */}
      <Modal visible={!!invoicesCard} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.invoicesModal, { backgroundColor: c.card }]}>
            <View style={styles.invoicesHeader}>
              <Text style={[styles.invoicesTitle, { color: c.title }]}>Faturas</Text>
              <TouchableOpacity onPress={() => setInvoicesCard(null)}>
                <Ionicons name="close" size={22} color={c.sub} />
              </TouchableOpacity>
            </View>

            {invoicesLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {invoices.map(inv => (
                  <View key={inv.id} style={[styles.invoiceRow, { borderColor: c.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.invoiceMonth, { color: c.title }]}>
                        {formatMonthYear(inv.reference_month)}
                      </Text>
                      <Text style={[styles.invoiceDueSmall, { color: c.sub }]}>
                        Vence {formatDateShort(inv.due_date)}
                      </Text>
                      {inv.status === 'preview' && (
                        <Text style={styles.previewNote}>Parcela futura — será registrada automaticamente</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={[styles.invoiceRowValue, { color: c.title }]}>
                        {formatMoney(inv.total_cents)}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[inv.status] ?? '#94a3b8') + '22' }]}>
                        <Text style={[styles.statusText, { color: STATUS_COLOR[inv.status] ?? '#94a3b8' }]}>
                          {STATUS_LABEL[inv.status] ?? inv.status}
                        </Text>
                      </View>
                      {inv.status === 'open' && (
                        <TouchableOpacity
                          style={styles.payBtn}
                          onPress={() => handlePayInvoice(inv.id)}
                          disabled={payingId === inv.id}
                        >
                          {payingId === inv.id
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={styles.payBtnText}>Marcar como paga</Text>
                          }
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <CardModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setEditCard(null) }}
        onSuccess={() => { setModalVisible(false); setEditCard(null); load() }}
        editCard={editCard}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 80 },
  header:          { paddingHorizontal: 20, paddingTop: 58, paddingBottom: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerTitle:     { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSubtitle:  { color: '#93c5fd', fontSize: 13, marginTop: 2 },
  newBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  newBtnText:      { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText:       { fontSize: 15, fontWeight: '500' },
  card:            { borderRadius: 14, marginBottom: 16, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  cardTop:         { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconWrap:        { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardName:        { fontSize: 16, fontWeight: '700' },
  cardSub:         { fontSize: 12, marginTop: 2 },
  availableLabel:  { fontSize: 12, fontWeight: '600' },
  availableValue:  { fontSize: 24, fontWeight: '800', marginTop: 2 },
  limitTotal:      { fontSize: 12, marginTop: 2 },
  barBg:           { height: 6, borderRadius: 4, overflow: 'hidden' },
  barFill:         { height: 6, borderRadius: 4 },
  barLabels:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  barLabel:        { fontSize: 12 },
  invoiceBox:      { marginTop: 14, borderRadius: 10, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center' },
  invoiceLabel:    { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  invoiceValue:    { fontSize: 16, fontWeight: '700', marginTop: 2 },
  invoiceDue:      { fontSize: 12, marginTop: 2 },
  statusBadge:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText:      { fontSize: 12, fontWeight: '700' },
  actions:         { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  actionText:      { fontSize: 13, fontWeight: '600' },
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  invoicesModal:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  invoicesHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  invoicesTitle:   { fontSize: 18, fontWeight: '800' },
  invoiceRow:      { paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  invoiceMonth:    { fontSize: 15, fontWeight: '700' },
  invoiceDueSmall: { fontSize: 12, marginTop: 2 },
  previewNote:     { fontSize: 11, color: '#6366f1', fontStyle: 'italic', marginTop: 4 },
  invoiceRowValue: { fontSize: 15, fontWeight: '700' },
  payBtn:          { backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  payBtnText:      { color: '#fff', fontSize: 12, fontWeight: '700' },
})