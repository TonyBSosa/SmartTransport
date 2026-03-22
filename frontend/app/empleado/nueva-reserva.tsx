import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Alert,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useUser } from '../../context/UserContext';
import { crearReserva, TIPOS_TRANSPORTE } from '../../lib/firestore';

const DIAS = [
  { key: 'Lunes', short: 'Lun' },
  { key: 'Martes', short: 'Mar' },
  { key: 'Miércoles', short: 'Mié' },
  { key: 'Jueves', short: 'Jue' },
  { key: 'Viernes', short: 'Vie' },
  { key: 'Sábado', short: 'Sáb' },
  { key: 'Domingo', short: 'Dom' },
];

export default function NuevaReserva() {
  const router = useRouter();
  const { authError, authUser, hasCompleteProfile, isAuthenticated, isBootstrapping, profile, role } = useUser();
  const [diasSemana, setDiasSemana] = useState<string[]>([]);
  const [horarioEntrada, setHorarioEntrada] = useState('');
  const [horarioSalida, setHorarioSalida] = useState('');
  const [pickerType, setPickerType] = useState<'entrada' | 'salida' | null>(null);
  const [pickerH, setPickerH] = useState('08');
  const [pickerM, setPickerM] = useState('00');
  const [pickerA, setPickerA] = useState('AM');
  const [tipoTransporte, setTipoTransporte] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const toggleDia = (dia: string) => {
    setDiasSemana((current) =>
      current.includes(dia) ? current.filter((item) => item !== dia) : [...current, dia]
    );
  };

  const resetForm = () => {
    setDiasSemana([]);
    setHorarioEntrada('');
    setHorarioSalida('');
    setTipoTransporte('');
    setObservaciones('');
  };

  const openPicker = (type: 'entrada' | 'salida') => {
    setPickerType(type);
    const currentValue = type === 'entrada' ? horarioEntrada : horarioSalida;

    if (!currentValue) {
      setPickerH('08');
      setPickerM('00');
      setPickerA('AM');
      return;
    }

    const [timePart = '08:00', amPm = 'AM'] = currentValue.split(' ');
    const [hours = '08', minutes = '00'] = timePart.split(':');
    setPickerH(hours);
    setPickerM(minutes);
    setPickerA(amPm);
  };

  const confirmPicker = () => {
    const value = `${pickerH}:${pickerM} ${pickerA}`;

    if (pickerType === 'entrada') {
      setHorarioEntrada(value);
    }

    if (pickerType === 'salida') {
      setHorarioSalida(value);
    }

    setPickerType(null);
  };

  const handleSubmit = async () => {
    if (!authUser?.uid || !profile || !hasCompleteProfile) {
      Alert.alert(
        'Perfil incompleto',
        'Completa tu perfil antes de realizar una reserva.'
      );
      router.replace('/empleado/completar-perfil');
      return;
    }

    if (diasSemana.length === 0) {
      Alert.alert('Campo requerido', 'Selecciona al menos un día de la semana.');
      return;
    }

    if (!horarioEntrada.trim()) {
      Alert.alert('Campo requerido', 'Selecciona el horario de entrada.');
      return;
    }

    if (!horarioSalida.trim()) {
      Alert.alert('Campo requerido', 'Selecciona el horario de salida.');
      return;
    }

    if (!tipoTransporte) {
      Alert.alert('Campo requerido', 'Selecciona el tipo de transporte.');
      return;
    }

    setSaving(true);

    try {
      const result = await crearReserva({
        uid: authUser.uid,
        profile,
        diasSemana,
        horarioEntrada,
        horarioSalida,
        tipoTransporte,
        observaciones,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'No se pudo guardar la reserva.');
      }

      console.log('[NuevaReserva] reserva creada:', result.docId);
      setShowSuccess(true);
    } catch (error: any) {
      console.error('[NuevaReserva] error guardando reserva:', error);
      Alert.alert('Error', error?.message || 'No se pudo guardar la reserva.');
    } finally {
      setSaving(false);
    }
  };

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.modalOverlay}>
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileCard}>
            <Text style={styles.sectionTitle}>Datos del perfil</Text>
            <Text style={styles.helperText}>
              Estos datos se usarán automáticamente en la reserva.
            </Text>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLine}>{profile?.nombre}</Text>
              <Text style={styles.summaryLine}>{profile?.telefono}</Text>
              <Text style={styles.summaryLine}>{profile?.direccion}</Text>
              <Text style={styles.summaryLine}>{profile?.puntoReferencia}</Text>
              <Text style={styles.summaryLine}>{profile?.zona}</Text>
            </View>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => router.push('/empleado/completar-perfil')}
            >
              <Text style={styles.editProfileText}>Editar perfil</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Horario</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Días de la semana *</Text>
            <View style={styles.chipRow}>
              {DIAS.map((dia) => (
                <TouchableOpacity
                  testID={`dia-${dia.key}`}
                  key={dia.key}
                  style={[styles.chip, diasSemana.includes(dia.key) && styles.chipActive]}
                  onPress={() => toggleDia(dia.key)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      diasSemana.includes(dia.key) && styles.chipTextActive,
                    ]}
                  >
                    {dia.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowField}>
              <Text style={styles.label}>Hora de entrada *</Text>
              <TouchableOpacity
                testID="input-hora-entrada"
                style={styles.input}
                activeOpacity={0.8}
                onPress={() => openPicker('entrada')}
              >
                <Text style={horarioEntrada ? styles.inputText : styles.inputPlaceholder}>
                  {horarioEntrada || 'Seleccionar'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gap} />

            <View style={styles.rowField}>
              <Text style={styles.label}>Hora de salida *</Text>
              <TouchableOpacity
                testID="input-hora-salida"
                style={styles.input}
                activeOpacity={0.8}
                onPress={() => openPicker('salida')}
              >
                <Text style={horarioSalida ? styles.inputText : styles.inputPlaceholder}>
                  {horarioSalida || 'Seleccionar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tipo de transporte *</Text>
            <View style={styles.chipRow}>
              {TIPOS_TRANSPORTE.map((item) => (
                <TouchableOpacity
                  testID={`tipo-${item}`}
                  key={item}
                  style={[styles.chip, tipoTransporte === item && styles.chipActive, styles.typeChip]}
                  onPress={() => setTipoTransporte(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      tipoTransporte === item && styles.chipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Observaciones</Text>
            <TextInput
              testID="input-observaciones"
              style={[styles.input, styles.textArea]}
              placeholder="Información adicional..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={3}
              value={observaciones}
              onChangeText={setObservaciones}
            />
          </View>

          <TouchableOpacity
            testID="submit-reserva-btn"
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.primaryForeground} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={Colors.primaryForeground} />
                <Text style={styles.submitBtnText}>Crear reserva</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.bottomSpace} />
        </ScrollView>

        <Modal
          visible={pickerType !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerType(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {pickerType === 'entrada' ? 'Hora de entrada' : 'Hora de salida'}
              </Text>

              <View style={styles.pickerContainer}>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerColumn}>
                  {Array.from({ length: 12 }, (_, index) =>
                    String(index + 1).padStart(2, '0')
                  ).map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.pickerItem,
                        pickerH === hour && styles.pickerItemActive,
                      ]}
                      onPress={() => setPickerH(hour)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          pickerH === hour && styles.pickerItemTextActive,
                        ]}
                      >
                        {hour}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.pickerSeparator}>:</Text>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerColumn}>
                  {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(
                    (minute) => (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.pickerItem,
                          pickerM === minute && styles.pickerItemActive,
                        ]}
                        onPress={() => setPickerM(minute)}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            pickerM === minute && styles.pickerItemTextActive,
                          ]}
                        >
                          {minute}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerColumn}>
                  {['AM', 'PM'].map((ampm) => (
                    <TouchableOpacity
                      key={ampm}
                      style={[
                        styles.pickerItem,
                        pickerA === ampm && styles.pickerItemActive,
                      ]}
                      onPress={() => setPickerA(ampm)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          pickerA === ampm && styles.pickerItemTextActive,
                        ]}
                      >
                        {ampm}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={confirmPicker}>
                <Ionicons name="checkmark" size={20} color={Colors.primaryForeground} />
                <Text style={styles.submitBtnText}>Aceptar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPickerType(null)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showSuccess}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSuccess(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark-circle" size={60} color={Colors.primary} />
              </View>

              <Text style={styles.successTitle}>Reserva guardada</Text>
              <Text style={styles.successText}>Tu reserva se registró correctamente.</Text>

              <View style={styles.successActions}>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() => {
                    setShowSuccess(false);
                    resetForm();
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color={Colors.primaryForeground} />
                  <Text style={styles.submitBtnText}>Crear nueva reserva</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setShowSuccess(false);
                    router.back();
                  }}
                >
                  <Text style={styles.modalCancelText}>Volver al inicio</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 20 },
  profileCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },
  helperText: { fontSize: 14, color: Colors.textSecondary, marginBottom: 12 },
  summaryBox: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  summaryLine: { fontSize: 14, color: Colors.textPrimary },
  editProfileButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  editProfileText: { color: Colors.primary, fontWeight: '700' },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputText: { fontSize: 16, fontWeight: '500', color: Colors.textPrimary, paddingVertical: 4 },
  inputPlaceholder: { fontSize: 16, color: Colors.textMuted, paddingVertical: 4 },
  textArea: { height: 96, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.divider,
  },
  typeChip: { flex: 1 },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  chipTextActive: { color: Colors.primary, fontWeight: '700' },
  row: { flexDirection: 'row' },
  rowField: { flex: 1 },
  gap: { width: 12 },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 10,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: Colors.primaryForeground, fontSize: 16, fontWeight: '700' },
  bottomSpace: { height: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 200,
    marginBottom: 20,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 10,
  },
  pickerColumn: { flex: 1 },
  pickerItem: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 4,
  },
  pickerItemActive: { backgroundColor: Colors.primaryLight },
  pickerItemText: { fontSize: 17, color: Colors.textSecondary, fontWeight: '500' },
  pickerItemTextActive: { color: Colors.primary, fontWeight: '700' },
  pickerSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    alignSelf: 'center',
    marginHorizontal: 8,
  },
  modalCancelBtn: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  modalCancelText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  successIconWrap: { alignItems: 'center', marginBottom: 20 },
  successTitle: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  successText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  successActions: { gap: 12 },
});
