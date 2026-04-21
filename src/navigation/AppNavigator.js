import React, { useRef, useEffect } from 'react';
import { Platform, Animated, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';

import DashboardScreen       from '../screens/Dashboard/DashboardScreen';
import MyProductsScreen      from '../screens/Products/MyProductsScreen';
import AddProductScreen      from '../screens/Products/AddProductScreen';
import OrdersScreen          from '../screens/Orders/OrdersScreen';
import SellerProfileScreen   from '../screens/Profile/SellerProfileScreen';
import BusinessProfileScreen from '../screens/Profile/BusinessProfileScreen';

// ── Animated tab icon with bounce + active dot ──────────────────────────────
function AnimTabIcon({ focused, color, ionName, ionNameFocused }) {
  const scale      = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, speed: 60, bounciness: 16 }),
        Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 40, bounciness: 8  }),
      ]).start();
      Animated.timing(dotOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(scale,      { toValue: 1, duration: 180, useNativeDriver: true }).start();
      Animated.timing(dotOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
  }, [focused]);

  return (
    <View style={tabS.wrap}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={focused ? ionNameFocused : ionName} size={24} color={color} />
      </Animated.View>
      <Animated.View style={[tabS.dot, { backgroundColor: color, opacity: dotOpacity }]} />
    </View>
  );
}

const tabS = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', width: 36, height: 36 },
  dot:  { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
});

const Tab          = createBottomTabNavigator();
const ProdStack    = createStackNavigator();
const DashStack    = createStackNavigator();
const OrderStack   = createStackNavigator();
const ProfileStack = createStackNavigator();

const defaultHeader = {
  headerStyle:      { backgroundColor: COLORS.primary },
  headerTintColor:  '#fff',
  headerTitleStyle: { fontWeight: '700', fontSize: 17 },
  headerBackTitleVisible: false,
};

function DashboardNavigator() {
  const { t } = useLanguage();
  return (
    <DashStack.Navigator screenOptions={defaultHeader}>
      <DashStack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <DashStack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ title: t('nav.addProductTitle') }}
      />
    </DashStack.Navigator>
  );
}

function ProductsNavigator() {
  const { t } = useLanguage();
  return (
    <ProdStack.Navigator screenOptions={defaultHeader}>
      <ProdStack.Screen
        name="MyProducts"
        component={MyProductsScreen}
        options={{ title: t('nav.myProductsTitle') }}
      />
      <ProdStack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ title: t('nav.addProductTitle') }}
      />
    </ProdStack.Navigator>
  );
}

function OrdersNavigator() {
  const { t } = useLanguage();
  return (
    <OrderStack.Navigator screenOptions={defaultHeader}>
      <OrderStack.Screen
        name="OrdersList"
        component={OrdersScreen}
        options={{ title: t('nav.ordersTitle') }}
      />
    </OrderStack.Navigator>
  );
}

function ProfileNavigator() {
  const { t } = useLanguage();
  return (
    <ProfileStack.Navigator screenOptions={defaultHeader}>
      <ProfileStack.Screen
        name="SellerProfile"
        component={SellerProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="BusinessProfile"
        component={BusinessProfileScreen}
        options={{ title: t('nav.bizProfileTitle') }}
      />
    </ProfileStack.Navigator>
  );
}

export default function AppNavigator() {
  const { t } = useLanguage();
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor:   COLORS.primary,
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0,
            height: Platform.OS === 'ios' ? 88 : 68,
            paddingBottom: Platform.OS === 'ios' ? 22 : 10,
            paddingTop: 8,
            elevation: 20,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.14,
            shadowRadius: 16,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: -2 },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardNavigator}
          options={{
            tabBarLabel: t('nav.tabDashboard'),
            tabBarIcon: ({ focused, color }) => (
              <AnimTabIcon focused={focused} color={color} ionName="grid-outline" ionNameFocused="grid" />
            ),
          }}
        />
        <Tab.Screen
          name="Products"
          component={ProductsNavigator}
          options={{
            tabBarLabel: t('nav.tabProducts'),
            tabBarIcon: ({ focused, color }) => (
              <AnimTabIcon focused={focused} color={color} ionName="storefront-outline" ionNameFocused="storefront" />
            ),
          }}
        />
        <Tab.Screen
          name="Orders"
          component={OrdersNavigator}
          options={{
            tabBarLabel: t('nav.tabOrders'),
            tabBarIcon: ({ focused, color }) => (
              <AnimTabIcon focused={focused} color={color} ionName="receipt-outline" ionNameFocused="receipt" />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileNavigator}
          options={{
            tabBarLabel: t('nav.tabProfile'),
            tabBarIcon: ({ focused, color }) => (
              <AnimTabIcon focused={focused} color={color} ionName="person-circle-outline" ionNameFocused="person-circle" />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
