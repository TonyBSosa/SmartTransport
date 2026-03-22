import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, StatusColors } from '../../constants/Colors';
import { useUser } from '../../context/UserContext';
import { escucharReservasPorUid, Reserva } from '../../lib/firestore';

export default function MisReservas() {
  const router = useRouter();
  const { authError, authUser, hasCompleteProfile, isAuthenticated, isBootstrapping, logout, profile, role } = useUser();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser?.uid || role !== 'empleado' || !hasCompleteProfile) {
      setLoading(false);
      setReservas([]);
      return;
    }

    setLoading(true);
    const unsubscribe = escucharReservasPorUid(authUser.uid, (items) => {
      setReservas(items);
      setLoading(false);
    });

    return unsubscribe;
  }, [authUser?.uid, hasCompleteProfile, role]);

  const renderReserva = ({ item }: { item: Reserva }) => {
    const statusStyle =
      StatusColors[item.estado] || { bg: Colors.secondary, text: Colors.textSecondary };

    return (
      <TouchableOpacity
        testID={`reserva-card-${item.id}`}
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          router.push({ pathname: '/empleado/solicitud', params: { reservaId: item.id } })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{item.nombre}</Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{item.estado}</Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="location-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.cardDetail}>
            {item.zona} - {item.direccion}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="time-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.cardDetail}>
            {item.horarioEntrada} - {item.horarioSalida} ({item.tipoTransporte})
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="calendar-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.cardDetail}>{item.diasSemana?.join(', ')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (authError || role !== 'empleado') {
    return <Redirect href="/" />;
  }

  if (!hasCompleteProfile) {
    return <Redirect href="/empleado/completar-perfil" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Mis Reservas</Text>
            <Text style={styles.headerSubtitle}>
              {profile?.nombre ? `Hola, ${profile.nombre}` : 'Gestiona tus solicitudes'}
            </Text>
          </View>

          <TouchableOpacity
            testID="logout-btn"
            style={styles.headerIconLogOut}
            activeOpacity={0.8}
            onPress={async () => {
              await logout();
              router.replace('/login');
            }}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Ionicons name="person-circle-outline" size={28} color={Colors.primary} />
            <Text style={styles.profileTitle}>Perfil para reserva</Text>
          </View>
          <Text style={styles.profileLine}>{profile?.nombre}</Text>
          <Text style={styles.profileLine}>{profile?.telefono}</Text>
          <Text style={styles.profileLine}>{profile?.direccion}</Text>
          <Text style={styles.profileLine}>
            {profile?.puntoReferencia} | {profile?.zona}
          </Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/empleado/completar-perfil')}
          >
            <Text style={styles.secondaryButtonText}>Editar perfil</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Cargando reservas...</Text>
          </View>
        ) : reservas.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="document-text-outline" size={64} color={Colors.border} />
            <Text style={styles.emptyTitle}>Aún no tienes reservas</Text>
            <Text style={styles.emptyDesc}>
              Cuando registres una reserva la verás aquí automáticamente.
            </Text>
          </View>
        ) : (
          <FlatList
            testID="reservas-list"
            data={reservas}
            keyExtractor={(item) => item.id || ''}
            renderItem={renderReserva}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        <TouchableOpacity
          testID="fab-nueva-reserva"
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => router.push('/empleado/nueva-reserva')}
        >
          <Ionicons name="add" size={32} color={Colors.primaryForeground} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  headerIconLogOut: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  logoutText: { color: Colors.error, fontSize: 12, fontWeight: '700' },
  profileCard: {
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  profileTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  profileLine: { fontSize: 14, color: Colors.textSecondary, marginBottom: 6 },
  secondaryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  secondaryButtonText: { color: Colors.primary, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  badge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardDetail: { fontSize: 13, color: Colors.textSecondary, marginLeft: 10, flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loadingText: { marginTop: 16, fontSize: 15, color: Colors.textSecondary },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
