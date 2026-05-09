import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, useColorScheme, Modal,
  TextInput
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import api from '../lib/api'

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  icon?: string
  user_id: string | null
  parent_id: string | null
}

const TYPE_OPTIONS = [
  { label: 'Todas',    value: 'all' },
  { label: 'Despesas', value: 'expense' },
  { label: 'Receitas', value: 'income' },
]

export default function CategoriesScreen() {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const c = {
    bg:     dark ? '#0f172a' : '#f8fafc',
    card:   dark ? '#1e293b' : '#ffffff',
    title:  dark ? '#f1f5f9' : '#1e293b',
    sub:    dark ? '#94a3b8' : '#64748b',
    border: dark ? '#334155' : '#e2e8f0',
    header: dark ? '#1e3a8a' : '#1e40af',
    input:  dark ? '#0f172a' : '#f1f5f9',
    sectionBg: dark ? '#0f172a' : '#f1f5f9',
  }

  const [categories, setCategories]   = useState<Category[]>([])
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [filter, setFilter]           = useState<'all' | 'expense' | 'income'>('all')
  const [modalVisible, setModalVisible] = useState(false)
  const [editCat, setEditCat]         = useState<Category | null>(null)
  const [modalName, setModalName]     = useState('')
  const [modalType, setModalType]     = useState<'expense' | 'income'>('expense')
  const [saving, setSaving]           = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await api.get('/api/categories')
      setCategories(res.data.data || [])
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as categorias.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => { setRefreshing(true); load() }

  const openNew = () => {
    setEditCat(null)
    setModalName('')
    setModalType('expense')
    setModalVisible(true)
  }

  const openEdit = (cat: Category) => {
    setEditCat(cat)
    setModalName(cat.name)
    setModalType(cat.type)
    setModalVisible(true)
  }

  const handleSave = async () => {
    if (!modalName.trim()) { Alert.alert('Atenção', 'Preencha o nome.'); return }
    setSaving(true)
    try {
      if (editCat) {
        await api.put(`/api/categories/${editCat.id}`, { name: modalName.trim(), type: modalType })
      } else {
        await api.post('/api/categories', { name: modalName.trim(), type: modalType })
      }
      setModalVisible(false)
      load()
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error?.message || 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (cat: Category) => {
    Alert.alert(
      'Excluir categoria',
      `Deseja excluir "${cat.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/categories/${cat.id}`)
              load()
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir.')
            }
          }
        }
      ]
    )
  }

  const expenses = categories.filter(c => c.type === 'expense')
  const incomes  = categories.filter(c => c.type === 'income')

  const showExpenses = filter === 'all' || filter === 'expense'
  const showIncomes  = filter === 'all' || filter === 'income'

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.header }]}>
        <View>
          <Text style={styles.headerTitle}>Categorias</Text>
          <Text style={styles.headerSubtitle}>Organize suas receitas e despesas</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={openNew} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Filtro */}
      <View style={[styles.filterRow, { backgroundColor: c.bg, borderBottomColor: c.border }]}>
        {TYPE_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setFilter(opt.value as any)}
            style={[
              styles.filterBtn,
              filter === opt.value
                ? { backgroundColor: '#3b82f6' }
                : { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }
            ]}
          >
            <Text style={[
              styles.filterText,
              { color: filter === opt.value ? '#fff' : c.sub }
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >

        {/* Despesas */}
        {showExpenses && (
          <>
            <Text style={[styles.sectionTitle, { color: c.sub }]}>
              DESPESAS ({expenses.length})
            </Text>
            <View style={styles.grid}>
              {expenses.map(cat => (
                <View key={cat.id} style={[styles.catCard, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[styles.catName, { color: c.title }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  <View style={styles.catActions}>
                    <TouchableOpacity onPress={() => openEdit(cat)}>
                      <Text style={styles.actionEdit}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(cat)}>
                      <Text style={styles.actionDelete}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Receitas */}
        {showIncomes && (
          <>
            <Text style={[styles.sectionTitle, { color: c.sub, marginTop: showExpenses ? 24 : 0 }]}>
              RECEITAS ({incomes.length})
            </Text>
            <View style={styles.grid}>
              {incomes.map(cat => (
                <View key={cat.id} style={[styles.catCard, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[styles.catName, { color: c.title }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  <View style={styles.catActions}>
                    <TouchableOpacity onPress={() => openEdit(cat)}>
                      <Text style={styles.actionEdit}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(cat)}>
                      <Text style={styles.actionDelete}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {categories.length === 0 && (
          <View style={styles.center}>
            <Ionicons name="pricetag-outline" size={48} color={dark ? '#334155' : '#cbd5e1'} />
            <Text style={[styles.emptyText, { color: c.sub }]}>Nenhuma categoria encontrada</Text>
          </View>
        )}

      </ScrollView>

      {/* Modal criar/editar */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modalContent, { backgroundColor: c.card }]}>
            <Text style={[styles.modalTitle, { color: c.title }]}>
              {editCat ? 'Editar categoria' : 'Nova categoria'}
            </Text>

            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.input, color: c.title, borderColor: c.border }]}
              value={modalName}
              onChangeText={setModalName}
              placeholder="Ex: Alimentação, Salário..."
              placeholderTextColor={c.sub}
            />

            <Text style={styles.label}>Tipo</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.typeBtn, modalType === 'expense' ? styles.typeBtnActive : { backgroundColor: c.input, borderColor: c.border }]}
                onPress={() => setModalType('expense')}
              >
                <Ionicons name="arrow-down" size={14} color={modalType === 'expense' ? '#fff' : c.sub} />
                <Text style={{ color: modalType === 'expense' ? '#fff' : c.sub, fontWeight: '600', marginLeft: 4 }}>
                  Despesa
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, modalType === 'income' ? styles.typeBtnIncome : { backgroundColor: c.input, borderColor: c.border }]}
                onPress={() => setModalType('income')}
              >
                <Ionicons name="arrow-up" size={14} color={modalType === 'income' ? '#fff' : c.sub} />
                <Text style={{ color: modalType === 'income' ? '#fff' : c.sub, fontWeight: '600', marginLeft: 4 }}>
                  Receita
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: c.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: c.sub }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveText}>Salvar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 60 },
  header:        { paddingHorizontal: 20, paddingTop: 58, paddingBottom: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerTitle:   { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSubtitle:{ color: '#93c5fd', fontSize: 13, marginTop: 2 },
  newBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  newBtnText:    { color: '#fff', fontSize: 14, fontWeight: '600' },
  filterRow:     { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  filterBtn:     { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  filterText:    { fontSize: 13, fontWeight: '600' },
  sectionTitle:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard:       { width: '47%', borderRadius: 12, borderWidth: 1, padding: 14, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
  catName:       { fontSize: 14, fontWeight: '600' },
  catActions:    { flexDirection: 'row', gap: 12 },
  actionEdit:    { fontSize: 13, color: '#3b82f6', fontWeight: '500' },
  actionDelete:  { fontSize: 13, color: '#ef4444', fontWeight: '500' },
  emptyText:     { fontSize: 15, fontWeight: '500' },
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 15 },
  modalContent:  { borderRadius: 16, padding: 20 },
  modalTitle:    { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  label:         { fontSize: 11, fontWeight: '700', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', color: '#94a3b8' },
  input:         { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, height: 48 },
  typeBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, borderWidth: 1 },
  typeBtnActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  typeBtnIncome: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  modalFooter:   { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn:     { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  saveBtn:       { flex: 1, padding: 16, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center' },
  saveText:      { color: '#fff', fontWeight: '700' },
})