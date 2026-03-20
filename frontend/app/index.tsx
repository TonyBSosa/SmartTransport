import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useUser } from '../context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <LinearGradient
          colors={[Colors.primaryLighter, Colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroContent}>
            <View style={styles.logoCircle}>
              <Ionicons name="bus" size={56} color={Colors.primary} />
            </View>
            <Text style={styles.heroTitle}>SmartTransport</Text>
            <Text style={styles.heroSubtitle}>Gestión inteligente de transporte empresarial</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>1000+</Text>
                <Text style={styles.statLabel}>Empleados</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>50+</Text>
                <Text style={styles.statLabel}>Zonas</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>24/7</Text>
                <Text style={styles.statLabel}>Disponible</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Main Section */}
        <View style={styles.container}>
          {/* Section Title */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.titleDot} />
              <Text style={styles.sectionTitle}>Elige tu rol para continuar</Text>
            </View>
            <Text style={styles.sectionDesc}>Accede a funcionalidades específicas según tu rol</Text>
          </View>

          {/* Empleado Card */}
          <TouchableOpacity
            testID="role-empleado-btn"
            style={[styles.roleCard, styles.empleadoCard]}
            activeOpacity={0.75}
            onPress={() => router.push('/empleado')}
          >
            <View style={styles.cardRow}>
              <View style={[styles.cardIcon, styles.iconEmpleado]}>
                <Ionicons name="person" size={32} color={Colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Soy Empleado</Text>
                <Text style={styles.cardDescription}>
                  Crea y gestiona tus reservas diarias
                </Text>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={14} color={Colors.primary} />
                      <Text style={styles.featureText}>Agendar transporte</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={14} color={Colors.primary} />
                    <Text style={styles.featureText}>Modificar solicitudes</Text>
                  </View>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={Colors.primary}
                style={styles.cardChevron}
              />
            </View>
          </TouchableOpacity>

          {/* Conductor Card */}
          <TouchableOpacity
            testID="role-conductor-btn"
            style={[styles.roleCard, styles.conductorCard]}
            activeOpacity={0.75}
            onPress={() => router.push('/conductor')}
          >
            <View style={styles.cardRow}>
              <View style={[styles.cardIcon, styles.iconConductor]}>
                <Ionicons name="car" size={32} color={Colors.warning} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Soy Conductor</Text>
                <Text style={styles.cardDescription}>
                  Registra asistencias y gestiona rutas
                </Text>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={14} color={Colors.warning} />
                      <Text style={styles.featureText}>Ver mis rutas</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={14} color={Colors.warning} />
                    <Text style={styles.featureText}>Registrar asistencias</Text>
                  </View>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={Colors.warning}
                style={styles.cardChevron}
              />
            </View>
          </TouchableOpacity>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark" size={24} color={Colors.success} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Seguridad garantizada</Text>
                <Text style={styles.infoDesc}>Tus datos están protegidos con encriptación</Text>
              </View>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="cloud-offline" size={24} color={Colors.info} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Funciona sin internet</Text>
                <Text style={styles.infoDesc}>Acceso offline a datos principales</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            SmartTransport v1.0 • Sistema de Transporte Inteligente
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  
  // Hero Banner
  heroBanner: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroContent: { alignItems: 'center' },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 20,
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
    width: '100%',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  
  // Container
  container: { paddingHorizontal: 16, paddingTop: 12 },
  
  // Section Header
  sectionHeader: { marginBottom: 24 },
  sectionTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  titleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sectionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
  },
  
  // Role Cards
  roleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  empleadoCard: {
    borderColor: Colors.primaryLight,
    borderLeftWidth: 6,
    borderLeftColor: Colors.primary,
  },
  conductorCard: {
    borderColor: Colors.warningLight,
    borderLeftWidth: 6,
    borderLeftColor: Colors.warning,
  },
  
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmpleado: { backgroundColor: Colors.primaryLighter },
  iconConductor: { backgroundColor: '#FEF3C7' },
  
  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 10,
  },
  
  featuresList: {
    gap: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  
  cardChevron: { marginLeft: 4 },
  
  // Info Section
  infoSection: {
    marginTop: 28,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    gap: 12,
  },
  infoContent: { flex: 1 },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 32,
    fontWeight: '600',
  },
});
