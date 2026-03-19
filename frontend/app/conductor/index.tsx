import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, StatusColors } from '../../constants/Colors';
import {
  Reserva,
  escucharReservasPorDia,
  crearEventoAsistencia,
  getDiaSemanaHoy,
  getFechaHoy,
  DIAS_SEMANA,
  ZONAS,
} from '../../lib/firestore';

export default function ConductorDashboard() {
  const [diaSeleccionado, setDiaSeleccionado] = useState(getDiaSemanaHoy());
  const [zonaFiltro, setZonaFiltro] = useState<string | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = escucharReservasPorDia(diaSeleccionado, (data) => {
      setReservas(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [diaSeleccionado]);

  const filteredReservas = useMemo(() => {
    if (!zonaFiltro) return reservas;
    return reservas.filter((r) => r.zona === zonaFiltro);
  }, [reservas, zonaFiltro]);

  const marcarAsistencia = async (reserva: Reserva, estado: 'Asistió' | 'No asistió') => {
    setActionLoading(reserva.id || '');
    try {
      await crearEventoAsistencia({
        reservaId: reserva.id!,
        fecha: getFechaHoy(),
        estadoAsistencia: estado,
        registradoPor: 'Conductor',
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo registrar la asistencia.');
    } finally {
      setActionLoading(null);
    }
  };

  const hoyFormateado = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const getStatusStyle = (estado: string) =>
    StatusColors[estado] || { bg: Colors.secondary, text: Colors.textSecondary };

  const isTerminal = (estado: string) =>
    estado === 'Asistió' || estado === 'No asistió';

  const renderReserva = ({ item }: { item: Reserva }) => {
    const st = getStatusStyle(item.estado);
    const terminal = isTerminal(item.estado);
    const isLoading = actionLoading === item.id;

    return (
      <View testID={`conductor-card-${item.id}`} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardName}>{item.nombre}</Text>
            <Text style={styles.cardPhone}>{item.telefono}</Text>
          </View>
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
        {item.puntoReferencia ? (
          <View style={styles.cardRow}>
            <Ionicons name="flag-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.cardDetail}>{item.puntoReferencia}</Text>
          </View>
        ) : null}

        {!terminal && (
          <View style={styles.actionRow}>
            {isLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <TouchableOpacity
                  testID={`btn-asistio-${item.id}`}
                  style={[styles.actionBtn, styles.actionBtnSuccess]}
                  onPress={() => marcarAsistencia(item, 'Asistió')}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#065F46" />
                  <Text style={styles.actionBtnSuccessText}>Asistió</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID={`btn-no-asistio-${item.id}`}
                  style={[styles.actionBtn, styles.actionBtnError]}
                  onPress={() => marcarAsistencia(item, 'No asistió')}
                >
                  <Ionicons name="close-circle" size={18} color="#991B1B" />
                  <Text style={styles.actionBtnErrorText}>No asistió</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const DIAS_CORTOS: Record<string, string> = {
    Domingo: 'Dom',
    Lunes: 'Lun',
    Martes: 'Mar',
    Miércoles: 'Mié',
    Jueves: 'Jue',
    Viernes: 'Vie',
    Sábado: 'Sáb',
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.dateBar}>
          <Ionicons name="calendar" size={18} color={Colors.primary} />
          <Text style={styles.dateText}>{hoyFormateado}</Text>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Día</Text>
          <FlatList
            testID="day-filter"
            horizontal
            showsHorizontalScrollIndicator={false}
            data={DIAS_SEMANA.slice(1).concat(DIAS_SEMANA.slice(0, 1))}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.chipList}
            renderItem={({ item }) => (
              <TouchableOpacity
                testID={`filter-dia-${item}`}
                style={[styles.filterChip, diaSeleccionado === item && styles.filterChipActive]}
                onPress={() => setDiaSeleccionado(item)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    diaSeleccionado === item && styles.filterChipTextActive,
                  ]}
                >
                  {DIAS_CORTOS[item]}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Zona</Text>
          <FlatList
            testID="zone-filter"
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['Todas', ...ZONAS]}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.chipList}
            renderItem={({ item }) => {
              const isActive = item === 'Todas' ? !zonaFiltro : zonaFiltro === item;
              return (
                <TouchableOpacity
                  testID={`filter-zona-${item}`}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setZonaFiltro(item === 'Todas' ? null : item)}
                >
                  <Text
                    style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <View style={styles.countBar}>
          <Text style={styles.countText}>
            {filteredReservas.length} reserva{filteredReservas.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Cargando reservas...</Text>
          </View>
        ) : filteredReservas.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="bus-outline" size={56} color={Colors.border} />
            <Text style={styles.emptyTitle}>Sin reservas</Text>
            <Text style={styles.emptyDesc}>
              No hay reservas para {diaSeleccionado}
              {zonaFiltro ? ` en zona ${zonaFiltro}` : ''}.
            </Text>
          </View>
        ) : (
          <FlatList
            testID="conductor-reservas-list"
            data={filteredReservas}
            keyExtractor={(item) => item.id || ''}
            renderItem={renderReserva}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  filterSection: { paddingHorizontal: 16, marginBottom: 8 },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  chipList: { gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.primaryForeground },
  countBar: { paddingHorizontal: 16, paddingVertical: 8 },
  countText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
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
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardLeft: { flex: 1 },
  cardName: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  cardPhone: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardDetail: { fontSize: 14, color: Colors.textSecondary, marginLeft: 6, flex: 1 },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnSuccess: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  actionBtnError: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  actionBtnSuccessText: { fontSize: 14, fontWeight: '600', color: '#065F46' },
  actionBtnErrorText: { fontSize: 14, fontWeight: '600', color: '#991B1B' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loadingText: { marginTop: 12, fontSize: 15, color: Colors.textSecondary },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginTop: 16 },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
});
