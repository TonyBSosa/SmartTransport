import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, StatusColors } from '../../constants/Colors';
import { useUser } from '../../context/UserContext';
import { Reserva, escucharReservasPorTelefono } from '../../lib/firestore';

export default function MisReservas() {
  const router = useRouter();
  const { telefono, setTelefono } = useUser();
  const [phoneInput, setPhoneInput] = useState(telefono);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const buscar = useCallback(() => {
    if (!phoneInput.trim()) return;
    setTelefono(phoneInput.trim());
    setSearched(true);
    setLoading(true);
  }, [phoneInput, setTelefono]);

  useEffect(() => {
    if (!telefono) return;
    setLoading(true);
    const unsubscribe = escucharReservasPorTelefono(telefono, (data) => {
      setReservas(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [telefono]);

  const getStatusStyle = (estado: string) =>
    StatusColors[estado] || { bg: Colors.secondary, text: Colors.textSecondary };

  const renderReserva = ({ item }: { item: Reserva }) => {
    const st = getStatusStyle(item.estado);
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
          <View style={[styles.badge, { backgroundColor: st.bg }]}>
            <Text style={[styles.badgeText, { color: st.text }]}>{item.estado}</Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="location-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.cardDetail}>{item.zona} — {item.direccion}</Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="time-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.cardDetail}>
            {item.horarioEntrada} – {item.horarioSalida} ({item.tipoTransporte})
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="calendar-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.cardDetail}>{item.diasSemana?.join(', ')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header mejorado */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Mis Reservas</Text>
            <Text style={styles.headerSubtitle}>Busca y gestiona tus bookings</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="document-text" size={32} color={Colors.primary} />
          </View>
        </View>

        {/* Búsqueda mejorada */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="call-outline" size={20} color={Colors.textSecondary} />
            <TextInput
              testID="phone-input"
              style={styles.searchInput}
              placeholder="Tu número de teléfono"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={phoneInput}
              onChangeText={setPhoneInput}
              onSubmitEditing={buscar}
            />
            <TouchableOpacity testID="search-btn" onPress={buscar} style={styles.searchBtn}>
              <Ionicons name="search" size={18} color={Colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Cargando reservas...</Text>
          </View>
        ) : searched && reservas.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="document-text-outline" size={64} color={Colors.border} />
            <Text style={styles.emptyTitle}>Sin reservas</Text>
            <Text style={styles.emptyDesc}>
              No hay reservas registradas para este teléfono.
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
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    paddingHorizontal: 14,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    marginLeft: 10,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
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
