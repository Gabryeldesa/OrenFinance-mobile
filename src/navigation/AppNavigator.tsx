import React, { useEffect, useState, useRef } from 'react'
import {
  ActivityIndicator, View, Text, StyleSheet,
  TouchableOpacity, Animated, Pressable, useColorScheme,
  BackHandler
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  NavigationContainer, DarkTheme, DefaultTheme,
  useNavigationContainerRef
} from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import api from '../lib/api'
import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen'
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
  visible: boolean
  onClose: () => void
  onNavigate: (key: string) => void
  dark: boolean
  isAdmin: boolean
}) {
  // ✅ Começa em +320 (fora da tela para a direita)
  const slideAnim = useRef(new Animated.Value(320)).current
  const fadeAnim  = useRef(new Animated.Value(0)).current
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        // ✅ Desliza da direita para o centro (320 → 0)
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        // ✅ Volta para a direita (0 → 320)
        Animated.timing(slideAnim, { toValue: 320, duration: 220, useNativeDriver: true }),
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

      {/* ✅ Painel ancorado à direita com sombra para a esquerda */}
      <Animated.View style={[
        styles.sidePanel,
        { backgroundColor: c.bg, transform: [{ translateX: slideAnim }] }
      ]}>
        <View style={[styles.menuHeader, { backgroundColor: c.header, paddingTop: insets.top + 20 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <View style={styles.menuLogoRow}>
            <Text style={styles.menuAppName}>Oren Finance</Text>
            <View style={styles.menuLogoWrap}>
              <OrenLogo size={22} color="#ffffff" />
            </View>
          </View>
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

function EmptyScreen() {
  return <View style={{ flex: 1 }} />
}

function AppContent({
  onLogout, onImpersonate, onMenuOpen, isAdmin, dark, menuVisible, setMenuVisible, navigationRef
}: {
  onLogout: () => void
  onImpersonate: (email: string) => void
  onMenuOpen: () => void
  isAdmin: boolean
  dark: boolean
  menuVisible: boolean
  setMenuVisible: (v: boolean) => void
  navigationRef: any
}) {
  const insets = useSafeAreaInsets()
  const tabBarHeight = 58 + insets.bottom

  const tabBarStyle = {
    backgroundColor: dark ? '#1e293b' : '#ffffff',
    borderTopColor:  dark ? '#334155' : '#f1f5f9',
    borderTopWidth: 1,
    paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
    paddingTop: 8,
    height: tabBarHeight,
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menuVisible) {
        setMenuVisible(false)
        return true
      }
      try {
        const nav = navigationRef.current
        if (nav?.canGoBack()) {
          nav.goBack()
        } else {
          nav?.navigate('Dashboard' as never)
        }
      } catch {
        navigationRef.current?.navigate('Dashboard' as never)
      }
      return true
    })
    return () => sub.remove()
  }, [menuVisible])

  // ✅ Cor inativa igual às outras abas — sem azul fixo
  const inactiveColor = dark ? '#475569' : '#94a3b8'

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   '#3b82f6',
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
          ),
        }}
      >
        {(props) => <DashboardScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>

      <Tab.Screen
        name="Transações"
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'swap-horizontal' : 'swap-horizontal-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Contas"
        component={AccountsScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Cartões"
        component={CardsScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'card' : 'card-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* ✅ Menu último = lado direito da tab bar, cor inativa correta */}
      <Tab.Screen
        name="Menu"
        component={EmptyScreen}
        options={{
          tabBarButton: () => (
            <TouchableOpacity
              style={styles.menuTabButton}
              onPress={onMenuOpen}
              activeOpacity={0.7}
            >
              <Ionicons name="menu" size={24} color={inactiveColor} />
              <Text style={[styles.menuTabLabel, { color: inactiveColor }]}>Menu</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {/* Telas do menu lateral */}
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
        {(props) => <AdminScreen {...props} onImpersonate={onImpersonate} />}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const [loading, setLoading]                   = useState(true)
  const [loggedIn, setLoggedIn]                 = useState(false)
  const [authScreen, setAuthScreen]             = useState<'login' | 'register' | 'forgot'>('login')
  const [menuVisible, setMenuVisible]           = useState(false)
  const [isAdmin, setIsAdmin]                   = useState(false)
  const [impersonating, setImpersonating]       = useState(false)
  const [impersonateEmail, setImpersonateEmail] = useState('')

  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const navigationRef = useNavigationContainerRef()
  const navRef = useRef(navigationRef)
  const insets = useSafeAreaInsets()

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

  useEffect(() => {
    if (!loggedIn) { setIsAdmin(false); return }
    api.get('/api/admin/check')
      .then(res => setIsAdmin(res.data?.data?.is_admin === true))
      .catch(() => setIsAdmin(false))
  }, [loggedIn])

  const handleLogin  = () => { setAuthScreen('login'); setLoggedIn(true) }
  const handleLogout = () => { setLoggedIn(false); setAuthScreen('login'); setIsAdmin(false) }

  const handleImpersonate = (email: string) => {
    setImpersonating(true)
    setImpersonateEmail(email)
    setMenuVisible(false)
    setTimeout(() => navigationRef.navigate('Dashboard' as never), 100)
  }

  const handleStopImpersonate = async () => {
    await AsyncStorage.multiRemove(['impersonate_id', 'impersonate_email'])
    setImpersonating(false)
    setImpersonateEmail('')
    navigationRef.navigate('Dashboard' as never)
  }

  const handleMenuNavigate = (key: string) => {
    setMenuVisible(false)
    setTimeout(() => {
      if (NAVIGABLE.includes(key)) navigationRef.navigate(key as never)
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
    if (authScreen === 'register')
      return <RegisterScreen onBack={() => setAuthScreen('login')} onLogin={() => setAuthScreen('login')} />
    if (authScreen === 'forgot')
      return <ForgotPasswordScreen onBack={() => setAuthScreen('login')} />
    return (
      <LoginScreen
        onLogin={handleLogin}
        onRegister={() => setAuthScreen('register')}
        onForgot={() => setAuthScreen('forgot')}
      />
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {impersonating && (
        <View style={[styles.impersonateBanner, { paddingTop: insets.top + 10 }]}>
          <Ionicons name="warning-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.impersonateText} numberOfLines={1}>
            Navegando como <Text style={{ fontWeight: '700' }}>{impersonateEmail}</Text>
          </Text>
          <TouchableOpacity onPress={handleStopImpersonate} style={styles.impersonateBtn}>
            <Text style={styles.impersonateBtnText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      )}

      <NavigationContainer
        ref={navigationRef}
        theme={dark ? DarkTheme : DefaultTheme}
        onReady={() => { navRef.current = navigationRef }}
      >
        <AppContent
          onLogout={handleLogout}
          onImpersonate={handleImpersonate}
          onMenuOpen={() => setMenuVisible(true)}
          isAdmin={isAdmin}
          dark={dark}
          menuVisible={menuVisible}
          setMenuVisible={setMenuVisible}
          navigationRef={navRef}
        />
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

  // ✅ Ancorado à DIREITA, sombra para a esquerda
  sidePanel: {
    position: 'absolute',
    right: 0,          // ← era left: 0
    top: 0,
    bottom: 0,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },  // ← sombra para a esquerda
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 16,
  },

  menuHeader: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    // ✅ Botão fechar à esquerda, logo+nome à direita (espelhado)
    justifyContent: 'space-between',
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

  menuTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  menuTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  impersonateBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#d97706',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  impersonateText:    { flex: 1, color: '#fff', fontSize: 13 },
  impersonateBtn:     { backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  impersonateBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
})