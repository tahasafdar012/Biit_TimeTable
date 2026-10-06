import { StatusBar, View, StyleSheet } from 'react-native'
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
import { TimetableProvider } from './src/timetable/TimetableContext';
import TabBarButton from './src/components/TabBarButton';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_BAR_HEIGHT = 66;

const TAB_ICONS = {
  Home: 'home',
  Schedule: 'calendar',
  Settings: 'settings',
};

// The tabs share one offline-first timetable for the selected section
const BottomTabs = ({ route }) => {
  const { section } = route.params ?? {};
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets(); // room for the phone's gesture / button bar
  return (
    <TimetableProvider section={section}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Active tab: filled icon on a soft green pill. Others: outline icon.
        tabBarIcon: ({ focused, color }) => (
          <View style={[styles.tabIcon, focused && { backgroundColor: colors.primarySoft }]}>
            <Ionicons
              name={focused ? TAB_ICONS[route.name] : `${TAB_ICONS[route.name]}-outline`}
              size={22}
              color={color}
            />
          </View>
        ),
        tabBarButton: props => <TabBarButton {...props} />,
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: [
          styles.tabBar,
          { height: TAB_BAR_HEIGHT + bottom, backgroundColor: colors.tabBar, borderTopColor: colors.border },
        ],
        tabBarLabelStyle: styles.tabLabel,
        sceneStyle: { backgroundColor: colors.background },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Today' }} />
      <Tab.Screen name="Schedule" component={WeeksScreen} options={{ title: 'Weekly Schedule', tabBarLabel: 'Schedule' }} />
      <Tab.Screen name="Settings" component={SettingScreen} />
    </Tab.Navigator>
    </TimetableProvider>
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

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    // soft shadow above the bar instead of a hard line
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  tabIcon: {
    width: 56,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
