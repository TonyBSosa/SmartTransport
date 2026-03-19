import { Stack } from 'expo-router';
import { Colors } from '../../constants/Colors';

export default function EmpleadoLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: '600', color: Colors.textPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Mis Reservas' }}
      />
      <Stack.Screen
        name="nueva-reserva"
        options={{ title: 'Nueva Reserva' }}
      />
      <Stack.Screen
        name="solicitud"
        options={{ title: 'Solicitud' }}
      />
    </Stack>
  );
}
