import React from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useUser } from '../context/UserContext';

export default function IndexScreen() {
  const router = useRouter();
  const { authError, hasCompleteProfile, isAuthenticated, isBootstrapping, logout, role } = useUser();

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.message}>Cargando tu sesión...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (authError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.card}>
          <Text style={styles.title}>No pudimos abrir tu cuenta</Text>
          <Text style={styles.error}>{authError}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              await logout();
              router.replace('/login');
            }}
          >
            <Text style={styles.buttonText}>Volver al login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (role === 'conductor') {
    return <Redirect href="/conductor" />;
  }

  if (role === 'empleado') {
    if (!hasCompleteProfile) {
      return <Redirect href="/empleado/completar-perfil" />;
    }

    return <Redirect href="/empleado" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.title}>Rol no disponible</Text>
        <Text style={styles.error}>No se encontró un rol válido para este usuario.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            await logout();
            router.replace('/login');
          }}
        >
          <Text style={styles.buttonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  center: {
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  error: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.primaryForeground,
    fontSize: 16,
    fontWeight: '700',
  },
});
