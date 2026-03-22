import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bus, Eye, EyeOff, Shield } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { useUser } from '../context/UserContext';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapping, login } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

  React.useEffect(() => {
    if (!isBootstrapping && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isBootstrapping, router]);

  const handleLogin = async () => {
    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    if (!password.trim()) {
      setError('Por favor ingresa tu contraseña');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (loginError: any) {
      setError(loginError.message ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = () => {
    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    setError('');
    passwordInputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb', '#f5576c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Bus size={32} color="#fff" />
            </View>
            <Text style={styles.appTitle}>SmartTransport</Text>
            <Text style={styles.appSubtitle}>Tu transporte inteligente</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Shield size={24} color={Colors.primary} />
              <Text style={styles.formTitle}>Iniciar Sesión</Text>
              <Text style={styles.formSubtitle}>Accede a tu cuenta</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="usuario@smarttransport.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                }}
                onSubmitEditing={handleEmailSubmit}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholderTextColor="#9CA3AF"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError('');
                  }}
                  onSubmitEditing={handleLogin}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="go"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={loading ? ['#9CA3AF', '#6B7280'] : [Colors.primary, Colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color={Colors.primaryForeground} size="small" />
                    <Text style={styles.buttonText}>Validando...</Text>
                  </>
                ) : (
                  <>
                    <Shield size={20} color={Colors.primaryForeground} />
                    <Text style={styles.buttonText}>Iniciar sesión</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.footerText}>v1.0 • SmartTransport © 2024</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  circle1: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    top: height * 0.05,
    left: -80,
  },
  circle2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: height * 0.15,
    right: -60,
  },
  circle3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    top: height * 0.55,
    left: width * 0.05,
  },
  content: { alignItems: 'center', width: '100%', paddingHorizontal: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoBackground: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  appTitle: { fontSize: 36, fontWeight: '800', color: '#fff', marginBottom: 6, letterSpacing: -0.5 },
  appSubtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center', fontWeight: '500' },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 14,
  },
  formHeader: { alignItems: 'center', marginBottom: 28 },
  formTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginTop: 12, marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  inputContainer: { marginBottom: 20 },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.divider,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: Colors.inputBackground,
    color: Colors.textPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  passwordContainer: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, marginBottom: 0 },
  eyeButton: { padding: 12, marginLeft: 8 },
  error: {
    color: Colors.error,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: Colors.errorLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  button: { borderRadius: 14, overflow: 'hidden', marginTop: 12, marginBottom: 28 },
  buttonDisabled: { opacity: 0.68 },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  footerText: { textAlign: 'center', color: '#6B7280', fontSize: 12, fontWeight: '600' },
});
