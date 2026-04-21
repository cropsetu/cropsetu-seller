import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator  from './src/navigation/AppNavigator';
import LoginScreen   from './src/screens/Auth/LoginScreen';
import { COLORS }   from './src/constants/colors';

function RootContent() {
  const { user, loading, needsSetup } = useAuth();

  if (loading) {
    return (
      <View style={s.splash}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Show LoginScreen when:
  //   • user is not logged in, OR
  //   • user is logged in but hasn't finished the NAME/LOCATION/GST onboarding
  if (!user || needsSetup) {
    return <LoginScreen />;
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <LanguageProvider>
        <AuthProvider>
          <RootContent />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
