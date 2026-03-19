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
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="call-outline" size={20} color={Colors.textSecondary} />
            <TextInput
              testID="phone-input"
              style={styles.searchInput}
              placeholder="Tu número de teléfono"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="phone-pad"
              value={phoneInput}
              onChangeText={setPhoneInput}
              onSubmitEditing={buscar}
            />
            <TouchableOpacity testID="search-btn" onPress={buscar} style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>Buscar</Text>
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
            <Ionicons name="document-text-outline" size={56} color={Colors.border} />
            <Text style={styles.emptyTitle}>Sin reservas</Text>
            <Text style={styles.emptyDesc}>
              No se encontraron reservas para este teléfono.
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
          <Ionicons name="add" size={28} color={Colors.primaryForeground} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  searchSection: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBtnText: { color: Colors.primaryForeground, fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardName: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardDetail: { fontSize: 14, color: Colors.textSecondary, marginLeft: 6, flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loadingText: { marginTop: 12, fontSize: 15, color: Colors.textSecondary },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginTop: 16 },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
