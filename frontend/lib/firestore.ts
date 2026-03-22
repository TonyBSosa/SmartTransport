import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export type UserRole = 'empleado' | 'conductor';

export interface UserRecord {
  uid: string;
  email: string;
  rol: UserRole;
}

export interface UserProfile {
  uid: string;
  nombre: string;
  telefono: string;
  direccion: string;
  puntoReferencia: string;
  zona: string;
  perfilCompleto: boolean;
}

export interface Reserva {
  id?: string;
  uid: string;
  nombre: string;
  telefono: string;
  direccion: string;
  puntoReferencia: string;
  zona: string;
  diasSemana: string[];
  horarioEntrada: string;
  horarioSalida: string;
  tipoTransporte: string;
  observaciones: string;
  estado: string;
  motivoSolicitud?: string;
  fechaCreacion?: unknown;
  ultimaActualizacion?: unknown;
}

export interface EventoAsistencia {
  id?: string;
  reservaId: string;
  fecha: string;
  estadoAsistencia: string;
  registradoPor: string;
  timestamp?: unknown;
}

export type UserProfileInput = Omit<UserProfile, 'uid' | 'perfilCompleto'>;

export type ReservaInput = Pick<
  Reserva,
  'diasSemana' | 'horarioEntrada' | 'horarioSalida' | 'tipoTransporte' | 'observaciones'
> & {
  uid: string;
  profile: UserProfile;
};

type DiagnosticWriteResult = {
  ok: boolean;
  id?: string;
  error?: {
    message: string;
    code?: string;
    full?: unknown;
  };
};

type RuntimeIssueType = 'auth' | 'payload' | 'connection' | 'sdk-runtime' | 'unknown';

type FirebaseRuntimeDiagnostics = {
  dbInitialized: boolean;
  projectId: string | null;
  authUser: {
    uid: string;
    email: string | null;
  } | null;
  navigatorOnline: boolean | null;
};

export type CrearReservaResult = {
  success: boolean;
  docId?: string;
  error?: {
    type: RuntimeIssueType;
    message: string;
    code?: string;
    full?: unknown;
    timeoutTriggered?: boolean;
    diagnosticWrite?: DiagnosticWriteResult;
    undefinedFields?: string[];
    retryAttempted?: boolean;
    retrySucceeded?: boolean;
    firebase: FirebaseRuntimeDiagnostics;
  };
};

function getCurrentUserInfo() {
  return auth.currentUser
    ? {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
      }
    : null;
}

function getFirebaseRuntimeDiagnostics(): FirebaseRuntimeDiagnostics {
  const navigatorOnline =
    typeof globalThis !== 'undefined' &&
    'navigator' in globalThis &&
    typeof globalThis.navigator?.onLine === 'boolean'
      ? globalThis.navigator.onLine
      : null;

  return {
    dbInitialized: !!db,
    projectId: db.app.options.projectId ?? null,
    authUser: getCurrentUserInfo(),
    navigatorOnline,
  };
}

function removeNullAndUndefined<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
  ) as T;
}

function getUndefinedAndNullFields(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .filter(([, value]) => value === undefined || value === null)
    .map(([key]) => key);
}

function normalizeError(error: unknown) {
  const typedError = error as { message?: string; code?: string };

  return {
    message: typedError?.message || 'Error desconocido',
    code: typedError?.code,
    full: error,
  };
}

function classifyFailure(params: {
  error: unknown;
  firebase: FirebaseRuntimeDiagnostics;
  undefinedFields: string[];
  diagnosticWrite?: DiagnosticWriteResult;
}): RuntimeIssueType {
  const { error, firebase, undefinedFields, diagnosticWrite } = params;
  const typedError = error as { message?: string; code?: string } | undefined;

  if (!firebase.dbInitialized) return 'sdk-runtime';
  if (!firebase.authUser) return 'auth';
  if (undefinedFields.length > 0) return 'payload';
  if (typedError?.message === 'TIMEOUT_FIRESTORE_ADD_DOC_10S') {
    return diagnosticWrite?.ok ? 'payload' : 'connection';
  }
  if (typedError?.code) {
    if (String(typedError.code).startsWith('auth/')) return 'auth';
    if (
      String(typedError.code).startsWith('firestore/') ||
      String(typedError.code).includes('unavailable')
    ) {
      return 'connection';
    }
  }

  return 'unknown';
}

function buildReservaPayload(data: ReservaInput) {
  return {
    uid: data.uid,
    nombre: data.profile.nombre.trim(),
    telefono: normalizarTelefono(data.profile.telefono),
    direccion: data.profile.direccion.trim(),
    puntoReferencia: data.profile.puntoReferencia.trim(),
    zona: data.profile.zona.trim(),
    diasSemana: data.diasSemana,
    horarioEntrada: data.horarioEntrada.trim(),
    horarioSalida: data.horarioSalida.trim(),
    tipoTransporte: data.tipoTransporte.trim(),
    observaciones: data.observaciones.trim(),
    estado: 'Agendada',
    fechaCreacion: serverTimestamp(),
    ultimaActualizacion: serverTimestamp(),
  };
}

async function addReservaDocWithTimeout(payload: Record<string, unknown>) {
  const firestorePromise = addDoc(collection(db, 'reservas'), payload);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT_FIRESTORE_ADD_DOC_10S')), 10000)
  );

  return Promise.race([firestorePromise, timeoutPromise]);
}

async function retryAddReservaDoc(payload: Record<string, unknown>, attempts = 1) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      console.log(`[crearReserva] retry intento ${attempt} de ${attempts}`);
      const docRef = await addReservaDocWithTimeout(payload);
      console.log('[crearReserva] retry exitoso:', docRef.id);
      return {
        success: true as const,
        docRef,
      };
    } catch (error) {
      lastError = error;
      console.error(`[crearReserva] retry fallo en intento ${attempt}:`, error);
    }
  }

  return {
    success: false as const,
    error: lastError,
  };
}

export function normalizarTelefono(telefono: string): string {
  let value = String(telefono || '').trim();
  value = value.replace(/[\s\-()]/g, '');

  if (value.startsWith('+504')) {
    value = value.slice(4);
  } else if (value.startsWith('504') && value.length > 8) {
    value = value.slice(3);
  }

  return value;
}

export function isPerfilCompleto(profile: UserProfile | null): profile is UserProfile {
  return Boolean(
    profile?.perfilCompleto &&
      profile.nombre?.trim() &&
      profile.telefono?.trim() &&
      profile.direccion?.trim() &&
      profile.puntoReferencia?.trim() &&
      profile.zona?.trim()
  );
}

export async function obtenerUserRecord(uid: string): Promise<UserRecord | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserRecord;
}

export async function obtenerPerfil(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'perfiles', uid));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfile;
}

export async function guardarPerfil(uid: string, data: UserProfileInput): Promise<void> {
  const payload: UserProfile = {
    uid,
    nombre: data.nombre.trim(),
    telefono: normalizarTelefono(data.telefono),
    direccion: data.direccion.trim(),
    puntoReferencia: data.puntoReferencia.trim(),
    zona: data.zona.trim(),
    perfilCompleto: true,
  };

  console.log('[guardarPerfil] guardando perfil para uid:', uid);
  await setDoc(doc(db, 'perfiles', uid), payload, { merge: true });
}

export async function probarEscrituraMinimaReserva(): Promise<DiagnosticWriteResult> {
  console.log('[crearReserva:min] inicio');
  console.log('[crearReserva:min] firebase:', getFirebaseRuntimeDiagnostics());

  try {
    const docRef = await addDoc(collection(db, 'reservas'), {
      test: 'conexion_ok',
      fecha: new Date(),
    });

    console.log('[crearReserva:min] escritura exitosa:', docRef.id);
    return { ok: true, id: docRef.id };
  } catch (error) {
    const normalizedError = normalizeError(error);
    console.error('[crearReserva:min] error:', normalizedError);
    return { ok: false, error: normalizedError };
  }
}

export async function crearReserva(data: ReservaInput): Promise<CrearReservaResult> {
  const firebase = getFirebaseRuntimeDiagnostics();
  const originalPayload = buildReservaPayload(data);
  const undefinedFields = getUndefinedAndNullFields(originalPayload);
  const cleanedPayload = removeNullAndUndefined(originalPayload);

  console.log('[crearReserva] inicio');
  console.log('[crearReserva] firebase:', firebase);
  console.log('[crearReserva] payload:', cleanedPayload);

  if (!firebase.dbInitialized) {
    return {
      success: false,
      error: {
        type: 'sdk-runtime',
        message: 'Firestore no esta inicializado correctamente.',
        firebase,
        undefinedFields,
      },
    };
  }

  if (!firebase.authUser) {
    return {
      success: false,
      error: {
        type: 'auth',
        message: 'No hay un usuario autenticado para guardar la reserva.',
        firebase,
        undefinedFields,
      },
    };
  }

  if (undefinedFields.length > 0) {
    return {
      success: false,
      error: {
        type: 'payload',
        message: 'La reserva contiene campos faltantes.',
        firebase,
        undefinedFields,
      },
    };
  }

  try {
    const docRef = await addReservaDocWithTimeout(cleanedPayload);
    console.log('[crearReserva] documento creado:', docRef.id);

    return {
      success: true,
      docId: docRef.id,
    };
  } catch (error) {
    const normalizedError = normalizeError(error);
    const timeoutTriggered = normalizedError.message === 'TIMEOUT_FIRESTORE_ADD_DOC_10S';
    let diagnosticWrite: DiagnosticWriteResult | undefined;
    let retryAttempted = false;
    let retrySucceeded = false;

    if (timeoutTriggered) {
      diagnosticWrite = await probarEscrituraMinimaReserva();
    }

    retryAttempted = true;
    const retryResult = await retryAddReservaDoc(cleanedPayload, 1);

    if (retryResult.success) {
      retrySucceeded = true;
      return {
        success: true,
        docId: retryResult.docRef.id,
      };
    }

    return {
      success: false,
      error: {
        type: classifyFailure({
          error: normalizedError.full,
          firebase,
          undefinedFields,
          diagnosticWrite,
        }),
        message: normalizedError.message,
        code: normalizedError.code,
        full: normalizedError.full,
        timeoutTriggered,
        diagnosticWrite,
        undefinedFields,
        retryAttempted,
        retrySucceeded,
        firebase,
      },
    };
  }
}

export function escucharReservasPorUid(
  uid: string,
  callback: (reservas: Reserva[]) => void
): () => void {
  const reservationsQuery = query(collection(db, 'reservas'), where('uid', '==', uid));

  return onSnapshot(
    reservationsQuery,
    (snapshot) => {
      const reservas = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Reserva);
      reservas.sort((a, b) => {
        const dateA = (a.fechaCreacion as { toMillis?: () => number } | undefined)?.toMillis?.() || 0;
        const dateB = (b.fechaCreacion as { toMillis?: () => number } | undefined)?.toMillis?.() || 0;
        return dateB - dateA;
      });
      callback(reservas);
    },
    (error) => {
      console.error('Error escuchando reservas por uid:', { uid, error });
      callback([]);
    }
  );
}

export function escucharReservasPorDia(
  diaSemana: string,
  callback: (reservas: Reserva[]) => void
): () => void {
  const reservationsQuery = query(
    collection(db, 'reservas'),
    where('diasSemana', 'array-contains', diaSemana)
  );

  return onSnapshot(
    reservationsQuery,
    (snapshot) => {
      const reservas = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Reserva);
      callback(reservas);
    },
    (error) => {
      console.error('Error escuchando reservas por dia:', { diaSemana, error });
      callback([]);
    }
  );
}

export async function obtenerReserva(reservaId: string): Promise<Reserva | null> {
  const snapshot = await getDoc(doc(db, 'reservas', reservaId));

  if (!snapshot.exists()) {
    return null;
  }

  return { id: snapshot.id, ...snapshot.data() } as Reserva;
}

export async function actualizarEstadoReserva(
  reservaId: string,
  estado: string,
  motivoSolicitud?: string
): Promise<void> {
  const payload: Record<string, unknown> = {
    estado,
    ultimaActualizacion: serverTimestamp(),
  };

  if (motivoSolicitud !== undefined) {
    payload.motivoSolicitud = motivoSolicitud;
  }

  await updateDoc(doc(db, 'reservas', reservaId), payload);
}

export async function crearEventoAsistencia(
  data: Omit<EventoAsistencia, 'id' | 'timestamp'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'eventos_asistencia'), {
    ...data,
    timestamp: serverTimestamp(),
  });

  await actualizarEstadoReserva(data.reservaId, data.estadoAsistencia);
  return docRef.id;
}

export const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export const ZONAS = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro'];

export const TIPOS_TRANSPORTE = ['Entrada', 'Salida', 'Ambos'];

export function getDiaSemanaHoy(): string {
  return DIAS_SEMANA[new Date().getDay()];
}

export function getFechaHoy(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatTimestamp(timestamp: unknown): string {
  if (!timestamp) return '';

  const typedTimestamp = timestamp as { toDate?: () => Date };
  const date = typedTimestamp.toDate ? typedTimestamp.toDate() : new Date(timestamp as string);

  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
