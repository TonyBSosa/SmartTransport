import { db } from './firebase';
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

export async function crearReserva(data: ReservaInput): Promise<string> {
  const telefonoNormalizado = normalizarTelefono(data.telefono);
  const firestorePayload = {
    ...data,
    telefono: telefonoNormalizado,
    estado: 'Agendada',
    fechaCreacion: serverTimestamp(),
    ultimaActualizacion: serverTimestamp(),
  };

  console.log('A. crearReserva recibió data:', data);
  console.log('B. db existe?', !!db);
  console.log('C. Payload final a Firestore:', {
    ...data,
    telefono: telefonoNormalizado,
    estado: 'Agendada',
  });
  console.log('Antes de addDoc');

  try {
    const firestorePromise = addDoc(collection(db, 'reservas'), {
      ...data,
      telefono: telefonoNormalizado,
      estado: 'Agendada',
      fechaCreacion: serverTimestamp(),
      ultimaActualizacion: serverTimestamp(),
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_FIRESTORE_ADD_DOC_10S')), 10000)
    );

    const docRef = await Promise.race([firestorePromise, timeoutPromise]) as Awaited<typeof firestorePromise>;
    console.log('Después de addDoc / race');
    console.log('D. Firestore creó documento:', docRef.id);
    console.log('Documento creado:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('E. Error dentro de crearReserva:', error);
    console.error('F. Error code:', error?.code);
    console.error('G. Error message:', error?.message);
    console.error('crearReserva catch completo:', error);
    console.error('crearReserva catch message:', error?.message);
    console.error('crearReserva catch code:', error?.code);
    throw error;
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
