import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Ionicons name="bus" size={44} color={Colors.primary} />
          </View>
          <Text style={styles.title}>SmartTransport</Text>
          <Text style={styles.subtitle}>
            Gestión de Transporte Empresarial
          </Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionLabel}>Selecciona tu rol</Text>

          <TouchableOpacity
            testID="role-empleado-btn"
            style={styles.roleCard}
            activeOpacity={0.7}
            onPress={() => router.push('/empleado')}
          >
            <View style={[styles.iconWrap, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="person" size={28} color={Colors.primary} />
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleTitle}>Soy Empleado</Text>
              <Text style={styles.roleDesc}>
                Agenda y gestiona tu transporte
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            testID="role-conductor-btn"
            style={styles.roleCard}
            activeOpacity={0.7}
            onPress={() => router.push('/conductor')}
          >
            <View style={[styles.iconWrap, { backgroundColor: Colors.warningLight }]}>
              <Ionicons name="car" size={28} color="#D97706" />
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleTitle}>Soy Conductor</Text>
              <Text style={styles.roleDesc}>
                Gestiona reservas y asistencia
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>v1.0 — MVP</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: 24 },
  hero: { alignItems: 'center', marginTop: 60, marginBottom: 48 },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  body: { flex: 1 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  roleInfo: { flex: 1 },
  roleTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  roleDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textSecondary,
    paddingBottom: 20,
  },
});
