import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useUser } from '../../context/UserContext';
import { guardarPerfil, ZONAS } from '../../lib/firestore';

export default function CompletarPerfilScreen() {
  const router = useRouter();
  const {
    authError,
    authUser,
    hasCompleteProfile,
    isAuthenticated,
    isBootstrapping,
    profile,
    refreshUserData,
    role,
  } = useUser();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [puntoReferencia, setPuntoReferencia] = useState('');
  const [zona, setZona] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setNombre(profile.nombre || '');
    setTelefono(profile.telefono || '');
    setDireccion(profile.direccion || '');
    setPuntoReferencia(profile.puntoReferencia || '');
    setZona(profile.zona || '');
  }, [profile]);

  const handleSave = async () => {
    if (!authUser?.uid) {
      Alert.alert('Error', 'No encontramos un usuario autenticado.');
      return;
    }

    if (!nombre.trim() || !telefono.trim() || !direccion.trim() || !puntoReferencia.trim() || !zona) {
      Alert.alert('Perfil incompleto', 'Completa todos los campos antes de continuar.');
      return;
    }

    setSaving(true);

    try {
      await guardarPerfil(authUser.uid, {
        nombre,
        telefono,
        direccion,
        puntoReferencia,
        zona,
      });

      console.log('[CompletarPerfil] perfil guardado para uid:', authUser.uid);
      await refreshUserData();
      router.replace('/empleado');
    } catch (error: any) {
      console.error('[CompletarPerfil] error guardando perfil:', error);
      Alert.alert('Error', error?.message || 'No se pudo guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
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

  if (hasCompleteProfile) {
    return <Redirect href="/empleado" />;
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
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Completa tu perfil antes de realizar una reserva</Text>
            <Text style={styles.bannerText}>
              Estos datos se usarán automáticamente cada vez que solicites transporte.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
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
              style={styles.input}
              placeholder="Ej. 99998888"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Dirección *</Text>
            <TextInput
              style={styles.input}
              placeholder="Calle, colonia, casa"
              placeholderTextColor={Colors.textSecondary}
              value={direccion}
              onChangeText={setDireccion}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Punto de referencia *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Frente al parque"
              placeholderTextColor={Colors.textSecondary}
              value={puntoReferencia}
              onChangeText={setPuntoReferencia}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Zona *</Text>
            <View style={styles.chipRow}>
              {ZONAS.map((item) => (
                <TouchableOpacity
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

          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.primaryForeground} />
            ) : (
              <Text style={styles.submitBtnText}>Guardar perfil</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  banner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  bannerTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
  bannerText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.divider,
  },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '700' },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: Colors.primaryForeground, fontSize: 16, fontWeight: '700' },
});
