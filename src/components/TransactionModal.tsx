import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Alert, useColorScheme, Switch, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../lib/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const formatDateDisplay = (d: Date) => {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export default function TransactionModal({ visible, onClose, onSuccess }: Props) {
  const dark = useColorScheme() === 'dark';

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'cash'>('pix');
  const [accountId, setAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(true);
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);

  const c = {
    bg: dark ? '#0f172a' : '#f8fafc',
    card: dark ? '#1e293b' : '#ffffff',
    text: dark ? '#f1f5f9' : '#1e293b',
    input: dark ? '#0f172a' : '#f1f5f9',
    border: dark ? '#334155' : '#e2e8f0',
    sub: dark ? '#94a3b8' : '#64748b'
  };

  useEffect(() => {
    if (visible) {
      loadOptions()
      // resetar parcelado ao abrir
      setIsInstallment(false)
      setTotalInstallments('')
    }
  }, [visible]);

  const loadOptions = async () => {
    try {
      const [resCat, resAcc, resCards] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/accounts'),
        api.get('/api/cards')
      ]);
      setCategories(resCat.data.data || []);
      setAccounts(resAcc.data.data || []);
      setCards(resCards.data.data || []);
      const accs = resAcc.data.data || []
      if (accs.length > 0) setAccountId(accs[0].id)
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as opções.')
    }
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false)
    if (selectedDate) setDate(selectedDate)
  };

  const handleSave = async () => {
    if (!description.trim()) { Alert.alert('Atenção', 'Preencha a descrição.'); return }
    if (!amount) { Alert.alert('Atenção', 'Preencha o valor.'); return }
    if (!categoryId) { Alert.alert('Atenção', 'Selecione uma categoria.'); return }
    if (isInstallment && (!totalInstallments || parseInt(totalInstallments) < 2)) {
      Alert.alert('Atenção', 'Informe o número de parcelas (mínimo 2).')
      return
    }

    setLoading(true);
    try {
      const cleanValue = amount.replace(/\./g, '').replace(',', '.')
      const totalCents = Math.round(parseFloat(cleanValue) * 100)

      if (isNaN(totalCents) || totalCents <= 0) {
        Alert.alert('Atenção', 'Valor inválido.')
        setLoading(false)
        return
      }

      if (isInstallment && paymentMethod === 'credit_card') {
        // Lógica de parcelado: cria N transações, uma por mês
        const n = parseInt(totalInstallments)
        const installmentCents = Math.round(totalCents / n)

        for (let i = 0; i < n; i++) {
          const installmentDate = new Date(date)
          installmentDate.setMonth(installmentDate.getMonth() + i)

          const payload: any = {
            description: `${description.trim()} (${i + 1}/${n})`,
            amount_cents: installmentCents,
            type,
            category_id: categoryId,
            payment_method: 'credit_card',
            is_confirmed: isConfirmed,
            date: installmentDate.toISOString().split('T')[0],
            credit_card_id: creditCardId || null,
            account_id: null,
          }

          await api.post('/api/transactions', payload)
        }
      } else {
        // Transação normal
        const payload: any = {
          description: description.trim(),
          amount_cents: totalCents,
          type,
          category_id: categoryId,
          payment_method: paymentMethod,
          is_confirmed: isConfirmed,
          date: date.toISOString().split('T')[0],
        }

        if (paymentMethod === 'credit_card') {
          payload.credit_card_id = creditCardId || null
          payload.account_id = null
        } else {
          payload.account_id = accountId || null
          payload.credit_card_id = null
        }

        await api.post('/api/transactions', payload)
      }

      // Limpar campos
      setDescription('')
      setAmount('')
      setCategoryId('')
      setPaymentMethod('pix')
      setDate(new Date())
      setShowDatePicker(false)
      setIsInstallment(false)
      setTotalInstallments('')
      onSuccess()
      onClose()

    } catch (err: any) {
      const errorData = err.response?.data?.error
      if (errorData?.code === 'VALIDATION_ERROR') {
        const details = errorData.details?.map((d: any) => `${d.field}: ${d.message}`).join('\n')
        Alert.alert('Erro de Validação', details || errorData.message)
      } else {
        Alert.alert('Erro', errorData?.message || 'Não foi possível salvar.')
      }
    } finally {
      setLoading(false)
    }
  };

  const SelectionGrid = ({ data, selectedId, onSelect }: any) => (
    <View style={styles.grid}>
      {(data || []).map((item: any) => (
        <TouchableOpacity
          key={item.id}
          onPress={() => onSelect(item.id)}
          style={[
            styles.gridItem,
            { backgroundColor: c.input, borderColor: selectedId === item.id ? '#3b82f6' : c.border }
          ]}
        >
          <Text style={{ color: selectedId === item.id ? '#3b82f6' : c.text, fontSize: 12, fontWeight: '600' }}>
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const paymentOptions: { l: string; v: 'pix' | 'credit_card' | 'cash' }[] = [
    { l: 'Pix', v: 'pix' },
    { l: 'Cartão', v: 'credit_card' },
    { l: 'Dinheiro', v: 'cash' },
  ]

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: c.card }]}>
          <Text style={[styles.modalTitle, { color: c.text }]}>Nova transação</Text>

          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'expense' ? styles.btnRed : { backgroundColor: c.input }]}
              onPress={() => setType('expense')}
            >
              <Text style={styles.toggleText}>↓ Despesa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'income' ? styles.btnGreen : { backgroundColor: c.input }]}
              onPress={() => setType('income')}
            >
              <Text style={styles.toggleText}>↑ Receita</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.input, color: c.text, borderColor: c.border }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Mercado"
              placeholderTextColor={c.sub}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  {isInstallment ? 'Total (R$)' : 'Valor (R$)'}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.input, color: c.text, borderColor: c.border }]}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0,00"
                  placeholderTextColor={c.sub}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Data</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(!showDatePicker)}
                  style={[styles.input, { backgroundColor: c.input, borderColor: showDatePicker ? '#3b82f6' : c.border, justifyContent: 'center' }]}
                >
                  <Text style={{ color: c.text }}>{formatDateDisplay(date)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <View style={{ marginTop: 8, marginBottom: 4 }}>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onChangeDate}
                  maximumDate={new Date()}
                  themeVariant={dark ? 'dark' : 'light'}
                  locale="pt-BR"
                  style={{ width: '100%' }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={{ marginTop: 8, padding: 12, backgroundColor: '#3b82f6', borderRadius: 8, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Confirmar data</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={styles.label}>Categoria</Text>
            <SelectionGrid data={categories} selectedId={categoryId} onSelect={setCategoryId} />

            <Text style={styles.label}>Pagamento</Text>
            <View style={styles.grid}>
              {paymentOptions.map((m) => (
                <TouchableOpacity
                  key={m.v}
                  onPress={() => {
                    setPaymentMethod(m.v)
                    // Se sair do cartão, desativa parcelado
                    if (m.v !== 'credit_card') {
                      setIsInstallment(false)
                      setTotalInstallments('')
                    }
                  }}
                  style={[styles.gridItem, { backgroundColor: c.input, borderColor: paymentMethod === m.v ? '#3b82f6' : c.border }]}
                >
                  <Text style={{ color: paymentMethod === m.v ? '#3b82f6' : c.text }}>{m.l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {paymentMethod === 'credit_card' ? (
              <>
                <Text style={styles.label}>Qual Cartão?</Text>
                <SelectionGrid data={cards} selectedId={creditCardId} onSelect={setCreditCardId} />

                {/* Parcelado — só aparece com cartão */}
                <TouchableOpacity
                  onPress={() => {
                    setIsInstallment(v => !v)
                    setTotalInstallments('')
                  }}
                  style={[styles.checkRow, { backgroundColor: c.input, borderColor: isInstallment ? '#3b82f6' : c.border }]}
                >
                  <View style={[styles.checkbox, {
                    borderColor: isInstallment ? '#3b82f6' : c.border,
                    backgroundColor: isInstallment ? '#3b82f6' : c.input
                  }]}>
                    {isInstallment && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                  </View>
                  <Text style={{ color: c.text, fontSize: 14 }}>Compra parcelada</Text>
                </TouchableOpacity>

                {isInstallment && (
                  <>
                    <Text style={styles.label}>Número de parcelas</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.input, color: c.text, borderColor: c.border }]}
                      value={totalInstallments}
                      onChangeText={setTotalInstallments}
                      keyboardType="numeric"
                      placeholder="Ex: 12"
                      placeholderTextColor={c.sub}
                    />
                    {amount && totalInstallments && parseInt(totalInstallments) >= 2 && (
                      <Text style={{ color: c.sub, fontSize: 12, marginTop: 6 }}>
                        {parseInt(totalInstallments)}x de{' '}
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          Math.round(parseFloat(amount.replace(/\./g, '').replace(',', '.')) * 100) /
                          parseInt(totalInstallments) / 100
                        )}
                      </Text>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <Text style={styles.label}>Qual Conta?</Text>
                <SelectionGrid data={accounts} selectedId={accountId} onSelect={setAccountId} />
              </>
            )}

            <View style={styles.checkboxRow}>
              <Switch value={isConfirmed} onValueChange={setIsConfirmed} trackColor={{ true: '#3b82f6' }} />
              <Text style={{ color: c.text, marginLeft: 8 }}>Confirmada</Text>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: c.border }]} onPress={onClose}>
                <Text style={{ color: c.sub }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveText}>
                      {isInstallment && totalInstallments && parseInt(totalInstallments) >= 2
                        ? `Salvar ${totalInstallments}x`
                        : 'Salvar'
                      }
                    </Text>
                }
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 15 },
  content:     { borderRadius: 16, padding: 20, maxHeight: '92%' },
  modalTitle:  { fontSize: 18, fontWeight: '800', marginBottom: 15 },
  typeToggle:  { flexDirection: 'row', gap: 10, marginBottom: 15 },
  toggleBtn:   { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  btnRed:      { backgroundColor: '#ef4444' },
  btnGreen:    { backgroundColor: '#22c55e' },
  toggleText:  { color: '#fff', fontWeight: 'bold' },
  label:       { fontSize: 11, fontWeight: '700', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', color: '#94a3b8' },
  input:       { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, height: 48 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem:    { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 2, minWidth: '30%', alignItems: 'center' },
  checkRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, borderWidth: 1, marginTop: 14 },
  checkbox:    { width: 20, height: 20, borderRadius: 4, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 25 },
  footer:      { flexDirection: 'row', gap: 10, marginTop: 30, marginBottom: 10 },
  cancelBtn:   { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  saveBtn:     { flex: 1, padding: 16, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center' },
  saveText:    { color: '#fff', fontWeight: '700' }
});