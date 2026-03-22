import { app, auth, db } from './firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';

export interface Reserva {
  id?: string;
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
  fechaCreacion?: any;
  ultimaActualizacion?: any;
}

export interface EventoAsistencia {
  id?: string;
  reservaId: string;
  fecha: string;
  estadoAsistencia: string;
  registradoPor: string;
  timestamp?: any;
}

export type ReservaInput = Omit<Reserva, 'id' | 'estado' | 'fechaCreacion' | 'ultimaActualizacion' | 'motivoSolicitud'>;

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
  appInitialized: boolean;
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
  return auth.currentUser ? {
    uid: auth.currentUser.uid,
    email: auth.currentUser.email,
  } : null;
}

function getFirebaseRuntimeDiagnostics(): FirebaseRuntimeDiagnostics {
  const navigatorOnline =
    typeof globalThis !== 'undefined' &&
    'navigator' in globalThis &&
    typeof globalThis.navigator?.onLine === 'boolean'
      ? globalThis.navigator.onLine
      : null;

  return {
    appInitialized: !!app,
    dbInitialized: !!db,
    projectId: app?.options?.projectId ?? null,
    authUser: getCurrentUserInfo(),
    navigatorOnline,
  };
}

function buildReservaPayload(data: ReservaInput) {
  return {
    ...data,
    telefono: normalizarTelefono(data.telefono),
    estado: 'Agendada',
    fechaCreacion: serverTimestamp(),
    ultimaActualizacion: serverTimestamp(),
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

function isPayloadObviouslyInvalid(payload: Record<string, unknown>) {
  return getUndefinedAndNullFields(payload).length > 0;
}

function normalizeError(error: any) {
  return {
    message: error?.message || 'Error desconocido',
    code: error?.code,
    full: error,
  };
}

function classifyFailure(params: {
  error: any;
  firebase: FirebaseRuntimeDiagnostics;
  undefinedFields: string[];
  diagnosticWrite?: DiagnosticWriteResult;
}): RuntimeIssueType {
  const { error, firebase, undefinedFields, diagnosticWrite } = params;

  if (!firebase.appInitialized || !firebase.dbInitialized) return 'sdk-runtime';
  if (!firebase.authUser) return 'auth';
  if (undefinedFields.length > 0) return 'payload';
  if (error?.message === 'TIMEOUT_FIRESTORE_ADD_DOC_10S') {
    return diagnosticWrite?.ok ? 'payload' : 'connection';
  }
  if (error?.code) {
    if (String(error.code).startsWith('auth/')) return 'auth';
    if (String(error.code).startsWith('firestore/') || String(error.code).includes('unavailable')) {
      return 'connection';
    }
  }

  return 'unknown';
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
      console.error(`[crearReserva] retry falló en intento ${attempt}:`, error);
    }
  }

  return {
    success: false as const,
    error: lastError,
  };
}

export function normalizarTelefono(telefono: string): string {
  let t = String(telefono || '').trim();
  t = t.replace(/[\s\-()]/g, '');

  if (t.startsWith('+504')) {
    t = t.slice(4);
  } else if (t.startsWith('504') && t.length > 8) {
    t = t.slice(3);
  }

  return t;
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
  } catch (error: any) {
    const normalizedError = normalizeError(error);
    console.error('[crearReserva:min] error completo:', normalizedError.full);
    console.error('[crearReserva:min] error.code:', normalizedError.code);
    console.error('[crearReserva:min] error.message:', normalizedError.message);
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
  console.log('[crearReserva] payload original:', originalPayload);
  console.log('[crearReserva] payload limpio:', cleanedPayload);
  console.log('[crearReserva] campos undefined/null:', undefinedFields);

  if (!firebase.appInitialized || !firebase.dbInitialized) {
    return {
      success: false,
      error: {
        type: 'sdk-runtime',
        message: 'Firebase app o Firestore db no están inicializados correctamente',
        firebase,
        undefinedFields,
      },
    };
  }

  if (!firebase.authUser) {
    console.warn('[crearReserva] auth.currentUser es null');
    return {
      success: false,
      error: {
        type: 'auth',
        message: 'auth.currentUser es null en runtime',
        firebase,
        undefinedFields,
      },
    };
  }

  if (isPayloadObviouslyInvalid(originalPayload)) {
    console.warn('[crearReserva] payload inválido por campos undefined/null');
    return {
      success: false,
      error: {
        type: 'payload',
        message: 'El payload contiene campos undefined o null',
        firebase,
        undefinedFields,
      },
    };
  }

  try {
    console.log('[crearReserva] antes de addDoc');
    const docRef = await addReservaDocWithTimeout(cleanedPayload);
    console.log('[crearReserva] después de addDoc');
    console.log('[crearReserva] documento creado:', docRef.id);

    return {
      success: true,
      docId: docRef.id,
    };
  } catch (error: any) {
    const normalizedError = normalizeError(error);
    console.error('[crearReserva] error completo:', normalizedError.full);
    console.error('[crearReserva] error.code:', normalizedError.code);
    console.error('[crearReserva] error.message:', normalizedError.message);

    const timeoutTriggered = normalizedError.message === 'TIMEOUT_FIRESTORE_ADD_DOC_10S';
    let diagnosticWrite: DiagnosticWriteResult | undefined;
    let retryAttempted = false;
    let retrySucceeded = false;

    if (timeoutTriggered) {
      console.log('[crearReserva] timeout detectado, ejecutando prueba mínima...');
      diagnosticWrite = await probarEscrituraMinimaReserva();
      console.log('[crearReserva] resultado prueba mínima:', diagnosticWrite);
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

    const classifiedType = classifyFailure({
      error: normalizedError.full,
      firebase,
      undefinedFields,
      diagnosticWrite,
    });

    return {
      success: false,
      error: {
        type: classifiedType,
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

export function escucharReservasPorTelefono(
  telefono: string,
  callback: (reservas: Reserva[]) => void
): () => void {
  const telefonoNormalizado = normalizarTelefono(telefono);
  const q = query(
    collection(db, 'reservas'),
    where('telefono', '==', telefonoNormalizado)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const reservas = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Reserva)
      );
      reservas.sort((a, b) => {
        const dateA = a.fechaCreacion?.toMillis?.() || 0;
        const dateB = b.fechaCreacion?.toMillis?.() || 0;
        return dateB - dateA;
      });
      callback(reservas);
    },
    (error) => {
      console.error('Error escuchando reservas por telefono:', {
        telefonoOriginal: telefono,
        telefonoNormalizado,
        error,
      });
      callback([]);
    }
  );
}

export function escucharReservasPorDia(
  diaSemana: string,
  callback: (reservas: Reserva[]) => void
): () => void {
  const q = query(
    collection(db, 'reservas'),
    where('diasSemana', 'array-contains', diaSemana)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const reservas = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Reserva)
      );
      callback(reservas);
    },
    (error) => {
      console.error('Error escuchando reservas por dia:', {
        diaSemana,
        error,
      });
      callback([]);
    }
  );
}

export async function obtenerReserva(reservaId: string): Promise<Reserva | null> {
  const docRef = doc(db, 'reservas', reservaId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Reserva;
  }
  return null;
}

export async function actualizarEstadoReserva(
  reservaId: string,
  estado: string,
  motivoSolicitud?: string
): Promise<void> {
  const docRef = doc(db, 'reservas', reservaId);
  const updateData: Record<string, any> = {
    estado,
    ultimaActualizacion: serverTimestamp(),
  };
  if (motivoSolicitud !== undefined) {
    updateData.motivoSolicitud = motivoSolicitud;
  }
  await updateDoc(docRef, updateData);
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

export function formatTimestamp(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
