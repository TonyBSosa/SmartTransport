# SmartTransport - PRD (Product Requirements Document)

## Descripción
Aplicación móvil en español para gestión de transporte empresarial de empleados, conectada a Firebase Firestore en tiempo real.

## Usuarios
1. **Empleado** - Agenda transporte semanal, gestiona reservas
2. **Conductor / Operador** - Ve reservas del día, marca asistencia

## Arquitectura
- **Frontend**: React Native Expo (SDK 54) con expo-router
- **Base de datos**: Firebase Firestore (tiempo real)
- **Autenticación**: Selección simple de rol (sin credenciales)

## Pantallas
| Ruta | Pantalla | Descripción |
|------|----------|-------------|
| `/` | Selección de rol | Botones "Soy Empleado" y "Soy Conductor" |
| `/empleado` | Mis Reservas | Búsqueda por teléfono, lista de reservas, FAB nueva reserva |
| `/empleado/nueva-reserva` | Nueva Reserva | Formulario completo con todos los campos requeridos |
| `/empleado/solicitud` | Solicitud | Modificación o cancelación de una reserva |
| `/conductor` | Panel del Conductor | Reservas del día, filtros por zona/día, botones de asistencia |

## Colecciones Firestore
### `reservas`
- nombre, telefono, direccion, puntoReferencia, zona, diasSemana[], horarioEntrada, horarioSalida, tipoTransporte, observaciones, estado, motivoSolicitud, fechaCreacion, ultimaActualizacion

### `eventos_asistencia`
- reservaId, fecha, estadoAsistencia, registradoPor, timestamp

## Estados del Sistema
- **Agendada** (azul) - Reserva activa
- **Solicitud de modificación** (amarillo) - Pendiente de revisión
- **Solicitud de cancelación** (rojo) - Pendiente de cancelar
- **Asistió** (verde) - Empleado confirmado
- **No asistió** (rojo) - Empleado ausente

## Firebase Config
- Project ID: transport-5fb0b
- Credenciales en `/app/frontend/.env` como variables EXPO_PUBLIC_FIREBASE_*

## Estructura de Archivos
```
frontend/
├── app/
│   ├── _layout.tsx          # Root Stack + UserProvider
│   ├── index.tsx             # Selección de rol
│   ├── empleado/
│   │   ├── _layout.tsx       # Stack empleado
│   │   ├── index.tsx         # Mis reservas
│   │   ├── nueva-reserva.tsx # Formulario nueva reserva
│   │   └── solicitud.tsx     # Solicitar mod/cancelación
│   └── conductor/
│       ├── _layout.tsx       # Stack conductor
│       └── index.tsx         # Panel del conductor
├── lib/
│   ├── firebase.ts           # Configuración Firebase
│   └── firestore.ts          # Operaciones CRUD Firestore
├── constants/
│   └── Colors.ts             # Paleta corporativa azul
└── context/
    └── UserContext.tsx        # Contexto de sesión
```
