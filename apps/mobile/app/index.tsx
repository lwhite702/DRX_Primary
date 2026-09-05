import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { COLORS } from '../src/constants/theme';

export default function Index() {
  const router = useRouter();
  const { isSignedIn, loading, onboardingStatus } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!isSignedIn) {
        router.replace('/login');
      } else if (onboardingStatus === 'NEEDS_BUSINESS_ONBOARDING') {
        router.replace('/onboarding');
      } else if (onboardingStatus === 'READY') {
        router.replace('/(tabs)');
      }
    }
  }, [isSignedIn, loading, onboardingStatus, router]);

  return (
    <View style={styles.container}>
      {onboardingStatus === 'INACTIVE' || onboardingStatus === 'BUSINESS_MISSING' ? (
        <Text style={styles.error}>This operator account needs administrator support.</Text>
      ) : (
        <ActivityIndicator size="large" color={COLORS.accent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: COLORS.text,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
});
