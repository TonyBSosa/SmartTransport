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
        {/* Header mejorado */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Mi Ruta</Text>
            <Text style={styles.headerSubtitle}>{hoyFormateado}</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="car" size={32} color={Colors.primary} />
          </View>
        </View>

        {/* Filtros mejorados */}
        <View style={styles.filtersContainer}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Día de ruta</Text>
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

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Filtrar zona</Text>
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
        </View>

        {/* Contador de reservas */}
        <View style={styles.statsBar}>
          <View style={styles.statsBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.statsText}>
              {filteredReservas.length} ruta{filteredReservas.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Cargando rutas...</Text>
          </View>
        ) : filteredReservas.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="bus-outline" size={64} color={Colors.border} />
            <Text style={styles.emptyTitle}>Sin rutas</Text>
            <Text style={styles.emptyDesc}>
              No hay rutas para {diaSeleccionado}
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
  
  // Header mejorado
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
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Filtros container
  filtersContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.background },
  filterGroup: { marginBottom: 14 },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipList: { gap: 8, paddingBottom: 0 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.primaryForeground },

  // Stats bar
  statsBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.successLighter,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.success,
    alignSelf: 'flex-start',
  },
  statsText: { fontSize: 13, fontWeight: '600', color: Colors.success },

  list: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 32 },
  
  // Card mejorada
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardLeft: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  cardPhone: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  badge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardDetail: { fontSize: 13, color: Colors.textSecondary, marginLeft: 10, flex: 1 },
  
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  actionBtnSuccess: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  actionBtnError: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  actionBtnSuccessText: { fontSize: 13, fontWeight: '700', color: Colors.success },
  actionBtnErrorText: { fontSize: 13, fontWeight: '700', color: Colors.error },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loadingText: { marginTop: 16, fontSize: 15, color: Colors.textSecondary },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
