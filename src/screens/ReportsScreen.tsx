import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, useColorScheme, RefreshControl, Modal
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Svg, G, Path, Circle, Rect, Text as SvgText } from 'react-native-svg'
import api from '../lib/api'

interface Transaction {
  id: string
  description: string
  amount_cents: number
  type: 'income' | 'expense'
  date: string
  payment_method: string | null
  categories?: { name: string }
}

const PIE_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#64748b'
]

const MONTHS_PT   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const PAYMENTS: Record<string, string> = {
  pix: 'Pix', credit_card: 'Cartão de Crédito', debit_card: 'Cartão de Débito',
  cash: 'Dinheiro', boleto: 'Boleto', other: 'Outro'
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

function BarChart({ data }: { data: { label: string; income: number; expense: number }[] }) {
  const dark = useColorScheme() === 'dark'
  const W = 320, H = 160, padL = 48, padB = 24, padT = 10, padR = 10
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1)
  const chartH = H - padB - padT
  const chartW = W - padL - padR
  const barW = (chartW / data.length) * 0.35
  const gap = chartW / data.length

  return (
    <Svg width={W} height={H}>
      {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
        const y = padT + chartH * (1 - frac)
        const val = Math.round(maxVal * frac / 100)
        return (
          <G key={i}>
            <Path d={`M${padL} ${y} L${W - padR} ${y}`} stroke={dark ? '#334155' : '#e2e8f0'} strokeWidth={0.5} />
            <SvgText x={padL - 4} y={y + 4} fontSize={9} fill={dark ? '#64748b' : '#94a3b8'} textAnchor="end">
              {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
            </SvgText>
          </G>
        )
      })}
      {data.map((d, i) => {
        const cx = padL + gap * i + gap / 2
        const incH = d.income > 0 ? (d.income / maxVal) * chartH : 0
        const expH = d.expense > 0 ? (d.expense / maxVal) * chartH : 0
        return (
          <G key={i}>
            <Rect x={cx - barW - 2} y={padT + chartH - incH} width={barW} height={incH} fill="#10b981" rx={2} />
            <Rect x={cx + 2} y={padT + chartH - expH} width={barW} height={expH} fill="#ef4444" rx={2} />
            <SvgText x={cx} y={H - 6} fontSize={9} fill={dark ? '#94a3b8' : '#64748b'} textAnchor="middle">
              {d.label}
            </SvgText>
          </G>
        )
      })}
    </Svg>
  )
}

function PieChart({ data }: { data: { name: string; value: number }[] }) {
  const dark = useColorScheme() === 'dark'
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null
  const R = 70, cx = 90, cy = 80
  let angle = -Math.PI / 2
  const slices = data.map((d, i) => {
    const slice = (d.value / total) * 2 * Math.PI
    const x1 = cx + R * Math.cos(angle)
    const y1 = cy + R * Math.sin(angle)
    angle += slice
    const x2 = cx + R * Math.cos(angle)
    const y2 = cy + R * Math.sin(angle)
    const large = slice > Math.PI ? 1 : 0
    return {
      path: `M${cx},${cy} L${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} Z`,
      color: PIE_COLORS[i % PIE_COLORS.length]
    }
  })
  return (
    <Svg width={180} height={160}>
      {slices.map((s, i) => <Path key={i} d={s.path} fill={s.color} />)}
      <Circle cx={cx} cy={cy} r={40} fill={dark ? '#1e293b' : '#ffffff'} />
    </Svg>
  )
}

// ── Seletor de mês em modal ──
function MonthPicker({ visible, onClose, year, monthIdx, onSelect, dark }: {
  visible: boolean
  onClose: () => void
  year: number
  monthIdx: number
  onSelect: (year: number, month: number) => void
  dark: boolean
}) {
  const [pickerYear, setPickerYear] = useState(year)
  const now = new Date()
  const c = {
    bg:     dark ? '#1e293b' : '#ffffff',
    text:   dark ? '#f1f5f9' : '#1e293b',
    sub:    dark ? '#94a3b8' : '#64748b',
    border: dark ? '#334155' : '#e2e8f0',
    input:  dark ? '#0f172a' : '#f1f5f9',
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={picker.overlay}>
        <View style={[picker.card, { backgroundColor: c.bg }]}>

          {/* Navegação de ano */}
          <View style={picker.yearRow}>
            <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} style={picker.yearBtn}>
              <Ionicons name="chevron-back" size={20} color={c.text} />
            </TouchableOpacity>
            <Text style={[picker.yearText, { color: c.text }]}>{pickerYear}</Text>
            <TouchableOpacity
              onPress={() => setPickerYear(y => y + 1)}
              disabled={pickerYear >= now.getFullYear()}
              style={[picker.yearBtn, pickerYear >= now.getFullYear() && { opacity: 0.3 }]}
            >
              <Ionicons name="chevron-forward" size={20} color={c.text} />
            </TouchableOpacity>
          </View>

          {/* Grade de meses */}
          <View style={picker.grid}>
            {MONTHS_PT.map((label, i) => {
              const isFuture = pickerYear > now.getFullYear() ||
                (pickerYear === now.getFullYear() && i > now.getMonth())
              const isSelected = pickerYear === year && i === monthIdx
              return (
                <TouchableOpacity
                  key={i}
                  disabled={isFuture}
                  onPress={() => { onSelect(pickerYear, i); onClose() }}
                  style={[
                    picker.monthBtn,
                    { backgroundColor: isSelected ? '#3b82f6' : c.input },
                    isFuture && { opacity: 0.3 }
                  ]}
                >
                  <Text style={[
                    picker.monthLabel,
                    { color: isSelected ? '#fff' : c.text }
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <TouchableOpacity onPress={onClose} style={[picker.cancelBtn, { borderColor: c.border }]}>
            <Text style={{ color: c.sub, fontWeight: '600' }}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const picker = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 30 },
  card:       { borderRadius: 16, padding: 20 },
  yearRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  yearBtn:    { padding: 8 },
  yearText:   { fontSize: 20, fontWeight: '800' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  monthBtn:   { width: '22%', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  monthLabel: { fontSize: 13, fontWeight: '700' },
  cancelBtn:  { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
})

export default function ReportsScreen() {
  const dark = useColorScheme() === 'dark'
  const c = {
    bg:     dark ? '#0f172a' : '#f8fafc',
    card:   dark ? '#1e293b' : '#ffffff',
    title:  dark ? '#f1f5f9' : '#1e293b',
    sub:    dark ? '#94a3b8' : '#64748b',
    border: dark ? '#334155' : '#f1f5f9',
    header: dark ? '#1e3a8a' : '#1e40af',
  }

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [monthIdx, setMonthIdx] = useState(now.getMonth())
  const [pickerVisible, setPickerVisible] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthlyData, setMonthlyData] = useState<{ label: string; income: number; expense: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { load() }, [year, monthIdx])

  const load = async () => {
    setLoading(true)
    try {
      const m = String(monthIdx + 1).padStart(2, '0')
      const lastDay = new Date(year, monthIdx + 1, 0).getDate()
      const res = await api.get(`/api/transactions?start=${year}-${m}-01&end=${year}-${m}-${lastDay}&limit=500`)
      setTransactions(res.data.data || [])

      const months: { label: string; income: number; expense: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, monthIdx - i, 1)
        const y2 = d.getFullYear()
        const m2 = String(d.getMonth() + 1).padStart(2, '0')
        const last2 = new Date(y2, d.getMonth() + 1, 0).getDate()
        const r = await api.get(`/api/transactions?start=${y2}-${m2}-01&end=${y2}-${m2}-${last2}&limit=500`)
        const txs: Transaction[] = r.data.data || []
        months.push({
          label: MONTHS_PT[d.getMonth()],
          income:  txs.filter(t => t.type === 'income').reduce((a, t) => a + t.amount_cents, 0),
          expense: txs.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount_cents, 0),
        })
      }
      setMonthlyData(months)
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const expenses = transactions.filter(t => t.type === 'expense')
  const incomes  = transactions.filter(t => t.type === 'income')
  const totalExpense = expenses.reduce((a, t) => a + t.amount_cents, 0)
  const totalIncome  = incomes.reduce((a, t) => a + t.amount_cents, 0)
  const balance      = totalIncome - totalExpense
  const daysInMonth  = new Date(year, monthIdx + 1, 0).getDate()
  const avgDaily     = totalExpense > 0 ? Math.round(totalExpense / daysInMonth) : 0
  const biggestExpense = [...expenses].sort((a, b) => b.amount_cents - a.amount_cents)[0]
  const biggestIncome  = [...incomes].sort((a, b) => b.amount_cents - a.amount_cents)[0]

  const byCategory = expenses.filter(t => t.categories).reduce((acc, t) => {
    const name = t.categories!.name
    acc[name] = (acc[name] || 0) + t.amount_cents
    return acc
  }, {} as Record<string, number>)
  const pieData = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  const byPayment = expenses.reduce((acc, t) => {
    const key = PAYMENTS[t.payment_method || ''] || 'Outro'
    acc[key] = (acc[key] || 0) + t.amount_cents
    return acc
  }, {} as Record<string, number>)
  const paymentList = Object.entries(byPayment).sort((a, b) => b[1] - a[1])

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>

      {/* Header com botão do mês */}
      <View style={[styles.header, { backgroundColor: c.header }]}>
        <View>
          <Text style={styles.headerTitle}>Relatórios</Text>
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            style={styles.monthBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={14} color="#93c5fd" />
            <Text style={styles.headerSub}>
              {MONTHS_FULL[monthIdx]} de {year}
            </Text>
            <Ionicons name="chevron-down" size={13} color="#93c5fd" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#3b82f6" />}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <>
            <View style={styles.row}>
              <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.summaryLabel, { color: c.sub }]}>Receitas</Text>
                <Text style={[styles.summaryVal, { color: '#10b981' }]}>{formatMoney(totalIncome)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.summaryLabel, { color: c.sub }]}>Despesas</Text>
                <Text style={[styles.summaryVal, { color: '#ef4444' }]}>{formatMoney(totalExpense)}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.summaryLabel, { color: c.sub }]}>Saldo</Text>
                <Text style={[styles.summaryVal, { color: balance >= 0 ? c.title : '#ef4444' }]}>{formatMoney(balance)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.summaryLabel, { color: c.sub }]}>Gasto médio/dia</Text>
                <Text style={[styles.summaryVal, { color: c.title }]}>{formatMoney(avgDaily)}</Text>
              </View>
            </View>

            {(biggestExpense || biggestIncome) && (
              <View style={styles.row}>
                {biggestExpense && (
                  <View style={[styles.highlightCard, { backgroundColor: c.card, borderColor: c.border }]}>
                    <Text style={[styles.summaryLabel, { color: c.sub }]}>Maior despesa</Text>
                    <Text style={[styles.highlightDesc, { color: c.title }]} numberOfLines={1}>{biggestExpense.description}</Text>
                    <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 14 }}>{formatMoney(biggestExpense.amount_cents)}</Text>
                  </View>
                )}
                {biggestIncome && (
                  <View style={[styles.highlightCard, { backgroundColor: c.card, borderColor: c.border }]}>
                    <Text style={[styles.summaryLabel, { color: c.sub }]}>Maior receita</Text>
                    <Text style={[styles.highlightDesc, { color: c.title }]} numberOfLines={1}>{biggestIncome.description}</Text>
                    <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 14 }}>{formatMoney(biggestIncome.amount_cents)}</Text>
                  </View>
                )}
              </View>
            )}

            {transactions.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <Ionicons name="bar-chart-outline" size={40} color={dark ? '#334155' : '#cbd5e1'} />
                <Text style={[styles.emptyText, { color: c.sub }]}>Nenhuma transação neste mês</Text>
              </View>
            ) : (
              <>
                <View style={[styles.chartCard, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[styles.chartTitle, { color: c.title }]}>Receitas vs Despesas — 6 meses</Text>
                  <View style={styles.legend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                      <Text style={[styles.legendText, { color: c.sub }]}>Receitas</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                      <Text style={[styles.legendText, { color: c.sub }]}>Despesas</Text>
                    </View>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <BarChart data={monthlyData} />
                  </ScrollView>
                </View>

                {pieData.length > 0 && (
                  <View style={[styles.chartCard, { backgroundColor: c.card, borderColor: c.border }]}>
                    <Text style={[styles.chartTitle, { color: c.title }]}>Gastos por categoria</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <PieChart data={pieData} />
                      <View style={{ flex: 1, gap: 6 }}>
                        {pieData.map((item, i) => (
                          <View key={item.name} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }]} />
                            <Text style={{ color: c.sub, fontSize: 11, flex: 1 }} numberOfLines={1}>{item.name}</Text>
                            <Text style={{ color: c.title, fontSize: 11, fontWeight: '600', marginLeft: 4 }}>
                              {formatMoney(item.value)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {paymentList.length > 0 && (
                  <View style={[styles.chartCard, { backgroundColor: c.card, borderColor: c.border }]}>
                    <Text style={[styles.chartTitle, { color: c.title }]}>Gastos por forma de pagamento</Text>
                    {paymentList.map(([name, total]) => {
                      const pct = totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0
                      return (
                        <View key={name} style={{ marginBottom: 12 }}>
                          <View style={styles.paymentRow}>
                            <Text style={[styles.paymentName, { color: c.title }]}>{name}</Text>
                            <Text style={[styles.paymentVal, { color: c.sub }]}>{formatMoney(total)} ({pct}%)</Text>
                          </View>
                          <View style={[styles.barBg, { backgroundColor: dark ? '#334155' : '#e2e8f0' }]}>
                            <View style={[styles.barFill, { width: `${pct}%` }]} />
                          </View>
                        </View>
                      )
                    })}
                  </View>
                )}

                {expenses.length > 0 && (
                  <View style={[styles.chartCard, { backgroundColor: c.card, borderColor: c.border }]}>
                    <Text style={[styles.chartTitle, { color: c.title }]}>Despesas ({expenses.length})</Text>
                    {[...expenses].sort((a, b) => b.amount_cents - a.amount_cents).map((tx, i) => {
                      const [y2, m2, d2] = tx.date.split('-')
                      return (
                        <View key={tx.id} style={[styles.txRow, { borderTopColor: c.border, borderTopWidth: i === 0 ? 0 : 1 }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.txDesc, { color: c.title }]} numberOfLines={1}>{tx.description}</Text>
                            <Text style={[styles.txMeta, { color: c.sub }]}>
                              {d2}/{m2}/{y2}{tx.categories ? ` · ${tx.categories.name}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.txExpense}>-{formatMoney(tx.amount_cents)}</Text>
                        </View>
                      )
                    })}
                  </View>
                )}

                {incomes.length > 0 && (
                  <View style={[styles.chartCard, { backgroundColor: c.card, borderColor: c.border }]}>
                    <Text style={[styles.chartTitle, { color: c.title }]}>Receitas ({incomes.length})</Text>
                    {[...incomes].sort((a, b) => b.amount_cents - a.amount_cents).map((tx, i) => {
                      const [y2, m2, d2] = tx.date.split('-')
                      return (
                        <View key={tx.id} style={[styles.txRow, { borderTopColor: c.border, borderTopWidth: i === 0 ? 0 : 1 }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.txDesc, { color: c.title }]} numberOfLines={1}>{tx.description}</Text>
                            <Text style={[styles.txMeta, { color: c.sub }]}>
                              {d2}/{m2}/{y2}{tx.categories ? ` · ${tx.categories.name}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.txIncome}>+{formatMoney(tx.amount_cents)}</Text>
                        </View>
                      )
                    })}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <MonthPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        year={year}
        monthIdx={monthIdx}
        onSelect={(y, m) => { setYear(y); setMonthIdx(m) }}
        dark={dark}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  center:        { paddingTop: 80, alignItems: 'center' },
  header:        { paddingHorizontal: 20, paddingTop: 58, paddingBottom: 20 },
  headerTitle:   { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 6 },
  monthBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerSub:     { color: '#93c5fd', fontSize: 13, textTransform: 'capitalize' },
  row:           { flexDirection: 'row', gap: 10, marginBottom: 10 },
  summaryCard:   { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1 },
  summaryLabel:  { fontSize: 11, marginBottom: 4 },
  summaryVal:    { fontSize: 15, fontWeight: '800' },
  highlightCard: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1, gap: 4 },
  highlightDesc: { fontSize: 13, fontWeight: '600' },
  emptyCard:     { borderRadius: 12, padding: 40, borderWidth: 1, alignItems: 'center', gap: 12, marginTop: 10 },
  emptyText:     { fontSize: 14 },
  chartCard:     { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 10 },
  chartTitle:    { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  legend:        { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:     { width: 8, height: 8, borderRadius: 4 },
  legendText:    { fontSize: 11 },
  paymentRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  paymentName:   { fontSize: 12, fontWeight: '600' },
  paymentVal:    { fontSize: 11 },
  barBg:         { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:       { height: 6, backgroundColor: '#3b82f6', borderRadius: 3 },
  txRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  txDesc:        { fontSize: 13, fontWeight: '600' },
  txMeta:        { fontSize: 11, marginTop: 2 },
  txExpense:     { fontSize: 13, fontWeight: '700', color: '#ef4444' },
  txIncome:      { fontSize: 13, fontWeight: '700', color: '#10b981' },
})