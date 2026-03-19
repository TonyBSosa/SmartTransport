export const Colors = {
  primary: '#0056D2',
  primaryLight: '#E8F0FE',
  primaryForeground: '#FFFFFF',
  secondary: '#F1F5F9',
  secondaryForeground: '#0F172A',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
};

export const StatusColors: Record<string, { bg: string; text: string }> = {
  'Agendada': { bg: Colors.primaryLight, text: Colors.primary },
  'Solicitud de modificación': { bg: Colors.warningLight, text: '#92400E' },
  'Solicitud de cancelación': { bg: Colors.errorLight, text: '#991B1B' },
  'Asistió': { bg: Colors.successLight, text: '#065F46' },
  'No asistió': { bg: Colors.errorLight, text: '#991B1B' },
};
