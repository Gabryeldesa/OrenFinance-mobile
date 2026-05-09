import React, { useEffect, useState, useRef } from 'react'
import {
  ActivityIndicator, View, Text, StyleSheet,
  TouchableOpacity, Animated, Pressable, useColorScheme
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'

import api from '../lib/api'
import LoginScreen from '../screens/LoginScreen'
import DashboardScreen from '../screens/DashboardScreen'
import TransactionsScreen from '../screens/TransactionsScreen'
import AccountsScreen from '../screens/AccountsScreen'
import CardsScreen from '../screens/CardsScreen'
import GoalsScreen from '../screens/GoalsScreen'
import CategoriesScreen from '../screens/CategoriesScreen'
import RecurringScreen from '../screens/RecurringScreen'
import ReportsScreen from '../screens/ReportsScreen'
import TransfersScreen from '../screens/TransfersScreen'
import CalendarScreen from '../screens/CalendarScreen'
import SettingsScreen from '../screens/SettingsScreen'
import ImportScreen from '../screens/ImportScreen'
import AdminScreen from '../screens/AdminScreen'
import CalculatorScreen from '../screens/CalculatorScreen'
import OrenLogo from '../components/OrenLogo'

const Tab = createBottomTabNavigator()

const MENU_ITEMS = [
  { key: 'Metas',          label: 'Metas',          icon: 'trophy-outline' as const },
  { key: 'Categorias',     label: 'Categorias',     icon: 'pricetag-outline' as const },
  { key: 'Recorrentes',    label: 'Recorrentes',    icon: 'repeat-outline' as const },
  { key: 'Relatórios',     label: 'Relatórios',     icon: 'bar-chart-outline' as const },
  { key: 'Transferências', label: 'Transferências', icon: 'swap-horizontal-outline' as const },
  { key: 'Calendário',     label: 'Calendário',     icon: 'calendar-outline' as const },
  { key: 'Importar',       label: 'Importar',       icon: 'download-outline' as const },
  { key: 'Calculadora',    label: 'Calculadora',    icon: 'calculator-outline' as const },
  { key: 'Configurações',  label: 'Configurações',  icon: 'settings-outline' as const },
  { key: 'Admin',          label: 'Admin',          icon: 'shield-checkmark-outline' as const },
]

const NAVIGABLE = [
  'Metas', 'Categorias', 'Recorrentes', 'Relatórios',
  'Transferências', 'Calendário', 'Importar', 'Calculadora', 'Configurações', 'Admin',
]

function SideMenu({ visible, onClose, onNavigate, dark, isAdmin }: {
  visible: boolean; onClose: () => void; onNavigate: (key: string) => void
  dark: boolean; isAdmin: boolean
}) {
  const slideAnim = useRef(new Animated.Value(-320)).current
  const fadeAnim  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -320, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start()
    }
  }, [visible])

  if (!visible) return null

  const c = {
    bg:     dark ? '#1e293b' : '#ffffff',
    text:   dark ? '#f1f5f9' : '#1e293b',
    sub:    dark ? '#94a3b8' : '#64748b',
    border: dark ? '#334155' : '#f1f5f9',
    item:   dark ? '#0f172a' : '#f8fafc',
    header: dark ? '#0f172a' : '#1e40af',
  }

  const visibleItems = MENU_ITEMS.filter(item => item.key !== 'Admin' || isAdmin)

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sidePanel, { backgroundColor: c.bg, transform: [{ translateX: slideAnim }] }]}>
        <View style={[styles.menuHeader, { backgroundColor: c.header }]}>
          <View style={styles.menuLogoRow}>
            <View style={styles.menuLogoWrap}>
              <OrenLogo size={22} color="#ffffff" />
            </View>
            <Text style={styles.menuAppName}>Oren Finance</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuItems}>
          <Text style={[styles.menuSection, { color: c.sub }]}>NAVEGAÇÃO</Text>
          {visibleItems.map(item => {
            const ready = NAVIGABLE.includes(item.key)
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.menuItem, { borderBottomColor: c.border }]}
                onPress={() => onNavigate(item.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: c.item }]}>
                  <Ionicons name={item.icon} size={18} color={ready ? '#3b82f6' : '#94a3b8'} />
                </View>
                <Text style={[styles.menuItemText, { color: ready ? c.text : c.sub }]}>
                  {item.label}
                </Text>
                {ready
                  ? <Ionicons name="chevron-forward" size={14} color={c.sub} />
                  : <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: '600' }}>Em breve</Text>
                }
              </TouchableOpacity>
            )
          })}
        </View>
      </Animated.View>
    </View>
  )
}

export default function AppNavigator() {
  const [loading, setLoading]                   = useState(true)
  const [loggedIn, setLoggedIn]                 = useState(false)
  const [menuVisible, setMenuVisible]           = useState(false)
  const [isAdmin, setIsAdmin]                   = useState(false)
  const [impersonating, setImpersonating]       = useState(false)
  const [impersonateEmail, setImpersonateEmail] = useState('')

  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const navigationRef = useRef<any>(null)

  // Carrega token e impersonation iniciais
  useEffect(() => {
    AsyncStorage.multiGet(['token', 'impersonate_id', 'impersonate_email']).then(pairs => {
      const token         = pairs[0][1]
      const impersonateId = pairs[1][1]
      const impEmail      = pairs[2][1]
      setLoggedIn(!!token)
      setImpersonating(!!impersonateId)
      setImpersonateEmail(impEmail || '')
      setLoading(false)
    })
  }, [])

  // Verifica admin sempre que logar
  useEffect(() => {
    if (!loggedIn) { setIsAdmin(false); return }
    api.get('/api/admin/check')
      .then(res => setIsAdmin(res.data?.data?.is_admin === true))
      .catch(() => setIsAdmin(false))
  }, [loggedIn])

  const handleLogin = () => setLoggedIn(true)

  const handleLogout = () => {
    setLoggedIn(false)
    setIsAdmin(false)
  }

  const handleImpersonate = (email: string) => {
    setImpersonating(true)
    setImpersonateEmail(email)
    setMenuVisible(false)
    setTimeout(() => navigationRef.current?.navigate('Dashboard'), 100)
  }

  const handleStopImpersonate = async () => {
    await AsyncStorage.multiRemove(['impersonate_id', 'impersonate_email'])
    setImpersonating(false)
    setImpersonateEmail('')
    navigationRef.current?.navigate('Dashboard')
  }

  const handleMenuNavigate = (key: string) => {
    setMenuVisible(false)
    setTimeout(() => {
      if (NAVIGABLE.includes(key)) {
        navigationRef.current?.navigate(key)
      } else {
        const label = MENU_ITEMS.find(m => m.key === key)?.label
        alert(`Tela "${label}" em breve!`)
      }
    }, 300)
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? '#0f172a' : '#f8fafc' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  if (!loggedIn) {
    return <LoginScreen onLogin={handleLogin} />
  }

  const tabBarStyle = {
    backgroundColor: dark ? '#1e293b' : '#ffffff',
    borderTopColor:  dark ? '#334155' : '#f1f5f9',
    borderTopWidth: 1,
    paddingBottom: 10,
    paddingTop: 8,
    height: 68,
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Banner de impersonation */}
      {impersonating && (
        <View style={styles.impersonateBanner}>
          <Ionicons name="warning-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.impersonateText} numberOfLines={1}>
            Navegando como <Text style={{ fontWeight: '700' }}>{impersonateEmail}</Text>
          </Text>
          <TouchableOpacity onPress={handleStopImpersonate} style={styles.impersonateBtn}>
            <Text style={styles.impersonateBtnText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      )}

      <NavigationContainer ref={navigationRef} theme={dark ? DarkTheme : DefaultTheme}>
        <Tab.Navigator
          initialRouteName="Dashboard"
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
              const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                'Menu':       'menu',
                'Dashboard':  focused ? 'grid' : 'grid-outline',
                'Transações': focused ? 'swap-horizontal' : 'swap-horizontal-outline',
                'Contas':     focused ? 'wallet' : 'wallet-outline',
                'Cartões':    focused ? 'card' : 'card-outline',
              }
              return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />
            },
            tabBarActiveTintColor:   '#3b82f6',
            tabBarInactiveTintColor: dark ? '#475569' : '#94a3b8',
            tabBarStyle,
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          })}
        >
          <Tab.Screen
            name="Menu"
            component={View}
            listeners={{ tabPress: e => { e.preventDefault(); setMenuVisible(true) } }}
          />
          <Tab.Screen name="Dashboard">
            {(props) => <DashboardScreen {...props} onLogout={handleLogout} />}
          </Tab.Screen>
          <Tab.Screen name="Transações"    component={TransactionsScreen} />
          <Tab.Screen name="Contas"        component={AccountsScreen} />
          <Tab.Screen name="Cartões"       component={CardsScreen} />

          {/* Abas ocultas */}
          <Tab.Screen name="Metas"          component={GoalsScreen}        options={{ tabBarButton: () => null, tabBarStyle }} />
          <Tab.Screen name="Categorias"     component={CategoriesScreen}   options={{ tabBarButton: () => null, tabBarStyle }} />
          <Tab.Screen name="Recorrentes"    component={RecurringScreen}    options={{ tabBarButton: () => null, tabBarStyle }} />
          <Tab.Screen name="Relatórios"     component={ReportsScreen}      options={{ tabBarButton: () => null, tabBarStyle }} />
          <Tab.Screen name="Transferências" component={TransfersScreen}    options={{ tabBarButton: () => null, tabBarStyle }} />
          <Tab.Screen name="Calendário"     component={CalendarScreen}     options={{ tabBarButton: () => null, tabBarStyle }} />
          <Tab.Screen name="Importar"       component={ImportScreen}       options={{ tabBarButton: () => null, tabBarStyle }} />
          <Tab.Screen name="Calculadora"    component={CalculatorScreen}   options={{ tabBarButton: () => null, tabBarStyle }} />
          <Tab.Screen name="Configurações"  component={SettingsScreen}     options={{ tabBarButton: () => null, tabBarStyle }} />
          <Tab.Screen
            name="Admin"
            options={{ tabBarButton: () => null, tabBarStyle }}
          >
            {(props) => <AdminScreen {...props} onImpersonate={handleImpersonate} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>

      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        dark={dark}
        isAdmin={isAdmin}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sidePanel: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 280,
    shadowColor: '#000', shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 16,
  },
  menuHeader: {
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  menuLogoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuLogoWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1e40af',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  menuAppName:  { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  closeBtn:     { padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  menuItems:    { flex: 1, paddingTop: 16, paddingHorizontal: 16 },
  menuSection:  { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  menuItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  menuIconWrap: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: '500' },

  // Banner impersonation
  impersonateBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#d97706',
    paddingHorizontal: 14, paddingVertical: 10,
    paddingTop: 50,
  },
  impersonateText:    { flex: 1, color: '#fff', fontSize: 13 },
  impersonateBtn:     { backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  impersonateBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
})