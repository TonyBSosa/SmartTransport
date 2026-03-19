import { Stack } from 'expo-router';
import { Colors } from '../../constants/Colors';

export default function ConductorLayout() {
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
        options={{ title: 'Panel del Conductor' }}
      />
    </Stack>
  );
}
