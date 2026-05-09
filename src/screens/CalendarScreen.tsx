// src/screens/CalendarScreen.tsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import api from '../lib/api'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type EventoTipo = 'transacao' | 'recorrente_prevista' | 'transferencia' | 'fatura' | 'meta'

interface Evento {
  id: string
  tipo: EventoTipo
  subtipo?: string
  descricao: string
  valor_cents: number | null
  categoria?: string | null
}

type EventosPorDia = Record<string, Evento[]>

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function pad(n: number) { return String(n).padStart(2, '0') }
function monthKey(year: number, month: number) { return `${year}-${pad(month + 1)}` }
function dayKey(year: number, month: number, day: number) { return `${year}-${pad(month + 1)}-${pad(day)}` }

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

function corEvento(e: Evento): string {
  if (e.tipo === 'fatura') return '#f59e0b'
  if (e.tipo === 'transferencia') return '#6366f1'
  if (e.tipo === 'meta') return '#8b5cf6'
  if (e.tipo === 'recorrente_prevista') return '#64748b'
  if (e.subtipo === 'income') return '#22c55e'
  return '#ef4444'
}

function iconeEvento(e: Evento): keyof typeof Ionicons.glyphMap {
  if (e.tipo === 'fatura') return 'card-outline'
  if (e.tipo === 'transferencia') return 'swap-horizontal-outline'
  if (e.tipo === 'meta') return 'trophy-outline'
  if (e.tipo === 'recorrente_prevista') return 'repeat-outline'
  if (e.subtipo === 'income') return 'arrow-up-circle-outline'
  return 'arrow-down-circle-outline'
}

function labelTipo(e: Evento): string {
  if (e.tipo === 'fatura') return 'Fatura'
  if (e.tipo === 'transferencia') return 'Transferência'
  if (e.tipo === 'meta') return 'Meta'
  if (e.tipo === 'recorrente_prevista') return 'Previsto'
  if (e.subtipo === 'income') return 'Receita'
  return 'Despesa'
}

const LEGENDA = [
  { cor: '#22c55e', label: 'Receita' },
  { cor: '#ef4444', label: 'Despesa' },
  { cor: '#64748b', label: 'Previsto' },
  { cor: '#f59e0b', label: 'Fatura' },
  { cor: '#6366f1', label: 'Transferência' },
  { cor: '#8b5cf6', label: 'Meta' },
]

// ─── Componente principal ────────────────────────────────────────────────────

export default function CalendarScreen() {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  const today = new Date()
  const [ano, setAno] = useState(today.getFullYear())
  const [mes, setMes] = useState(today.getMonth())
  const [diaSelecionado, setDiaSelecionado] = useState<string>(
    dayKey(today.getFullYear(), today.getMonth(), today.getDate())
  )
  const [eventos, setEventos] = useState<EventosPorDia>({})
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregarEventos = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const res = await api.get(`/api/calendar?month=${monthKey(ano, mes)}`)
      setEventos(res.data?.data || {})
    } catch {
      setErro('Erro ao carregar calendário')
    } finally {
      setCarregando(false)
    }
  }, [ano, mes])

  useEffect(() => { carregarEventos() }, [carregarEventos])

  function mesAnterior() {
    if (mes === 0) { setAno(a => a - 1); setMes(11) } else setMes(m => m - 1)
  }
  function proximoMes() {
    if (mes === 11) { setAno(a => a + 1); setMes(0) } else setMes(m => m + 1)
  }

  // Células do calendário
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const ultimoDia = new Date(ano, mes + 1, 0).getDate()
  const celulas: (number | null)[] = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: ultimoDia }, (_, i) => i + 1),
  ]
  while (celulas.length % 7 !== 0) celulas.push(null)

  const eventosDia = eventos[diaSelecionado] || []
  const diaNum = parseInt(diaSelecionado.split('-')[2], 10)

  const totalReceitas = eventosDia
    .filter(e => e.subtipo === 'income')
    .reduce((s, e) => s + (e.valor_cents || 0), 0)
  const totalDespesas = eventosDia
    .filter(e => e.subtipo === 'expense' || (e.tipo === 'recorrente_prevista' && e.subtipo !== 'income'))
    .reduce((s, e) => s + (e.valor_cents || 0), 0)

  const c = dark ? colors.dark : colors.light

  return (
    <View style={[s.container, { backgroundColor: c.bg }]}>

      {/* Header */}
      <View style={[s.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View>
          <Text style={[s.headerTitle, { color: c.text }]}>Calendário Financeiro</Text>
          <Text style={[s.headerSub, { color: c.textMuted }]}>Receitas, despesas, faturas e transferências</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Erro */}
        {erro && (
          <View style={[s.erroBox, { backgroundColor: dark ? '#450a0a' : '#fef2f2', borderColor: dark ? '#7f1d1d' : '#fecaca' }]}>
            <Text style={{ color: dark ? '#f87171' : '#dc2626', fontSize: 13 }}>{erro}</Text>
          </View>
        )}

        {/* Seletor de mês — chips horizontais */}
        <View style={[s.mesSelector, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          {/* Navegação de ano */}
          <View style={s.anoRow}>
            <TouchableOpacity onPress={() => setAno(a => a - 1)} style={[s.anoBtn, { borderColor: c.border }]}>
              <Ionicons name="chevron-back" size={14} color={c.textMuted} />
            </TouchableOpacity>
            <Text style={[s.anoText, { color: c.text }]}>{ano}</Text>
            <TouchableOpacity onPress={() => setAno(a => a + 1)} style={[s.anoBtn, { borderColor: c.border }]}>
              <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Chips dos meses */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipsRow}
          >
            {MESES.map((m, i) => {
              const ativo = i === mes
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMes(i)}
                  style={[
                    s.chip,
                    { borderColor: ativo ? '#2563eb' : c.border },
                    ativo && { backgroundColor: '#2563eb' },
                  ]}
                >
                  <Text style={[
                    s.chipText,
                    { color: ativo ? '#ffffff' : c.textMuted },
                    ativo && { fontWeight: '700' },
                  ]}>
                    {m.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* Card calendário */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>

          {/* Setas de navegação do mês */}
          <View style={[s.navRow, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={mesAnterior} style={[s.navBtn, { borderColor: c.border }]}>
              <Ionicons name="chevron-back" size={18} color={c.textMuted} />
            </TouchableOpacity>
            <Text style={[s.mesTitle, { color: c.text }]}>{MESES[mes]} {ano}</Text>
            <TouchableOpacity onPress={proximoMes} style={[s.navBtn, { borderColor: c.border }]}>
              <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Dias da semana */}
          <View style={[s.diasSemanaRow, { backgroundColor: c.bgAlt, borderBottomColor: c.border }]}>
            {DIAS_SEMANA.map(d => (
              <View key={d} style={s.diaSemanaCell}>
                <Text style={[s.diaSemanaText, { color: c.textMuted }]}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Grade */}
          {carregando ? (
            <View style={s.loadingBox}>
              <ActivityIndicator color="#2563eb" />
              <Text style={[{ marginTop: 8, color: c.textMuted, fontSize: 13 }]}>Carregando...</Text>
            </View>
          ) : (
            <View style={s.grade}>
              {celulas.map((dia, i) => {
                if (dia === null) {
                  return (
                    <View
                      key={`vazio-${i}`}
                      style={[s.celula, { backgroundColor: c.bgAlt, borderColor: c.borderLight }]}
                    />
                  )
                }
                const key = dayKey(ano, mes, dia)
                const evs = eventos[key] || []
                const isHoje = key === dayKey(today.getFullYear(), today.getMonth(), today.getDate())
                const isSelecionado = key === diaSelecionado

                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setDiaSelecionado(key)}
                    style={[
                      s.celula,
                      { borderColor: c.borderLight },
                      isSelecionado && { backgroundColor: dark ? '#1e3a5f' : '#eff6ff' },
                      isHoje && !isSelecionado && { backgroundColor: dark ? '#052e16' : '#f0fdf4' },
                    ]}
                  >
                    <View style={[
                      s.diaNumContainer,
                      isHoje && s.diaNumHoje,
                    ]}>
                      <Text style={[
                        s.diaNum,
                        { color: isHoje ? '#fff' : isSelecionado ? '#2563eb' : c.text },
                        isHoje && { fontWeight: 'bold' },
                        isSelecionado && { fontWeight: '600' },
                      ]}>
                        {dia}
                      </Text>
                    </View>

                    {/* Pontos */}
                    <View style={s.pontosRow}>
                      {evs.slice(0, 4).map((ev, idx) => (
                        <View
                          key={idx}
                          style={[s.ponto, { backgroundColor: corEvento(ev) }]}
                        />
                      ))}
                      {evs.length > 4 && (
                        <Text style={[s.pontosExtra, { color: c.textMuted }]}>+{evs.length - 4}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

          {/* Legenda */}
          <View style={[s.legenda, { borderTopColor: c.border, backgroundColor: c.bgAlt }]}>
            {LEGENDA.map(({ cor, label }) => (
              <View key={label} style={s.legendaItem}>
                <View style={[s.legendaPonto, { backgroundColor: cor }]} />
                <Text style={[s.legendaLabel, { color: c.textMuted }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Card do dia */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, marginBottom: 32 }]}>

          <View style={[s.diaHeader, { borderBottomColor: c.border, backgroundColor: c.bgAlt }]}>
            <Text style={[s.diaTitulo, { color: c.text }]}>{diaNum} de {MESES[mes]}</Text>
            <Text style={[s.diaSubtitulo, { color: c.textMuted }]}>
              {eventosDia.length === 0 ? 'Nenhum evento' : `${eventosDia.length} evento${eventosDia.length > 1 ? 's' : ''}`}
            </Text>
          </View>

          {/* Resumo receitas/despesas */}
          {eventosDia.length > 0 && (
            <View style={[s.resumoRow, { borderBottomColor: c.border }]}>
              <View style={[s.resumoItem, { backgroundColor: dark ? '#052e16' : '#f0fdf4', borderRightColor: c.border }]}>
                <Text style={[s.resumoLabel, { color: '#16a34a' }]}>RECEITAS</Text>
                <Text style={[s.resumoValor, { color: '#16a34a' }]}>{formatCurrency(totalReceitas)}</Text>
              </View>
              <View style={[s.resumoItem, { backgroundColor: dark ? '#450a0a' : '#fef2f2' }]}>
                <Text style={[s.resumoLabel, { color: '#dc2626' }]}>DESPESAS</Text>
                <Text style={[s.resumoValor, { color: '#dc2626' }]}>{formatCurrency(totalDespesas)}</Text>
              </View>
            </View>
          )}

          {/* Lista de eventos */}
          {eventosDia.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="calendar-outline" size={36} color={c.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[s.emptyText, { color: c.textMuted }]}>Nenhum evento neste dia</Text>
            </View>
          ) : (
            eventosDia.map((ev, idx) => (
              <View
                key={idx}
                style={[
                  s.eventoRow,
                  idx < eventosDia.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.borderLight },
                ]}
              >
                <View style={[s.eventoIcone, { backgroundColor: corEvento(ev) + '25' }]}>
                  <Ionicons name={iconeEvento(ev)} size={20} color={corEvento(ev)} />
                </View>
                <View style={s.eventoInfo}>
                  <Text style={[s.eventoDesc, { color: c.text }]} numberOfLines={1}>{ev.descricao}</Text>
                  <View style={s.eventoBadgeRow}>
                    <View style={[s.badge, { backgroundColor: corEvento(ev) + '25' }]}>
                      <Text style={[s.badgeText, { color: corEvento(ev) }]}>{labelTipo(ev)}</Text>
                    </View>
                    {ev.categoria && (
                      <Text style={[s.eventoCategoria, { color: c.textMuted }]}>{ev.categoria}</Text>
                    )}
                  </View>
                </View>
                {ev.valor_cents != null && (
                  <Text style={[s.eventoValor, {
                    color: ev.subtipo === 'income' ? '#16a34a' : ev.tipo === 'transferencia' ? '#6366f1' : '#dc2626'
                  }]}>
                    {formatCurrency(ev.valor_cents)}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}

// ─── Cores ───────────────────────────────────────────────────────────────────

const colors = {
  light: {
    bg: '#f9fafb',
    card: '#ffffff',
    bgAlt: '#f9fafb',
    text: '#111827',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    borderLight: '#f3f4f6',
  },
  dark: {
    bg: '#111827',
    card: '#1f2937',
    bgAlt: '#111827',
    text: '#f9fafb',
    textMuted: '#9ca3af',
    border: '#374151',
    borderLight: '#374151',
  },
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },

  erroBox: { marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 8, borderWidth: 1 },

  // Seletor de mês
  mesSelector: { borderBottomWidth: 1, paddingTop: 12, paddingBottom: 14 },
  anoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 },
  anoBtn: { borderWidth: 1, borderRadius: 8, padding: 6 },
  anoText: { fontSize: 15, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  chipsRow: { paddingHorizontal: 16, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13 },

  // Card
  card: { marginHorizontal: 16, marginTop: 16, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },

  // Navegação mês
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  navBtn: { borderWidth: 1, borderRadius: 8, padding: 6 },
  mesTitle: { fontSize: 16, fontWeight: 'bold' },

  // Dias da semana
  diasSemanaRow: { flexDirection: 'row', borderBottomWidth: 1 },
  diaSemanaCell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  diaSemanaText: { fontSize: 11, fontWeight: '600' },

  // Grade
  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
  celula: { width: '14.285714%', minHeight: 68, borderRightWidth: 1, borderBottomWidth: 1, padding: 4 },
  diaNumContainer: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  diaNumHoje: { backgroundColor: '#22c55e' },
  diaNum: { fontSize: 11, fontWeight: '500' },
  pontosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  ponto: { width: 7, height: 7, borderRadius: 4 },
  pontosExtra: { fontSize: 8, lineHeight: 7 },

  // Legenda
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendaPonto: { width: 9, height: 9, borderRadius: 5 },
  legendaLabel: { fontSize: 11 },

  // Card do dia
  diaHeader: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  diaTitulo: { fontSize: 15, fontWeight: 'bold' },
  diaSubtitulo: { fontSize: 12, marginTop: 2 },
  resumoRow: { flexDirection: 'row', borderBottomWidth: 1 },
  resumoItem: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, borderRightWidth: 1 },
  resumoLabel: { fontSize: 11, fontWeight: '700' },
  resumoValor: { fontSize: 13, fontWeight: 'bold', marginTop: 2 },

  // Eventos
  emptyBox: { paddingVertical: 36, alignItems: 'center' },
  emptyText: { fontSize: 13 },
  eventoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  eventoIcone: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  eventoInfo: { flex: 1, minWidth: 0 },
  eventoDesc: { fontSize: 14, fontWeight: '500' },
  eventoBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  eventoCategoria: { fontSize: 11 },
  eventoValor: { fontSize: 13, fontWeight: 'bold', flexShrink: 0 },
})