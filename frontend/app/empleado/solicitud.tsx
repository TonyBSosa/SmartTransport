import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, StatusColors } from '../../constants/Colors';
import { Reserva, obtenerReserva, actualizarEstadoReserva } from '../../lib/firestore';

type TipoSolicitud = 'modificacion' | 'cancelacion' | null;

export default function SolicitudScreen() {
  const router = useRouter();
  const { reservaId } = useLocalSearchParams<{ reservaId: string }>();
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<TipoSolicitud>(null);
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!reservaId) return;
    obtenerReserva(reservaId)
      .then(setReserva)
      .finally(() => setLoading(false));
  }, [reservaId]);

  const handleSubmit = async () => {
    if (!tipo) {
      Alert.alert('Selecciona', 'Elige si deseas modificar o cancelar la reserva.');
      return;
    }
    if (!motivo.trim()) {
      Alert.alert('Motivo requerido', 'Por favor escribe el motivo de tu solicitud.');
      return;
    }
    setSaving(true);
    try {
      const nuevoEstado =
        tipo === 'modificacion'
          ? 'Solicitud de modificación'
          : 'Solicitud de cancelación';
      await actualizarEstadoReserva(reservaId!, nuevoEstado, motivo.trim());
      Alert.alert('Solicitud enviada', 'Tu solicitud ha sido registrada.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!reserva) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={56} color={Colors.error} />
          <Text style={styles.errorText}>Reserva no encontrada</Text>
        </View>
      </SafeAreaView>
    );
  }

  const st = StatusColors[reserva.estado] || { bg: Colors.secondary, text: Colors.textSecondary };
  const canRequest = reserva.estado === 'Agendada';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardName}>{reserva.nombre}</Text>
            <View style={[styles.badge, { backgroundColor: st.bg }]}>
              <Text style={[styles.badgeText, { color: st.text }]}>{reserva.estado}</Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="call-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.cardDetail}>{reserva.telefono}</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.cardDetail}>{reserva.zona} — {reserva.direccion}</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="time-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.cardDetail}>
              {reserva.horarioEntrada} – {reserva.horarioSalida} ({reserva.tipoTransporte})
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="calendar-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.cardDetail}>{reserva.diasSemana?.join(', ')}</Text>
          </View>
          {reserva.puntoReferencia ? (
            <View style={styles.cardRow}>
              <Ionicons name="flag-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.cardDetail}>{reserva.puntoReferencia}</Text>
            </View>
          ) : null}
          {reserva.observaciones ? (
            <View style={styles.cardRow}>
              <Ionicons name="chatbubble-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.cardDetail}>{reserva.observaciones}</Text>
            </View>
          ) : null}
        </View>

        {canRequest ? (
          <>
            <Text style={styles.sectionTitle}>Tipo de solicitud</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                testID="btn-modificacion"
                style={[
                  styles.optionBtn,
                  tipo === 'modificacion' && styles.optionBtnActiveWarning,
                ]}
                onPress={() => setTipo('modificacion')}
              >
                <Ionicons
                  name="create-outline"
                  size={22}
                  color={tipo === 'modificacion' ? '#92400E' : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.optionText,
                    tipo === 'modificacion' && { color: '#92400E', fontWeight: '600' },
                  ]}
                >
                  Modificación
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="btn-cancelacion"
                style={[
                  styles.optionBtn,
                  tipo === 'cancelacion' && styles.optionBtnActiveError,
                ]}
                onPress={() => setTipo('cancelacion')}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color={tipo === 'cancelacion' ? '#991B1B' : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.optionText,
                    tipo === 'cancelacion' && { color: '#991B1B', fontWeight: '600' },
                  ]}
                >
                  Cancelación
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Motivo *</Text>
              <TextInput
                testID="input-motivo"
                style={[styles.input, styles.textArea]}
                placeholder="Explica el motivo de tu solicitud..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={4}
                value={motivo}
                onChangeText={setMotivo}
              />
            </View>

            <TouchableOpacity
              testID="submit-solicitud-btn"
              style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.primaryForeground} />
              ) : (
                <Text style={styles.submitBtnText}>Enviar Solicitud</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={24} color={Colors.primary} />
            <Text style={styles.infoText}>
              Esta reserva tiene estado "{reserva.estado}" y no puede ser modificada en este momento.
            </Text>
          </View>
        )}

        {reserva.motivoSolicitud ? (
          <View style={styles.motivoBox}>
            <Text style={styles.motivoLabel}>Motivo registrado:</Text>
            <Text style={styles.motivoText}>{reserva.motivoSolicitud}</Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: Colors.error, marginTop: 12 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardName: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardDetail: { fontSize: 14, color: Colors.textSecondary, marginLeft: 6, flex: 1 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  optionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionBtnActiveWarning: {
    backgroundColor: Colors.warningLight,
    borderColor: Colors.warning,
  },
  optionBtnActiveError: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  optionText: { fontSize: 15, color: Colors.textSecondary },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: Colors.primaryForeground,
    fontSize: 17,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  infoText: { flex: 1, fontSize: 14, color: Colors.primary, lineHeight: 20 },
  motivoBox: {
    marginTop: 16,
    backgroundColor: Colors.warningLight,
    borderRadius: 12,
    padding: 16,
  },
  motivoLabel: { fontSize: 13, fontWeight: '600', color: '#92400E', marginBottom: 4 },
  motivoText: { fontSize: 14, color: '#78350F', lineHeight: 20 },
});
