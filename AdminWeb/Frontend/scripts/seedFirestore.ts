import {
  collection,
  doc,
  getDocs,
  query,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../src/lib/firebase";

type ReservaSeed = {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  puntoReferencia: string;
  zona: "Norte" | "Sur" | "Este" | "Oeste" | "Centro";
  diasSemana: string[];
  horarioEntrada: string;
  horarioSalida: string;
  tipoTransporte: "Entrada" | "Salida" | "Ambos";
  observaciones: string;
  estado: string;
  fechaCreacion: Timestamp;
  ultimaActualizacion: Timestamp;
  synthetic: true;
  syntheticBatchId: string;
};

type EventoSeed = {
  id: string;
  reservaId: string;
  fecha: string;
  estadoAsistencia: "Asistió" | "No asistió";
  registradoPor: string;
  timestamp: Timestamp;
  synthetic: true;
  syntheticBatchId: string;
};

type UserProfile = {
  id: string;
  nombre: string;
  telefono: string;
  direccionBase: string;
  puntoReferencia: string;
  zonaFavorita: "Norte" | "Sur" | "Este" | "Oeste" | "Centro";
  riesgoInasistencia: "bajo" | "medio" | "alto";
};

const DEFAULT_RESERVAS = 320;
const DEFAULT_EVENTOS = 420;
const DEFAULT_WEEKS = 6;
const DEFAULT_SEED = 42;
const BATCH_SIZE = 400;

const ZONAS = ["Norte", "Sur", "Este", "Oeste", "Centro"] as const;
const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
const HORARIOS_ENTRADA = ["06:00", "06:30", "07:00", "07:30", "08:00"] as const;
const HORARIOS_SALIDA = ["16:00", "16:30", "17:00", "17:30", "18:00"] as const;
const TIPOS_TRANSPORTE = ["Entrada", "Salida", "Ambos"] as const;
const OPERADORES = [
  "Operador Martínez",
  "Operador Rodríguez",
  "Operador Castillo",
  "Operador Flores",
  "Operador Silva",
] as const;
const OBSERVACIONES = [
  "Ruta habitual confirmada.",
  "Prefiere parada principal.",
  "Viaja con equipo de trabajo.",
  "Solicita puntualidad en horario pico.",
  "Sin observaciones adicionales.",
  "Punto de encuentro validado por supervisor.",
];
const PUNTOS_REFERENCIA = [
  "Frente al parque central",
  "Entrada de la colonia",
  "Esquina de la farmacia",
  "Portón principal de la empresa",
  "Parada frente al supermercado",
  "Puente peatonal de la avenida",
];
const CALLES = [
  "Av. Los Pinos",
  "Calle Principal",
  "Boulevard Centroamérica",
  "Colonia Las Flores",
  "Residencial El Prado",
  "Colonia Kennedy",
  "Barrio La Granja",
  "Sector Industrial Norte",
];
const APELLIDOS = [
  "García",
  "López",
  "Martínez",
  "Hernández",
  "Sánchez",
  "Ramírez",
  "Torres",
  "Morales",
  "Castillo",
  "Flores",
  "Díaz",
  "Reyes",
  "Cruz",
  "Mendoza",
  "Pineda",
  "Mejía",
];
const NOMBRES = [
  "Carlos",
  "María",
  "Juan",
  "Ana",
  "Pedro",
  "Laura",
  "Diego",
  "Sofía",
  "Andrés",
  "Valentina",
  "Roberto",
  "Camila",
  "Fernando",
  "Isabella",
  "Miguel",
  "Daniela",
  "Alejandro",
  "Gabriela",
  "Javier",
  "Natalia",
  "Kevin",
  "Paola",
  "Ricardo",
  "Lucía",
];

type ParsedOptions = {
  confirm: boolean;
  clear: boolean;
  dryRun: boolean;
  reservas: number;
  eventos: number;
  weeks: number;
  seed: number;
};

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseArgs(args: string[]): ParsedOptions {
  const options: ParsedOptions = {
    confirm: false,
    clear: false,
    dryRun: false,
    reservas: DEFAULT_RESERVAS,
    eventos: DEFAULT_EVENTOS,
    weeks: DEFAULT_WEEKS,
    seed: DEFAULT_SEED,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--confirm") options.confirm = true;
    else if (arg === "--clear") options.clear = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--reservas") options.reservas = Number(args[index + 1]);
    else if (arg === "--eventos") options.eventos = Number(args[index + 1]);
    else if (arg === "--weeks") options.weeks = Number(args[index + 1]);
    else if (arg === "--seed") options.seed = Number(args[index + 1]);
  }

  if (!Number.isFinite(options.reservas) || options.reservas < 200 || options.reservas > 500) {
    throw new Error("El parámetro --reservas debe estar entre 200 y 500.");
  }

  if (!Number.isFinite(options.eventos) || options.eventos < 200 || options.eventos > 500) {
    throw new Error("El parámetro --eventos debe estar entre 200 y 500.");
  }

  if (!Number.isFinite(options.weeks) || options.weeks < 4 || options.weeks > 8) {
    throw new Error("El parámetro --weeks debe estar entre 4 y 8.");
  }

  if (!Number.isFinite(options.seed)) {
    throw new Error("El parámetro --seed debe ser numérico.");
  }

  return options;
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickOneWeighted<T>(rng: () => number, values: Array<{ value: T; weight: number }>): T {
  const total = values.reduce((sum, item) => sum + item.weight, 0);
  const threshold = rng() * total;
  let cumulative = 0;

  for (const item of values) {
    cumulative += item.weight;
    if (threshold <= cumulative) {
      return item.value;
    }
  }

  return values[values.length - 1].value;
}

function sampleUnique<T>(rng: () => number, values: readonly T[], count: number): T[] {
  const pool = [...values];
  const selected: T[] = [];

  while (pool.length > 0 && selected.length < count) {
    const index = randomInt(rng, 0, pool.length - 1);
    selected.push(pool[index]);
    pool.splice(index, 1);
  }

  return selected;
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function buildProfiles(rng: () => number, count: number): UserProfile[] {
  return Array.from({ length: count }, (_, index) => {
    const nombre = `${NOMBRES[index % NOMBRES.length]} ${APELLIDOS[randomInt(rng, 0, APELLIDOS.length - 1)]}`;
    const telefono = normalizePhone(`+504 ${randomInt(rng, 9000, 9999)}-${randomInt(rng, 1000, 9999)}`);
    const riesgo = pickOneWeighted(rng, [
      { value: "bajo" as const, weight: 68 },
      { value: "medio" as const, weight: 22 },
      { value: "alto" as const, weight: 10 },
    ]);

    return {
      id: `USR-${String(index + 1).padStart(4, "0")}`,
      nombre,
      telefono,
      direccionBase: `${CALLES[randomInt(rng, 0, CALLES.length - 1)]} #${randomInt(rng, 100, 999)}`,
      puntoReferencia: PUNTOS_REFERENCIA[randomInt(rng, 0, PUNTOS_REFERENCIA.length - 1)],
      zonaFavorita: pickOneWeighted(rng, [
        { value: "Norte", weight: 30 },
        { value: "Centro", weight: 24 },
        { value: "Sur", weight: 18 },
        { value: "Este", weight: 16 },
        { value: "Oeste", weight: 12 },
      ]),
      riesgoInasistencia: riesgo,
    };
  });
}

function getDayIndex(day: string): number {
  return DIAS_SEMANA.findIndex((item) => item === day);
}

function buildReserva(
  rng: () => number,
  profile: UserProfile,
  batchId: string,
  index: number,
  weeks: number,
): ReservaSeed {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - randomInt(rng, 7, weeks * 7));
  createdAt.setHours(randomInt(rng, 5, 19), randomInt(rng, 0, 59), randomInt(rng, 0, 59), 0);

  const updatedAt = new Date(createdAt);
  updatedAt.setDate(updatedAt.getDate() + randomInt(rng, 0, 14));
  updatedAt.setHours(randomInt(rng, 6, 20), randomInt(rng, 0, 59), randomInt(rng, 0, 59), 0);

  const daysCount = pickOneWeighted(rng, [
    { value: 3, weight: 20 },
    { value: 4, weight: 35 },
    { value: 5, weight: 35 },
    { value: 6, weight: 10 },
  ]);

  const diasSemana = sampleUnique(rng, DIAS_SEMANA, daysCount).sort((a, b) => getDayIndex(a) - getDayIndex(b));
  const horarioEntrada = pickOneWeighted(rng, [
    { value: "06:00", weight: 14 },
    { value: "06:30", weight: 18 },
    { value: "07:00", weight: 26 },
    { value: "07:30", weight: 24 },
    { value: "08:00", weight: 18 },
  ]);
  const horarioSalida = pickOneWeighted(rng, [
    { value: "16:00", weight: 10 },
    { value: "16:30", weight: 14 },
    { value: "17:00", weight: 28 },
    { value: "17:30", weight: 26 },
    { value: "18:00", weight: 22 },
  ]);
  const tipoTransporte = pickOneWeighted(rng, [
    { value: "Entrada" as const, weight: 30 },
    { value: "Salida" as const, weight: 20 },
    { value: "Ambos" as const, weight: 50 },
  ]);
  const estado = pickOneWeighted(rng, [
    { value: "Agendada", weight: 74 },
    { value: "Cancelada", weight: 10 },
    { value: "Solicitud de modificación", weight: 9 },
    { value: "Solicitud de cancelación", weight: 7 },
  ]);

  return {
    id: `SYN-RES-${batchId}-${String(index + 1).padStart(4, "0")}`,
    nombre: profile.nombre,
    telefono: profile.telefono,
    direccion: `${profile.direccionBase}, zona ${profile.zonaFavorita}`,
    puntoReferencia: profile.puntoReferencia,
    zona: profile.zonaFavorita,
    diasSemana,
    horarioEntrada,
    horarioSalida,
    tipoTransporte,
    observaciones: OBSERVACIONES[randomInt(rng, 0, OBSERVACIONES.length - 1)],
    estado,
    fechaCreacion: Timestamp.fromDate(createdAt),
    ultimaActualizacion: Timestamp.fromDate(updatedAt),
    synthetic: true,
    syntheticBatchId: batchId,
  };
}

function getAttendanceProbability(profile: UserProfile): number {
  if (profile.riesgoInasistencia === "alto") return 0.58;
  if (profile.riesgoInasistencia === "medio") return 0.78;
  return 0.92;
}

function getDateForWeekAndDay(weeksBack: number, day: string): Date {
  const now = new Date();
  const endOfTargetWeek = new Date(now);
  endOfTargetWeek.setDate(now.getDate() - weeksBack * 7);

  const target = new Date(endOfTargetWeek);
  const jsDay = target.getDay();
  const desired = (getDayIndex(day) + 1) % 7;
  const delta = desired - jsDay;
  target.setDate(target.getDate() + delta);
  target.setHours(0, 0, 0, 0);
  return target;
}

function buildEventos(
  rng: () => number,
  reservas: ReservaSeed[],
  profilesByPhone: Map<string, UserProfile>,
  batchId: string,
  total: number,
  weeks: number,
): EventoSeed[] {
  const elegibles = reservas.filter((reserva) => reserva.estado !== "Cancelada");
  const eventos: EventoSeed[] = [];

  if (elegibles.length === 0) return eventos;

  while (eventos.length < total) {
    const reserva = elegibles[randomInt(rng, 0, elegibles.length - 1)];
    const profile = profilesByPhone.get(reserva.telefono);

    if (!profile) {
      continue;
    }

    const dia = reserva.diasSemana[randomInt(rng, 0, reserva.diasSemana.length - 1)] ?? "Lunes";
    const weeksBack = randomInt(rng, 0, Math.max(weeks - 1, 0));
    const baseDate = getDateForWeekAndDay(weeksBack, dia);
    const [hours, minutes] = (reserva.tipoTransporte === "Salida" ? reserva.horarioSalida : reserva.horarioEntrada)
      .split(":")
      .map(Number);
    baseDate.setHours(hours || 7, minutes || 0, randomInt(rng, 0, 59), 0);

    const attends = rng() <= getAttendanceProbability(profile);
    const estadoAsistencia: EventoSeed["estadoAsistencia"] = attends ? "Asistió" : "No asistió";

    eventos.push({
      id: `SYN-EVT-${batchId}-${String(eventos.length + 1).padStart(4, "0")}`,
      reservaId: reserva.id,
      fecha: baseDate.toISOString().split("T")[0],
      estadoAsistencia,
      registradoPor: OPERADORES[randomInt(rng, 0, OPERADORES.length - 1)],
      timestamp: Timestamp.fromDate(baseDate),
      synthetic: true,
      syntheticBatchId: batchId,
    });
  }

  return eventos.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
}

async function clearSyntheticCollection(collectionName: "reservas" | "eventos_asistencia"): Promise<number> {
  const snapshot = await getDocs(query(collection(db, collectionName), where("synthetic", "==", true)));
  let deleted = 0;

  for (let index = 0; index < snapshot.docs.length; index += BATCH_SIZE) {
    const batch = writeBatch(db);
    snapshot.docs.slice(index, index + BATCH_SIZE).forEach((snapshotDoc) => {
      batch.delete(snapshotDoc.ref);
      deleted += 1;
    });
    await batch.commit();
  }

  return deleted;
}

async function insertReservas(reservas: ReservaSeed[]): Promise<void> {
  for (let index = 0; index < reservas.length; index += BATCH_SIZE) {
    const batch = writeBatch(db);
    reservas.slice(index, index + BATCH_SIZE).forEach((reserva) => {
      batch.set(doc(collection(db, "reservas"), reserva.id), reserva);
    });
    await batch.commit();
  }
}

async function insertEventos(eventos: EventoSeed[]): Promise<void> {
  for (let index = 0; index < eventos.length; index += BATCH_SIZE) {
    const batch = writeBatch(db);
    eventos.slice(index, index + BATCH_SIZE).forEach((evento) => {
      batch.set(doc(collection(db, "eventos_asistencia"), evento.id), evento);
    });
    await batch.commit();
  }
}

function printUsage(): void {
  console.log("Uso:");
  console.log("  npm run seed:firestore -- --confirm [--clear] [--dry-run] [--reservas 320] [--eventos 420] [--weeks 6] [--seed 42]");
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!options.confirm) {
    console.error("Abortado: debes usar --confirm para ejecutar el seed.");
    printUsage();
    process.exitCode = 1;
    return;
  }

  const rng = mulberry32(options.seed);
  const batchId = `seed-${options.seed}-${Date.now()}`;
  const userPool = Math.max(140, Math.floor(options.reservas * 0.58));
  const profiles = buildProfiles(rng, userPool);
  const profilesByPhone = new Map(profiles.map((profile) => [profile.telefono, profile]));

  const reservas = Array.from({ length: options.reservas }, (_, index) => {
    const profile = pickOneWeighted(rng, profiles.map((item) => ({
      value: item,
      weight: item.riesgoInasistencia === "alto" ? 2 : item.riesgoInasistencia === "medio" ? 3 : 4,
    })));

    return buildReserva(rng, profile, batchId, index, options.weeks);
  });

  const eventos = buildEventos(rng, reservas, profilesByPhone, batchId, options.eventos, options.weeks);

  if (reservas.some((item) => !item.nombre || !item.telefono || !item.zona || item.diasSemana.length === 0)) {
    throw new Error("Se generaron reservas inválidas; abortando.");
  }

  if (eventos.some((item) => !item.reservaId || !item.fecha || !item.estadoAsistencia)) {
    throw new Error("Se generaron eventos inválidos; abortando.");
  }

  console.log("Seed preparado:");
  console.log(`- Batch ID: ${batchId}`);
  console.log(`- Reservas a insertar: ${reservas.length}`);
  console.log(`- Eventos a insertar: ${eventos.length}`);
  console.log(`- Semanas simuladas: ${options.weeks}`);
  console.log(`- Dry run: ${options.dryRun ? "sí" : "no"}`);
  console.log(`- Limpiar sintéticos previos: ${options.clear ? "sí" : "no"}`);

  if (options.dryRun) {
    console.log("Dry run finalizado sin escribir en Firestore.");
    return;
  }

  try {
    if (options.clear) {
      console.log("Limpiando datos sintéticos previos...");
      const deletedReservas = await clearSyntheticCollection("reservas");
      const deletedEventos = await clearSyntheticCollection("eventos_asistencia");
      console.log(`- Reservas sintéticas eliminadas: ${deletedReservas}`);
      console.log(`- Eventos sintéticos eliminados: ${deletedEventos}`);
    }

    await insertReservas(reservas);
    console.log(`Reservas insertadas correctamente: ${reservas.length}`);

    await insertEventos(eventos);
    console.log(`Eventos insertados correctamente: ${eventos.length}`);

    console.log("Seed completado con éxito.");
  } catch (error) {
    console.error("Error durante el seed de Firestore:", error);
    process.exitCode = 1;
  }
}

void main();
