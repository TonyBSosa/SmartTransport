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
import { auth } from '../../lib/firebase';
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
  const [pickerType, setPickerType] = useState<'entrada' | 'salida' | null>(null);
  const [pickerH, setPickerH] = useState('08');
  const [pickerM, setPickerM] = useState('00');
  const [pickerA, setPickerA] = useState('AM');
  const [tipoTransporte, setTipoTransporte] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const toggleDia = (dia: string) => {
    setDiasSemana((prev) =>
      prev.includes(dia) ? prev.filter((current) => current !== dia) : [...prev, dia]
    );
  };

  const resetForm = () => {
    setNombre('');
    setDireccion('');
    setPuntoRef('');
    setZona('');
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
    console.log('1. Entró a handleSubmit');
    console.log(
      '1.1 auth.currentUser en handleSubmit:',
      auth.currentUser
        ? {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
          }
        : null
    );
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
    console.log('2.1 Antes de construir payload');

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
      horarioEntrada,
      horarioSalida,
      tipoTransporte,
      observaciones: observaciones.trim(),
    };
    const payloadUndefinedFields = Object.entries(payload)
      .filter(([, value]) => value === undefined)
      .map(([key]) => key);

    setSaving(true);
    try {
      console.log('2.2 Campos undefined en payload:', payloadUndefinedFields);
      console.log('3. Payload final a crearReserva:', payload);
      console.log('3.1 Llamando crearReserva...');

      const result = await crearReserva(payload);
      console.log('4. crearReserva devolvió resultado:', result);

      if (!result.success) {
        throw result.error?.full ?? new Error(result.error?.message || 'No se pudo crear la reserva');
      }

      setTelefono(telefonoNormalizado);
      setShowSuccess(true);
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
              {ZONAS.map((item) => (
                <TouchableOpacity
                  testID={`zona-${item}`}
                  key={item}
                  style={[styles.chip, zona === item && styles.chipActive]}
                  onPress={() => setZona(item)}
                >
                  <Text style={[styles.chipText, zona === item && styles.chipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>Hora de Entrada *</Text>
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

            <View style={{ width: 12 }} />

            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>Hora de Salida *</Text>
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
                  style={[styles.chip, tipoTransporte === item && styles.chipActive, { flex: 1 }]}
                  onPress={() => setTipoTransporte(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      tipoTransporte === item && styles.chipTextActive,
                      { textAlign: 'center' },
                    ]}
                  >
                    {item}
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
          visible={pickerType !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerType(null)}
        >
          <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
            <View style={[styles.modalCard, { borderRadius: 24 }]}>
              <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 20 }]}>
                {pickerType === 'entrada' ? 'Hora de Entrada' : 'Hora de Salida'}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  height: 200,
                  marginBottom: 20,
                  backgroundColor: Colors.background,
                  borderRadius: 16,
                  padding: 10,
                }}
              >
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {Array.from({ length: 12 }, (_, index) =>
                    String(index + 1).padStart(2, '0')
                  ).map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.pickerItem,
                        pickerH === hour && { backgroundColor: Colors.primaryLight },
                      ]}
                      onPress={() => setPickerH(hour)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          pickerH === hour && { color: Colors.primary, fontWeight: '700' },
                        ]}
                      >
                        {hour}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: Colors.textSecondary,
                    alignSelf: 'center',
                    marginHorizontal: 8,
                  }}
                >
                  :
                </Text>

                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(
                    (minute) => (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.pickerItem,
                          pickerM === minute && { backgroundColor: Colors.primaryLight },
                        ]}
                        onPress={() => setPickerM(minute)}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            pickerM === minute && { color: Colors.primary, fontWeight: '700' },
                          ]}
                        >
                          {minute}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>

                <View style={{ width: 8 }} />

                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {['AM', 'PM'].map((ampm) => (
                    <TouchableOpacity
                      key={ampm}
                      style={[
                        styles.pickerItem,
                        pickerA === ampm && { backgroundColor: Colors.primaryLight },
                      ]}
                      onPress={() => setPickerA(ampm)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          pickerA === ampm && { color: Colors.primary, fontWeight: '700' },
                        ]}
                      >
                        {ampm}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { marginTop: 0 }]}
                activeOpacity={0.8}
                onPress={confirmPicker}
              >
                <Ionicons name="checkmark" size={20} color={Colors.primaryForeground} />
                <Text style={styles.submitBtnText}>Aceptar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.8}
                onPress={() => setPickerType(null)}
              >
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
          <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
            <View style={[styles.modalCard, { borderRadius: 24 }]}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Ionicons name="checkmark-circle" size={60} color={Colors.primary} />
              </View>

              <Text
                style={[
                  styles.modalTitle,
                  { textAlign: 'center', fontSize: 22, color: Colors.textPrimary },
                ]}
              >
                Reserva guardada
              </Text>

              <Text
                style={{
                  textAlign: 'center',
                  color: Colors.textSecondary,
                  fontSize: 16,
                  marginBottom: 24,
                }}
              >
                Tu reserva se registró correctamente.
              </Text>

              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={[styles.submitBtn, { marginTop: 0 }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowSuccess(false);
                    resetForm();
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color={Colors.primaryForeground} />
                  <Text style={styles.submitBtnText}>Crear nueva reserva</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalCancelBtn, { flexDirection: 'row', gap: 8, marginTop: 0 }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowSuccess(false);
                    router.back();
                  }}
                >
                  <Ionicons name="arrow-back-outline" size={20} color={Colors.textSecondary} />
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
    marginTop: 20,
  },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  textArea: { height: 96, textAlignVertical: 'top' },
  inputText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    paddingVertical: 4,
  },
  inputPlaceholder: {
    fontSize: 16,
    color: Colors.textMuted,
    paddingVertical: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.divider,
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  chipTextActive: { color: Colors.primary, fontWeight: '700' },
  row: { flexDirection: 'row' },
  flexField: { flex: 1 },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: {
    color: Colors.primaryForeground,
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  modalCancelBtn: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  modalCancelText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  pickerItem: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 4,
  },
  pickerItemText: {
    fontSize: 17,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
