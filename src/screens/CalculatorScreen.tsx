import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, useColorScheme, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type CalcId =
  | 'compound' | 'simple' | 'monthly_to_annual' | 'annual_to_monthly'
  | 'vacation' | 'vacation_prop' | 'net_salary' | 'overtime'
  | 'investment' | 'thirteenth' | 'fgts'

interface Calculator {
  id: CalcId
  label: string
  icon: keyof typeof Ionicons.glyphMap
  description: string
}

const CALCULATORS: Calculator[] = [
  { id: 'compound',          icon: 'trending-up-outline',      label: 'Juros compostos',       description: 'Montante com juros sobre juros' },
  { id: 'simple',            icon: 'analytics-outline',        label: 'Juros simples',          description: 'Juros sem capitalização' },
  { id: 'monthly_to_annual', icon: 'arrow-up-outline',         label: 'Mensal → Anual',         description: 'Converta taxa mensal em anual' },
  { id: 'annual_to_monthly', icon: 'arrow-down-outline',       label: 'Anual → Mensal',         description: 'Converta taxa anual em mensal' },
  { id: 'vacation',          icon: 'sunny-outline',            label: 'Férias',                 description: 'Férias com 1/3 constitucional' },
  { id: 'vacation_prop',     icon: 'calendar-outline',         label: 'Férias proporcionais',   description: 'Férias por meses trabalhados' },
  { id: 'net_salary',        icon: 'wallet-outline',           label: 'Salário líquido',        description: 'Desconte INSS e IRRF' },
  { id: 'overtime',          icon: 'time-outline',             label: 'Hora extra',             description: 'Valor das horas extras' },
  { id: 'investment',        icon: 'bar-chart-outline',        label: 'Investimento',           description: 'Simule aportes com juros compostos' },
  { id: 'thirteenth',        icon: 'gift-outline',             label: 'Décimo terceiro',        description: '13º salário proporcional' },
  { id: 'fgts',              icon: 'business-outline',         label: 'FGTS',                   description: 'Estime seu saldo do FGTS' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtPct = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + '%'

const n = (s: string) => parseFloat(s.replace(',', '.')) || 0

function calcINSS(bruto: number): number {
  const faixas = [
    { ate: 1412.00,  aliq: 0.075 },
    { ate: 2666.68,  aliq: 0.09  },
    { ate: 4000.03,  aliq: 0.12  },
    { ate: 7786.02,  aliq: 0.14  },
  ]
  let inss = 0, anterior = 0
  for (const f of faixas) {
    if (bruto <= 0) break
    const faixa = Math.min(bruto, f.ate) - anterior
    inss += faixa * f.aliq
    anterior = f.ate
    if (bruto <= f.ate) break
  }
  return Math.min(inss, 908.86)
}

function calcIRRF(base: number): number {
  if (base <= 2259.20) return 0
  if (base <= 2826.65) return base * 0.075 - 169.44
  if (base <= 3751.05) return base * 0.15  - 381.44
  if (base <= 4664.68) return base * 0.225 - 662.77
  return base * 0.275 - 896.00
}

// ─── Componentes de UI ────────────────────────────────────────────────────────
function FieldInput({
  label, value, onChange, placeholder, hint, dark,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; hint?: string; dark: boolean
}) {
  const c = {
    text:   dark ? '#f9fafb' : '#111827',
    sub:    dark ? '#9ca3af' : '#6b7280',
    border: dark ? '#374151' : '#d1d5db',
    input:  dark ? '#374151' : '#f9fafb',
  }
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[fi.label, { color: c.text }]}>{label}</Text>
      {hint ? <Text style={[fi.hint, { color: c.sub }]}>{hint}</Text> : null}
      <TextInput
        style={[fi.input, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || '0'}
        placeholderTextColor={c.sub}
        keyboardType="decimal-pad"
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
      />
    </View>
  )
}

const fi = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  hint:  { fontSize: 11, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
})

function ResultCard({ label, value, highlight, dark }: {
  label: string; value: string; highlight?: boolean; dark: boolean
}) {
  return (
    <View style={[
      rc.card,
      highlight
        ? { backgroundColor: '#2563eb' }
        : { backgroundColor: dark ? '#374151' : '#f3f4f6' },
    ]}>
      <Text style={[rc.label, { color: highlight ? '#bfdbfe' : (dark ? '#9ca3af' : '#6b7280') }]}>{label}</Text>
      <Text style={[rc.value, { color: highlight ? '#ffffff' : (dark ? '#f9fafb' : '#111827') }]}>{value}</Text>
    </View>
  )
}

const rc = StyleSheet.create({
  card:  { borderRadius: 12, padding: 14, marginBottom: 10 },
  label: { fontSize: 12, marginBottom: 4 },
  value: { fontSize: 17, fontWeight: '700' },
})

function SelectInput({ label, value, options, onChange, dark }: {
  label: string
  value: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
  dark: boolean
}) {
  const c = { text: dark ? '#f9fafb' : '#111827', border: dark ? '#374151' : '#d1d5db', bg: dark ? '#374151' : '#f9fafb' }
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[fi.label, { color: c.text }]}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
              borderColor: value === opt.value ? '#2563eb' : c.border,
              backgroundColor: value === opt.value ? (dark ? '#1e3a5f' : '#dbeafe') : c.bg,
            }}
          >
            <Text style={{ fontSize: 13, color: value === opt.value ? '#2563eb' : c.text, fontWeight: '600' }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// ─── Calculadoras ─────────────────────────────────────────────────────────────
function CompoundCalc({ dark }: { dark: boolean }) {
  const [pv, setPv] = useState(''); const [rate, setRate] = useState(''); const [periods, setPeriods] = useState('')
  const fv = pv && rate && periods ? n(pv) * Math.pow(1 + n(rate) / 100, n(periods)) : null
  return (
    <View>
      <FieldInput label="Capital inicial (R$)" value={pv} onChange={setPv} placeholder="1000" dark={dark} />
      <FieldInput label="Taxa de juros (% ao período)" value={rate} onChange={setRate} placeholder="1" dark={dark} />
      <FieldInput label="Número de períodos" value={periods} onChange={setPeriods} placeholder="12" hint="Meses, anos — o que combinar com a taxa" dark={dark} />
      {fv !== null && <>
        <ResultCard label="Montante final" value={fmt(fv)} highlight dark={dark} />
        <ResultCard label="Juros ganhos" value={fmt(fv - n(pv))} dark={dark} />
        <ResultCard label="Capital inicial" value={fmt(n(pv))} dark={dark} />
      </>}
    </View>
  )
}

function SimpleCalc({ dark }: { dark: boolean }) {
  const [pv, setPv] = useState(''); const [rate, setRate] = useState(''); const [periods, setPeriods] = useState('')
  const juros = pv && rate && periods ? n(pv) * (n(rate) / 100) * n(periods) : null
  return (
    <View>
      <FieldInput label="Capital inicial (R$)" value={pv} onChange={setPv} placeholder="1000" dark={dark} />
      <FieldInput label="Taxa de juros (% ao período)" value={rate} onChange={setRate} placeholder="1" dark={dark} />
      <FieldInput label="Número de períodos" value={periods} onChange={setPeriods} placeholder="12" dark={dark} />
      {juros !== null && <>
        <ResultCard label="Montante final" value={fmt(n(pv) + juros)} highlight dark={dark} />
        <ResultCard label="Juros totais" value={fmt(juros)} dark={dark} />
      </>}
    </View>
  )
}

function MonthlyToAnnual({ dark }: { dark: boolean }) {
  const [rate, setRate] = useState('')
  const annual = rate ? (Math.pow(1 + n(rate) / 100, 12) - 1) * 100 : null
  return (
    <View>
      <FieldInput label="Taxa mensal (%)" value={rate} onChange={setRate} placeholder="1" dark={dark} />
      {annual !== null && <ResultCard label="Taxa anual equivalente" value={fmtPct(annual)} highlight dark={dark} />}
    </View>
  )
}

function AnnualToMonthly({ dark }: { dark: boolean }) {
  const [rate, setRate] = useState('')
  const monthly = rate ? (Math.pow(1 + n(rate) / 100, 1 / 12) - 1) * 100 : null
  return (
    <View>
      <FieldInput label="Taxa anual (%)" value={rate} onChange={setRate} placeholder="12" dark={dark} />
      {monthly !== null && <ResultCard label="Taxa mensal equivalente" value={fmtPct(monthly)} highlight dark={dark} />}
    </View>
  )
}

function VacationCalc({ dark }: { dark: boolean }) {
  const [salary, setSalary] = useState('')
  const s = n(salary)
  const ferias = salary ? s + s / 3 : null
  return (
    <View>
      <FieldInput label="Salário bruto (R$)" value={salary} onChange={setSalary} placeholder="3000" dark={dark} />
      {ferias !== null && <>
        <ResultCard label="Total de férias (com 1/3)" value={fmt(ferias)} highlight dark={dark} />
        <ResultCard label="1/3 constitucional" value={fmt(s / 3)} dark={dark} />
        <ResultCard label="Salário base" value={fmt(s)} dark={dark} />
      </>}
    </View>
  )
}

function VacationProp({ dark }: { dark: boolean }) {
  const [salary, setSalary] = useState(''); const [months, setMonths] = useState('')
  const prop = salary && months ? (n(salary) / 12) * n(months) : null
  const total = prop ? prop + prop / 3 : null
  return (
    <View>
      <FieldInput label="Salário bruto (R$)" value={salary} onChange={setSalary} placeholder="3000" dark={dark} />
      <FieldInput label="Meses trabalhados" value={months} onChange={setMonths} placeholder="8" hint="Máximo 12 meses" dark={dark} />
      {total !== null && <>
        <ResultCard label="Total (com 1/3)" value={fmt(total)} highlight dark={dark} />
        <ResultCard label="Férias proporcionais" value={fmt(prop!)} dark={dark} />
        <ResultCard label="1/3 constitucional" value={fmt(prop! / 3)} dark={dark} />
      </>}
    </View>
  )
}

function NetSalary({ dark }: { dark: boolean }) {
  const [salary, setSalary] = useState('')
  const bruto = n(salary)
  const inss   = salary ? calcINSS(bruto) : null
  const irrf   = inss !== null ? Math.max(0, calcIRRF(bruto - inss)) : null
  const liquido = inss !== null && irrf !== null ? bruto - inss - irrf : null
  return (
    <View>
      <FieldInput label="Salário bruto (R$)" value={salary} onChange={setSalary} placeholder="3000" dark={dark} />
      {liquido !== null && <>
        <ResultCard label="Salário líquido" value={fmt(liquido)} highlight dark={dark} />
        <ResultCard label="Desconto INSS" value={fmt(inss!)} dark={dark} />
        <ResultCard label="Desconto IRRF" value={fmt(irrf!)} dark={dark} />
        <ResultCard label="Base de cálculo IR" value={fmt(bruto - inss!)} dark={dark} />
      </>}
    </View>
  )
}

function Overtime({ dark }: { dark: boolean }) {
  const [salary, setSalary] = useState(''); const [hours, setHours] = useState(''); const [pct, setPct] = useState('50')
  const valorHora  = salary ? n(salary) / 220 : null
  const valorExtra = valorHora && hours ? valorHora * (1 + n(pct) / 100) * n(hours) : null
  return (
    <View>
      <FieldInput label="Salário mensal (R$)" value={salary} onChange={setSalary} placeholder="3000" dark={dark} />
      <FieldInput label="Horas extras realizadas" value={hours} onChange={setHours} placeholder="10" dark={dark} />
      <SelectInput
        label="Adicional"
        value={pct}
        onChange={setPct}
        dark={dark}
        options={[
          { label: '50% — dias úteis', value: '50' },
          { label: '100% — domingos/feriados', value: '100' },
        ]}
      />
      {valorExtra !== null && <>
        <ResultCard label="Valor a receber" value={fmt(valorExtra)} highlight dark={dark} />
        <ResultCard label="Valor da hora normal" value={fmt(valorHora!)} dark={dark} />
        <ResultCard label="Valor da hora extra" value={fmt(valorHora! * (1 + n(pct) / 100))} dark={dark} />
      </>}
    </View>
  )
}

function Investment({ dark }: { dark: boolean }) {
  const [monthly, setMonthly] = useState(''); const [rate, setRate] = useState(''); const [periods, setPeriods] = useState('')
  const pmt = n(monthly); const r = n(rate) / 100; const p = n(periods)
  const fv    = monthly && rate && periods ? pmt * ((Math.pow(1 + r, p) - 1) / r) * (1 + r) : null
  const total = monthly && periods ? pmt * p : null
  return (
    <View>
      <FieldInput label="Aporte mensal (R$)" value={monthly} onChange={setMonthly} placeholder="500" dark={dark} />
      <FieldInput label="Taxa de juros mensal (%)" value={rate} onChange={setRate} placeholder="1" hint="Ex: Selic ÷ 12" dark={dark} />
      <FieldInput label="Período (meses)" value={periods} onChange={setPeriods} placeholder="24" dark={dark} />
      {fv !== null && <>
        <ResultCard label="Montante acumulado" value={fmt(fv)} highlight dark={dark} />
        <ResultCard label="Total investido" value={fmt(total!)} dark={dark} />
        <ResultCard label="Juros ganhos" value={fmt(fv - total!)} dark={dark} />
      </>}
    </View>
  )
}

function Thirteenth({ dark }: { dark: boolean }) {
  const [salary, setSalary] = useState(''); const [months, setMonths] = useState('')
  const value = salary && months ? (n(salary) / 12) * n(months) : null
  return (
    <View>
      <FieldInput label="Salário bruto (R$)" value={salary} onChange={setSalary} placeholder="3000" dark={dark} />
      <FieldInput label="Meses trabalhados no ano" value={months} onChange={setMonths} placeholder="12" hint="De 1 a 12" dark={dark} />
      {value !== null && <>
        <ResultCard label="13º proporcional (bruto)" value={fmt(value)} highlight dark={dark} />
        <ResultCard label="Por mês trabalhado" value={fmt(n(salary) / 12)} dark={dark} />
      </>}
    </View>
  )
}

function FGTSCalc({ dark }: { dark: boolean }) {
  const [salary, setSalary] = useState(''); const [months, setMonths] = useState('')
  const monthly = salary ? n(salary) * 0.08 : null
  const total   = monthly && months ? monthly * n(months) : null
  return (
    <View>
      <FieldInput label="Salário bruto (R$)" value={salary} onChange={setSalary} placeholder="3000" dark={dark} />
      <FieldInput label="Meses de contribuição" value={months} onChange={setMonths} placeholder="24" dark={dark} />
      {total !== null && <>
        <ResultCard label="Saldo estimado do FGTS" value={fmt(total)} highlight dark={dark} />
        <ResultCard label="Depósito mensal (8%)" value={fmt(monthly!)} dark={dark} />
        <Text style={{ fontSize: 11, color: dark ? '#6b7280' : '#9ca3af', marginTop: 4 }}>
          * Estimativa sem considerar rendimentos do FGTS
        </Text>
      </>}
    </View>
  )
}

const COMPONENTS: Record<CalcId, React.FC<{ dark: boolean }>> = {
  compound:          CompoundCalc,
  simple:            SimpleCalc,
  monthly_to_annual: MonthlyToAnnual,
  annual_to_monthly: AnnualToMonthly,
  vacation:          VacationCalc,
  vacation_prop:     VacationProp,
  net_salary:        NetSalary,
  overtime:          Overtime,
  investment:        Investment,
  thirteenth:        Thirteenth,
  fgts:              FGTSCalc,
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function CalculatorScreen() {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const [selected, setSelected] = useState<CalcId | null>(null)

  const c = {
    bg:     dark ? '#111827' : '#f3f4f6',
    card:   dark ? '#1f2937' : '#ffffff',
    text:   dark ? '#f9fafb' : '#111827',
    sub:    dark ? '#9ca3af' : '#6b7280',
    border: dark ? '#374151' : '#e5e7eb',
    active: dark ? '#1e3a5f' : '#dbeafe',
  }

  const active = CALCULATORS.find(calc => calc.id === selected)
  const ActiveCalc = selected ? COMPONENTS[selected] : null

  const handleBack = useCallback(() => setSelected(null), [])

  // ── Tela de lista ────────────────────────────────────────────────────────
  if (!selected) {
    return (
      <View style={[s.container, { backgroundColor: c.bg }]}>
        {/* Header */}
        <View style={[s.header, { backgroundColor: dark ? '#1f2937' : '#1e40af' }]}>
          <View style={[s.headerIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name="calculator-outline" size={22} color="#fff" />
          </View>
          <View>
            <Text style={s.headerTitle}>Calculadora Financeira</Text>
            <Text style={s.headerSub}>Ferramentas para o dia a dia</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={[s.listCard, { backgroundColor: c.card, borderColor: c.border }]}>
            {CALCULATORS.map((calc, idx) => (
              <TouchableOpacity
                key={calc.id}
                style={[
                  s.listItem,
                  { borderBottomColor: c.border },
                  idx === CALCULATORS.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => setSelected(calc.id)}
                activeOpacity={0.7}
              >
                <View style={[s.listIcon, { backgroundColor: dark ? '#374151' : '#f3f4f6' }]}>
                  <Ionicons name={calc.icon} size={18} color="#3b82f6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.listLabel, { color: c.text }]}>{calc.label}</Text>
                  <Text style={[s.listDesc, { color: c.sub }]}>{calc.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.sub} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    )
  }

  // ── Tela da calculadora ──────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header com botão voltar */}
      <View style={[s.header, { backgroundColor: dark ? '#1f2937' : '#1e40af' }]}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{active?.label}</Text>
          <Text style={s.headerSub}>{active?.description}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[s.calcCard, { backgroundColor: c.card, borderColor: c.border }]}>
          {ActiveCalc && <ActiveCalc dark={dark} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
  },
  headerIcon:  { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 4 },

  listCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1 },
  listIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  listLabel:{ fontSize: 14, fontWeight: '600' },
  listDesc: { fontSize: 12, marginTop: 2 },

  calcCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
})