import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useUser } from '../../context/UserContext';
import {
  crearReserva,
  normalizarTelefono,
  ZONAS,
  TIPOS_TRANSPORTE,
} from '../../lib/firestore';

const DIAS = [
  { key: 'Lunes', short: 'Lun' },
  { key: 'Martes', short: 'Mar' },
  { key: 'Miércoles', short: 'Mié' },
  { key: 'Jueves', short: 'Jue' },
  { key: 'Viernes', short: 'Vie' },
  { key: 'Sábado', short: 'Sáb' },
  { key: 'Domingo', short: 'Dom' },
];

function formatHora(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

const HORAS_DISPONIBLES = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? 0 : 30;
  return formatHora(hours, minutes);
});

export default function NuevaReserva() {
  const router = useRouter();
  const { telefono: storedTel, setTelefono } = useUser();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefonoLocal] = useState(storedTel);
  const [direccion, setDireccion] = useState('');
  const [puntoReferencia, setPuntoRef] = useState('');
  const [zona, setZona] = useState('');
  const [diasSemana, setDiasSemana] = useState<string[]>([]);
  const [horarioEntrada, setHorarioEntrada] = useState('');
  const [horarioSalida, setHorarioSalida] = useState('');
  const [tipoTransporte, setTipoTransporte] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [timePickerField, setTimePickerField] = useState<'entrada' | 'salida' | null>(null);

  const toggleDia = (dia: string) => {
    setDiasSemana((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  const seleccionarHora = (hora: string) => {
    if (timePickerField === 'entrada') {
      setHorarioEntrada(hora);
    } else if (timePickerField === 'salida') {
      setHorarioSalida(hora);
    }
    setTimePickerField(null);
  };

  const handleSubmit = async () => {
    console.log('1. Entró a handleSubmit');
    console.log('2. Estado actual del formulario:', {
      nombre,
      telefono,
      direccion,
      zona,
      diasSemana,
      horarioEntrada,
      horarioSalida,
      tipoTransporte,
      observaciones,
    });

    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre completo.');
      return;
    }
    if (!telefono.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el teléfono.');
      return;
    }
    if (!direccion.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa la dirección.');
      return;
    }
    if (!zona) {
      Alert.alert('Campo requerido', 'Por favor selecciona una zona.');
      return;
    }
    if (diasSemana.length === 0) {
      Alert.alert('Campo requerido', 'Por favor selecciona al menos un día de la semana.');
      return;
    }
    if (!horarioEntrada.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el horario de entrada.');
      return;
    }
    if (!horarioSalida.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el horario de salida.');
      return;
    }
    if (!tipoTransporte) {
      Alert.alert('Campo requerido', 'Por favor selecciona el tipo de transporte.');
      return;
    }

    const telefonoNormalizado = normalizarTelefono(telefono);
    const payload = {
      nombre: nombre.trim(),
      telefono: telefonoNormalizado,
      direccion: direccion.trim(),
      puntoReferencia: puntoReferencia.trim(),
      zona,
      diasSemana,
      horarioEntrada: horarioEntrada.trim(),
      horarioSalida: horarioSalida.trim(),
      tipoTransporte,
      observaciones: observaciones.trim(),
    };

    setSaving(true);
    try {
      console.log('3. Payload final a crearReserva:', payload);
      const id = await crearReserva(payload);
      console.log('4. crearReserva devolvió id:', id);
      setTelefono(telefonoNormalizado);
      Alert.alert('Reserva guardada', 'Tu reserva se registró correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('5. Error en handleSubmit:', error);
      console.error('6. Error code:', error?.code);
      console.error('7. Error message:', error?.message);
      Alert.alert('Error real', `${error?.code || 'sin-codigo'} - ${error?.message || 'sin mensaje'}`);
    } finally {
      setSaving(false);
    }
  };

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
          <Text style={styles.sectionTitle}>Información personal</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Nombre completo *</Text>
            <TextInput
              testID="input-nombre"
              style={styles.input}
              placeholder="Ej. Juan Pérez"
              placeholderTextColor={Colors.textSecondary}
              value={nombre}
              onChangeText={setNombre}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Teléfono *</Text>
            <TextInput
              testID="input-telefono"
              style={styles.input}
              placeholder="Ej. 5512345678"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefonoLocal}
            />
          </View>

          <Text style={styles.sectionTitle}>Ubicación</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Dirección *</Text>
            <TextInput
              testID="input-direccion"
              style={styles.input}
              placeholder="Calle, número, colonia"
              placeholderTextColor={Colors.textSecondary}
              value={direccion}
              onChangeText={setDireccion}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Punto de referencia</Text>
            <TextInput
              testID="input-punto-ref"
              style={styles.input}
              placeholder="Ej. Frente al parque"
              placeholderTextColor={Colors.textSecondary}
              value={puntoReferencia}
              onChangeText={setPuntoRef}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Zona *</Text>
            <View style={styles.chipRow}>
              {ZONAS.map((z) => (
                <TouchableOpacity
                  testID={`zona-${z}`}
                  key={z}
                  style={[styles.chip, zona === z && styles.chipActive]}
                  onPress={() => setZona(z)}
                >
                  <Text style={[styles.chipText, zona === z && styles.chipTextActive]}>
                    {z}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Horario</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Días de la semana *</Text>
            <View style={styles.chipRow}>
              {DIAS.map((d) => (
                <TouchableOpacity
                  testID={`dia-${d.key}`}
                  key={d.key}
                  style={[styles.chip, diasSemana.includes(d.key) && styles.chipActive]}
                  onPress={() => toggleDia(d.key)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      diasSemana.includes(d.key) && styles.chipTextActive,
                    ]}
                  >
                    {d.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>Entrada *</Text>
              <TouchableOpacity
                testID="input-hora-entrada"
                style={styles.input}
                activeOpacity={0.8}
                onPress={() => setTimePickerField('entrada')}
              >
                <Text style={horarioEntrada ? styles.inputText : styles.inputPlaceholder}>
                  {horarioEntrada || '08:00'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>Salida *</Text>
              <TouchableOpacity
                testID="input-hora-salida"
                style={styles.input}
                activeOpacity={0.8}
                onPress={() => setTimePickerField('salida')}
              >
                <Text style={horarioSalida ? styles.inputText : styles.inputPlaceholder}>
                  {horarioSalida || '17:00'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Tipo de transporte *</Text>
            <View style={styles.chipRow}>
              {TIPOS_TRANSPORTE.map((t) => (
                <TouchableOpacity
                  testID={`tipo-${t}`}
                  key={t}
                  style={[
                    styles.chip,
                    tipoTransporte === t && styles.chipActive,
                    { flex: 1 },
                  ]}
                  onPress={() => setTipoTransporte(t)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      tipoTransporte === t && styles.chipTextActive,
                      { textAlign: 'center' },
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Adicional</Text>
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
                <Text style={styles.submitBtnText}>Crear Reserva</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
        <Modal
          visible={timePickerField !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setTimePickerField(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {timePickerField === 'entrada'
                  ? 'Selecciona hora de entrada'
                  : 'Selecciona hora de salida'}
              </Text>
              <ScrollView
                style={styles.modalList}
                contentContainerStyle={styles.modalListContent}
                showsVerticalScrollIndicator={false}
              >
                {HORAS_DISPONIBLES.map((hora) => (
                  <TouchableOpacity
                    key={hora}
                    style={styles.timeOption}
                    activeOpacity={0.8}
                    onPress={() => seleccionarHora(hora)}
                  >
                    <Text style={styles.timeOptionText}>{hora}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.8}
                onPress={() => setTimePickerField(null)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
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
  content: { padding: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 8,
  },
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
  textArea: { height: 80, textAlignVertical: 'top' },
  inputText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputPlaceholder: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
  row: { flexDirection: 'row' },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: Colors.primaryForeground,
    fontSize: 17,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  modalList: {
    maxHeight: 320,
  },
  modalListContent: {
    gap: 8,
  },
  timeOption: {
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timeOptionText: {
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalCancelBtn: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
