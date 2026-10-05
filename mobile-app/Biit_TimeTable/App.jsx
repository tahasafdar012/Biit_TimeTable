import { StatusBar, View } from 'react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider, SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@react-native-vector-icons/ionicons'

import HomeScreen from './src/HomeScreen';
//import SplashScreen from './src/SplashScreen';
import SettingScreen from './src/SettingScreen';
import WeeksScreen from './src/WeeksScreen'

import { getSavedSection } from './src/storage/sectionStorage';
import SelectSectionScreen from './src/SelectSectionScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: 'home',
  Schedule: 'calendar',
  Settings: 'settings',
};

const BottomTabs = ({ route }) => {
  const { section } = route.params ?? {};
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons
            name={focused ? TAB_ICONS[route.name] : `${TAB_ICONS[route.name]}-outline`}
            size={size}
            color={color}
          />
        ),
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
        tabBarLabelStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.background },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} initialParams={{ section }} options={{ title: 'Today' }} />
      <Tab.Screen name="Schedule" component={WeeksScreen} initialParams={{ section }} options={{ title: 'Weekly Schedule', tabBarLabel: 'Schedule' }} />
      <Tab.Screen name="Settings" component={SettingScreen} initialParams={{ section }} />
    </Tab.Navigator>
  );
};

const Root = () => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  // undefined = still loading, null = no section saved yet
  const [savedSection, setSavedSection] = useState(undefined);

  useEffect(() => {
    getSavedSection()
      .then(section => setSavedSection(section ?? null))
      .catch(() => setSavedSection(null));
  }, []);

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [isDark, colors]);

  if (savedSection === undefined) return null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.statusBar }}>
      {/* The app draws edge-to-edge, so paint our own strip behind the status bar */}
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.statusBar}
      />
      <View style={{ height: insets.top, backgroundColor: colors.statusBar }} />
      {/* The strip above already covers the top inset, so screens and headers below shouldn't add it again */}
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>
        <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={savedSection ? "MainTabs" : "SelectSection"}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          name="MainTabs"
          component={BottomTabs}
          initialParams={{ section: savedSection }}
        />
        <Stack.Screen name="SelectSection" component={SelectSectionScreen} />
      {/*
        <Stack.Screen name="SplashScreen" component={SplashScreen} />
        */}
      </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaInsetsContext.Provider>
    </View>
  )
}

const App = () => (
  <SafeAreaProvider>
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  </SafeAreaProvider>
)

export default App
