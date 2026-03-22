import * as XLSX from 'xlsx';
import { Timestamp } from 'firebase/firestore';

export const IMPORT_SHEETS = ['users', 'perfiles', 'reservas'] as const;
export type ImportSheetName = (typeof IMPORT_SHEETS)[number];
export type ImportMode = 'append' | 'replace-synthetic';

export type UserRole = 'admin' | 'empleado' | 'conductor';
export type Zona = 'Norte' | 'Sur' | 'Este' | 'Oeste' | 'Centro';
export type TipoTransporte = 'Entrada' | 'Salida' | 'Ambos';
export type EstadoReserva =
  | 'Agendada'
  | 'Cancelada'
  | 'Asistió'
  | 'No asistió'
  | 'Solicitud de modificación'
  | 'Solicitud de cancelación';
export type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';

export type ImportIssue = {
  sheet: ImportSheetName | 'workbook';
  row: number | null;
  severity: 'error' | 'warning';
  reason: string;
  message: string;
};

export type SheetSummary = {
  sheet: ImportSheetName;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  omittedRows: number;
};

export type ImportSummary = {
  rowsRead: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  omittedRecords: number;
  readyToImport: number;
};

export type CorrectionSummary = {
  stringsTrimmed: number;
  emailsNormalized: number;
  rolesNormalized: number;
  zonasNormalized: number;
  phonesCleaned: number;
  perfilCompletoNormalized: number;
  diasSemanaNormalized: number;
  transportTypesNormalized: number;
  estadosNormalized: number;
  timesNormalized: number;
  datesParsed: number;
  headersMapped: number;
};

export type RejectionSummaryItem = {
  sheet: ImportSheetName | 'workbook';
  reason: string;
  count: number;
};

export type ImportProgressStage =
  | 'idle'
  | 'file-loaded'
  | 'reading-sheets'
  | 'validating-structure'
  | 'normalizing-data'
  | 'ready-to-import'
  | 'importing'
  | 'completed'
  | 'error';

export type NormalizedUserImport = {
  uid: string;
  email: string;
  rol: UserRole;
  origen: 'excel';
  synthetic: false;
};

export type NormalizedProfileImport = {
  uid: string;
  nombre: string;
  telefono: string;
  direccion: string;
  puntoReferencia: string;
  zona: Zona;
  perfilCompleto: true;
  origen: 'excel';
  synthetic: false;
};

export type NormalizedReservaImport = {
  uid: string;
  nombre: string;
  telefono: string;
  direccion: string;
  puntoReferencia: string;
  zona: Zona;
  diasSemana: DiaSemana[];
  horarioEntrada: string;
  horarioSalida: string;
  tipoTransporte: TipoTransporte;
  observaciones: string;
  estado: EstadoReserva;
  fechaCreacion: Timestamp;
  ultimaActualizacion: Timestamp;
  origen: 'excel';
  synthetic: false;
};

export type ParsedImportWorkbook = {
  fileName: string;
  missingSheets: ImportSheetName[];
  users: NormalizedUserImport[];
  perfiles: NormalizedProfileImport[];
  reservas: NormalizedReservaImport[];
  issues: ImportIssue[];
  sheetSummaries: SheetSummary[];
  globalSummary: ImportSummary;
  corrections: CorrectionSummary;
  rejectionSummary: RejectionSummaryItem[];
};

type RawRow = Record<string, unknown>;

const VALID_ZONAS: Zona[] = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro'];
const VALID_TRANSPORT_TYPES: TipoTransporte[] = ['Entrada', 'Salida', 'Ambos'];
const VALID_DAYS: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const VALID_ESTADOS: EstadoReserva[] = [
  'Agendada',
  'Cancelada',
  'Asistió',
  'No asistió',
  'Solicitud de modificación',
  'Solicitud de cancelación',
];

const CANONICAL_HEADERS: Record<ImportSheetName, readonly string[]> = {
  users: ['uid', 'email', 'rol'],
  perfiles: ['uid', 'nombre', 'telefono', 'direccion', 'puntoReferencia', 'zona', 'perfilCompleto'],
  reservas: [
    'uid',
    'nombre',
    'telefono',
    'direccion',
    'puntoReferencia',
    'zona',
    'diasSemana',
    'horarioEntrada',
    'horarioSalida',
    'tipoTransporte',
    'observaciones',
    'estado',
    'fechaCreacion',
  ],
};

const HEADER_ALIASES: Record<ImportSheetName, Record<string, string[]>> = {
  users: {
    uid: ['uid', 'id', 'user_id', 'usuarioid', 'userid'],
    email: ['email', 'correo', 'correoelectronico', 'mail'],
    rol: ['rol', 'role', 'tipo', 'perfil'],
  },
  perfiles: {
    uid: ['uid', 'id', 'user_id', 'usuarioid', 'userid'],
    nombre: ['nombre', 'nombrecompleto', 'full_name', 'fullname'],
    telefono: ['telefono', 'tel', 'phone', 'telefono1', 'celular'],
    direccion: ['direccion', 'address', 'direccionprincipal'],
    puntoReferencia: ['puntoreferencia', 'punto_referencia', 'puntodereferencia', 'punto referencia', 'referencia'],
    zona: ['zona', 'zone', 'sector'],
    perfilCompleto: ['perfilcompleto', 'completo', 'profilecomplete', 'perfil_completo'],
  },
  reservas: {
    uid: ['uid', 'id', 'user_id', 'usuarioid', 'userid'],
    nombre: ['nombre', 'nombrecompleto', 'full_name', 'fullname'],
    telefono: ['telefono', 'tel', 'phone', 'celular'],
    direccion: ['direccion', 'address', 'direccionprincipal'],
    puntoReferencia: ['puntoreferencia', 'punto_referencia', 'punto referencia', 'referencia'],
    zona: ['zona', 'zone', 'sector'],
    diasSemana: ['diassemana', 'dias', 'dias_de_la_semana', 'dias semana'],
    horarioEntrada: ['horarioentrada', 'horaentrada', 'entrada', 'hora_entrada'],
    horarioSalida: ['horariosalida', 'horasalida', 'salida', 'hora_salida'],
    tipoTransporte: ['tipotransporte', 'tipo_transporte', 'tipo transporte', 'transporte'],
    observaciones: ['observaciones', 'notas', 'comentarios'],
    estado: ['estado', 'status'],
    fechaCreacion: ['fechacreacion', 'fecha_creacion', 'fecha', 'createdat', 'created_at'],
  },
};

function createEmptyCorrections(): CorrectionSummary {
  return {
    stringsTrimmed: 0,
    emailsNormalized: 0,
    rolesNormalized: 0,
    zonasNormalized: 0,
    phonesCleaned: 0,
    perfilCompletoNormalized: 0,
    diasSemanaNormalized: 0,
    transportTypesNormalized: 0,
    estadosNormalized: 0,
    timesNormalized: 0,
    datesParsed: 0,
    headersMapped: 0,
  };
}

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s]+/g, '')
    .trim()
    .toLowerCase();
}

function normalizeSheetName(value: string): ImportSheetName | null {
  const normalized = normalizeHeader(value);
  if (normalized === 'users' || normalized === 'usuarios') return 'users';
  if (normalized === 'perfiles' || normalized === 'perfil') return 'perfiles';
  if (normalized === 'reservas' || normalized === 'reserva') return 'reservas';
  return null;
}

function recordIssue(
  issues: ImportIssue[],
  issue: ImportIssue,
  summary: SheetSummary | null
) {
  issues.push(issue);

  if (summary && issue.severity === 'error') {
    summary.invalidRows += 1;
    summary.omittedRows += 1;
  }
}

function cleanString(value: unknown, corrections: CorrectionSummary) {
  const original = value === null || value === undefined ? '' : String(value);
  const cleaned = original.replace(/\s+/g, ' ').trim();

  if (cleaned !== original) {
    corrections.stringsTrimmed += 1;
  }

  return cleaned;
}

function normalizeEmail(value: unknown, corrections: CorrectionSummary) {
  const cleaned = cleanString(value, corrections);
  const normalized = cleaned.toLowerCase();

  if (normalized !== cleaned) {
    corrections.emailsNormalized += 1;
  }

  return normalized;
}

function normalizePhone(value: unknown, corrections: CorrectionSummary) {
  const cleaned = cleanString(value, corrections);
  const normalized = cleaned.replace(/[^\d+]/g, '').replace(/^\+?504/, '');

  if (normalized !== cleaned) {
    corrections.phonesCleaned += 1;
  }

  return normalized;
}

function normalizeUserRoleValue(value: unknown, corrections: CorrectionSummary): UserRole | null {
  const cleaned = normalizeHeader(cleanString(value, corrections));

  const mapping: Record<string, UserRole> = {
    admin: 'admin',
    administrador: 'admin',
    administrator: 'admin',
    empleado: 'empleado',
    employee: 'empleado',
    worker: 'empleado',
    conductor: 'conductor',
    driver: 'conductor',
    chofer: 'conductor',
    chofe: 'conductor',
  };

  const normalized = mapping[cleaned] ?? null;

  if (normalized && cleanString(value, corrections).toLowerCase() !== normalized) {
    corrections.rolesNormalized += 1;
  }

  return normalized;
}

function normalizeZonaValue(value: unknown, corrections: CorrectionSummary): Zona | null {
  const cleaned = normalizeHeader(cleanString(value, corrections));
  const match = VALID_ZONAS.find((item) => normalizeHeader(item) === cleaned) ?? null;

  if (match && cleanString(value, corrections) !== match) {
    corrections.zonasNormalized += 1;
  }

  return match;
}

function normalizePerfilCompleto(value: unknown, corrections: CorrectionSummary) {
  const cleaned = normalizeHeader(cleanString(value, corrections));

  if (!cleaned) {
    corrections.perfilCompletoNormalized += 1;
    return true;
  }

  if (['true', '1', 'si', 'sí', 'yes'].includes(cleaned)) {
    if (cleaned !== 'true') {
      corrections.perfilCompletoNormalized += 1;
    }
    return true;
  }

  if (['false', '0', 'no'].includes(cleaned)) {
    corrections.perfilCompletoNormalized += 1;
    return false;
  }

  corrections.perfilCompletoNormalized += 1;
  return true;
}

function normalizeDiasSemanaValue(value: unknown, corrections: CorrectionSummary): DiaSemana[] | null {
  const cleaned = cleanString(value, corrections);
  if (!cleaned) return null;

  const parts = cleaned
    .split(/[,/|;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const normalizedDays = parts.map((item) => VALID_DAYS.find((day) => normalizeHeader(day) === normalizeHeader(item)) ?? null);

  if (normalizedDays.some((item) => item === null)) {
    return null;
  }

  const uniqueDays = Array.from(new Set(normalizedDays)) as DiaSemana[];
  if (cleaned !== uniqueDays.join(',')) {
    corrections.diasSemanaNormalized += 1;
  }

  return uniqueDays;
}

function normalizeTipoTransporteValue(value: unknown, corrections: CorrectionSummary): TipoTransporte | null {
  const cleaned = normalizeHeader(cleanString(value, corrections));
  const match = VALID_TRANSPORT_TYPES.find((item) => normalizeHeader(item) === cleaned) ?? null;

  if (match && cleanString(value, corrections) !== match) {
    corrections.transportTypesNormalized += 1;
  }

  return match;
}

function normalizeEstadoValue(value: unknown, corrections: CorrectionSummary): EstadoReserva | null {
  const cleanedSource = cleanString(value, corrections);
  const cleaned = normalizeHeader(cleanedSource);

  const mapping: Record<string, EstadoReserva> = {
    agendada: 'Agendada',
    confirmada: 'Agendada',
    programada: 'Agendada',
    cancelada: 'Cancelada',
    cancelado: 'Cancelada',
    asistio: 'Asistió',
    asistió: 'Asistió',
    completada: 'Asistió',
    noasistio: 'No asistió',
    noasistió: 'No asistió',
    inasistencia: 'No asistió',
    solicituddemodificacion: 'Solicitud de modificación',
    solicituddemodificación: 'Solicitud de modificación',
    solicituddecancelacion: 'Solicitud de cancelación',
    solicituddecancelación: 'Solicitud de cancelación',
  };

  const normalized = mapping[cleaned] ?? null;
  if (!normalized) return null;

  if (cleanedSource !== normalized) {
    corrections.estadosNormalized += 1;
  }

  return normalized;
}

function normalizeTimeValue(value: unknown, corrections: CorrectionSummary): string | null {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const date = new Date(2000, 0, 1, parsed.H, parsed.M, parsed.S);
      corrections.timesNormalized += 1;
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  }

  const cleaned = cleanString(value, corrections);
  if (!cleaned) return null;

  const twelveHourPattern = /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i;
  const twentyFourHourPattern = /^([01]?\d|2[0-3]):([0-5]\d)$/;

  const twelveHourMatch = cleaned.match(twelveHourPattern);
  if (twelveHourMatch) {
    const [, hours, minutes, ampm] = twelveHourMatch;
    const normalized = `${hours.padStart(2, '0')}:${minutes} ${ampm.toUpperCase()}`;
    if (normalized !== cleaned) {
      corrections.timesNormalized += 1;
    }
    return normalized;
  }

  const twentyFourHourMatch = cleaned.match(twentyFourHourPattern);
  if (!twentyFourHourMatch) return null;

  const hours = Number(twentyFourHourMatch[1]);
  const minutes = twentyFourHourMatch[2];
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const twelveHour = hours % 12 || 12;
  corrections.timesNormalized += 1;
  return `${String(twelveHour).padStart(2, '0')}:${minutes} ${suffix}`;
}

function parseDateValue(value: unknown, corrections: CorrectionSummary): Timestamp | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Timestamp.fromDate(value);
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    corrections.datesParsed += 1;
    return Timestamp.fromDate(new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S));
  }

  const cleaned = cleanString(value, corrections);
  if (!cleaned) {
    corrections.datesParsed += 1;
    return Timestamp.fromDate(new Date());
  }

  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    if (cleaned !== parsed.toISOString()) {
      corrections.datesParsed += 1;
    }
    return Timestamp.fromDate(parsed);
  }

  const ddmmyyyyMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s?(AM|PM))?)?$/i);
  if (!ddmmyyyyMatch) return null;

  const [, dayRaw, monthRaw, yearRaw, hourRaw = '0', minuteRaw = '0', ampm] = ddmmyyyyMatch;
  let hours = Number(hourRaw);
  const minutes = Number(minuteRaw);

  if (ampm) {
    const uppercaseAmpm = ampm.toUpperCase();
    if (uppercaseAmpm === 'PM' && hours < 12) hours += 12;
    if (uppercaseAmpm === 'AM' && hours === 12) hours = 0;
  }

  corrections.datesParsed += 1;
  return Timestamp.fromDate(new Date(Number(yearRaw), Number(monthRaw) - 1, Number(dayRaw), hours, minutes));
}

function buildHeaderLookup(sheet: ImportSheetName) {
  return Object.entries(HEADER_ALIASES[sheet]).reduce<Record<string, string>>((accumulator, [canonical, aliases]) => {
    aliases.forEach((alias) => {
      accumulator[normalizeHeader(alias)] = canonical;
    });
    return accumulator;
  }, {});
}

function canonicalizeRow(sheet: ImportSheetName, row: RawRow, corrections: CorrectionSummary): RawRow {
  const lookup = buildHeaderLookup(sheet);
  const canonicalRow: RawRow = {};

  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = normalizeHeader(key);
    const canonicalKey = lookup[normalizedKey];

    if (canonicalKey) {
      canonicalRow[canonicalKey] = value;
      if (canonicalKey !== key) {
        corrections.headersMapped += 1;
      }
    }
  });

  CANONICAL_HEADERS[sheet].forEach((header) => {
    if (!(header in canonicalRow)) {
      canonicalRow[header] = '';
    }
  });

  return canonicalRow;
}

function createSheetSummary(sheet: ImportSheetName, totalRows: number): SheetSummary {
  return {
    sheet,
    totalRows,
    validRows: 0,
    invalidRows: 0,
    duplicateRows: 0,
    omittedRows: 0,
  };
}

async function readWorkbook(file: File) {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: 'array', cellDates: true });
}

function getSheetRows(workbook: XLSX.WorkBook, fileName: string, corrections: CorrectionSummary) {
  const rowsBySheet = new Map<ImportSheetName, RawRow[]>();

  workbook.SheetNames.forEach((sheetName) => {
    const normalizedSheet = normalizeSheetName(sheetName);
    if (!normalizedSheet) return;

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<RawRow>(worksheet, {
      defval: '',
      raw: true,
    });

    rowsBySheet.set(normalizedSheet, rows.map((row) => canonicalizeRow(normalizedSheet, row, corrections)));
  });

  if (rowsBySheet.size === 0 && fileName.toLowerCase().endsWith('.csv')) {
    const csvSheetName = normalizeSheetName(fileName.replace(/\.[^.]+$/, ''));
    if (csvSheetName) {
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<RawRow>(firstSheet, { defval: '', raw: true });
      rowsBySheet.set(csvSheetName, rows.map((row) => canonicalizeRow(csvSheetName, row, corrections)));
    }
  }

  return rowsBySheet;
}

function buildRejectionSummary(issues: ImportIssue[]): RejectionSummaryItem[] {
  const grouped = new Map<string, RejectionSummaryItem>();

  issues.forEach((issue) => {
    const key = `${issue.sheet}__${issue.reason}`;
    const current = grouped.get(key);

    if (current) {
      current.count += 1;
      return;
    }

    grouped.set(key, {
      sheet: issue.sheet,
      reason: issue.reason,
      count: 1,
    });
  });

  return Array.from(grouped.values()).sort((a, b) => a.sheet.localeCompare(b.sheet) || b.count - a.count);
}

export function buildReservaDuplicateKey(data: {
  uid: string;
  diasSemana: string[];
  horarioEntrada: string;
  horarioSalida: string;
  fechaCreacion: Timestamp | Date;
}) {
  const fecha = data.fechaCreacion instanceof Timestamp ? data.fechaCreacion.toDate() : data.fechaCreacion;

  return [
    data.uid,
    data.diasSemana.join(','),
    data.horarioEntrada,
    data.horarioSalida,
    fecha.toISOString(),
  ].join('__');
}

export async function parseImportWorkbook(file: File): Promise<ParsedImportWorkbook> {
  const corrections = createEmptyCorrections();
  const workbook = await readWorkbook(file);
  const rowsBySheet = getSheetRows(workbook, file.name, corrections);
  const issues: ImportIssue[] = [];
  const missingSheets = IMPORT_SHEETS.filter((sheet) => !rowsBySheet.has(sheet));

  missingSheets.forEach((sheet) => {
    issues.push({
      sheet: 'workbook',
      row: null,
      severity: 'error',
      reason: 'missing_sheet',
      message: `Falta la hoja obligatoria "${sheet}".`,
    });
  });

  const userRows = rowsBySheet.get('users') ?? [];
  const profileRows = rowsBySheet.get('perfiles') ?? [];
  const reservaRows = rowsBySheet.get('reservas') ?? [];

  const userSummary = createSheetSummary('users', userRows.length);
  const profileSummary = createSheetSummary('perfiles', profileRows.length);
  const reservaSummary = createSheetSummary('reservas', reservaRows.length);

  const users = new Map<string, NormalizedUserImport>();
  const perfiles = new Map<string, NormalizedProfileImport>();
  const reservas = new Map<string, NormalizedReservaImport>();

  userRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const uid = cleanString(row.uid, corrections);
    const email = normalizeEmail(row.email, corrections);
    const rol = normalizeUserRoleValue(row.rol, corrections);

    if (!uid) {
      recordIssue(issues, {
        sheet: 'users',
        row: rowNumber,
        severity: 'error',
        reason: 'uid_missing',
        message: 'Falta uid en la hoja users.',
      }, userSummary);
      return;
    }

    if (!email) {
      recordIssue(issues, {
        sheet: 'users',
        row: rowNumber,
        severity: 'error',
        reason: 'email_missing',
        message: `Falta email para el uid "${uid}".`,
      }, userSummary);
      return;
    }

    if (!rol) {
      recordIssue(issues, {
        sheet: 'users',
        row: rowNumber,
        severity: 'error',
        reason: 'rol_invalid',
        message: `El rol "${cleanString(row.rol, corrections)}" no se pudo normalizar.`,
      }, userSummary);
      return;
    }

    if (users.has(uid)) {
      userSummary.duplicateRows += 1;
      userSummary.omittedRows += 1;
      issues.push({
        sheet: 'users',
        row: rowNumber,
        severity: 'warning',
        reason: 'duplicate_uid',
        message: `UID duplicado "${uid}" en users. Se omitió la fila duplicada.`,
      });
      return;
    }

    users.set(uid, {
      uid,
      email,
      rol,
      origen: 'excel',
      synthetic: false,
    });
    userSummary.validRows += 1;
  });

  profileRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const uid = cleanString(row.uid, corrections);
    const nombre = cleanString(row.nombre, corrections);
    const telefono = normalizePhone(row.telefono, corrections);
    const direccion = cleanString(row.direccion, corrections);
    const puntoReferencia = cleanString(row.puntoReferencia, corrections);
    const zona = normalizeZonaValue(row.zona, corrections);
    normalizePerfilCompleto(row.perfilCompleto, corrections);

    if (!uid) {
      recordIssue(issues, {
        sheet: 'perfiles',
        row: rowNumber,
        severity: 'error',
        reason: 'uid_missing',
        message: 'Falta uid en la hoja perfiles.',
      }, profileSummary);
      return;
    }

    if (!users.has(uid)) {
      recordIssue(issues, {
        sheet: 'perfiles',
        row: rowNumber,
        severity: 'error',
        reason: 'uid_not_found_in_users',
        message: `El uid "${uid}" no existe en la hoja users.`,
      }, profileSummary);
      return;
    }

    if (!nombre) {
      recordIssue(issues, {
        sheet: 'perfiles',
        row: rowNumber,
        severity: 'error',
        reason: 'nombre_missing',
        message: `Falta nombre para el uid "${uid}".`,
      }, profileSummary);
      return;
    }

    if (!telefono) {
      recordIssue(issues, {
        sheet: 'perfiles',
        row: rowNumber,
        severity: 'error',
        reason: 'telefono_invalid',
        message: `El teléfono del uid "${uid}" quedó vacío o inválido tras la limpieza.`,
      }, profileSummary);
      return;
    }

    if (!direccion) {
      recordIssue(issues, {
        sheet: 'perfiles',
        row: rowNumber,
        severity: 'error',
        reason: 'direccion_missing',
        message: `Falta dirección para el uid "${uid}".`,
      }, profileSummary);
      return;
    }

    if (!zona) {
      recordIssue(issues, {
        sheet: 'perfiles',
        row: rowNumber,
        severity: 'error',
        reason: 'zona_invalid',
        message: `La zona "${cleanString(row.zona, corrections)}" no es válida.`,
      }, profileSummary);
      return;
    }

    if (perfiles.has(uid)) {
      profileSummary.duplicateRows += 1;
      profileSummary.omittedRows += 1;
      issues.push({
        sheet: 'perfiles',
        row: rowNumber,
        severity: 'warning',
        reason: 'duplicate_uid',
        message: `UID duplicado "${uid}" en perfiles. Se omitió la fila duplicada.`,
      });
      return;
    }

    perfiles.set(uid, {
      uid,
      nombre,
      telefono,
      direccion,
      puntoReferencia,
      zona,
      perfilCompleto: true,
      origen: 'excel',
      synthetic: false,
    });
    profileSummary.validRows += 1;
  });

  reservaRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const uid = cleanString(row.uid, corrections);
    const nombre = cleanString(row.nombre, corrections);
    const telefono = normalizePhone(row.telefono, corrections);
    const direccion = cleanString(row.direccion, corrections);
    const puntoReferencia = cleanString(row.puntoReferencia, corrections);
    const zona = normalizeZonaValue(row.zona, corrections);
    const diasSemana = normalizeDiasSemanaValue(row.diasSemana, corrections);
    const horarioEntrada = normalizeTimeValue(row.horarioEntrada, corrections);
    const horarioSalida = normalizeTimeValue(row.horarioSalida, corrections);
    const tipoTransporte = normalizeTipoTransporteValue(row.tipoTransporte, corrections);
    const observaciones = cleanString(row.observaciones, corrections);
    const estado = normalizeEstadoValue(row.estado ?? 'Agendada', corrections);
    const fechaCreacion = parseDateValue(row.fechaCreacion, corrections);

    if (!uid) {
      recordIssue(issues, {
        sheet: 'reservas',
        row: rowNumber,
        severity: 'error',
        reason: 'uid_missing',
        message: 'Falta uid en la hoja reservas.',
      }, reservaSummary);
      return;
    }

    if (!users.has(uid)) {
      recordIssue(issues, {
        sheet: 'reservas',
        row: rowNumber,
        severity: 'error',
        reason: 'uid_not_found_in_users',
        message: `El uid "${uid}" no existe en la hoja users.`,
      }, reservaSummary);
      return;
    }

    if (!zona) {
      recordIssue(issues, {
        sheet: 'reservas',
        row: rowNumber,
        severity: 'error',
        reason: 'zona_invalid',
        message: `La zona "${cleanString(row.zona, corrections)}" no es válida.`,
      }, reservaSummary);
      return;
    }

    if (!diasSemana) {
      recordIssue(issues, {
        sheet: 'reservas',
        row: rowNumber,
        severity: 'error',
        reason: 'dias_semana_invalid',
        message: `No se pudieron interpretar los días de la semana para el uid "${uid}".`,
      }, reservaSummary);
      return;
    }

    if (!horarioEntrada || !horarioSalida) {
      recordIssue(issues, {
        sheet: 'reservas',
        row: rowNumber,
        severity: 'error',
        reason: 'horario_invalid',
        message: `Los horarios de entrada/salida del uid "${uid}" no son válidos.`,
      }, reservaSummary);
      return;
    }

    if (!tipoTransporte) {
      recordIssue(issues, {
        sheet: 'reservas',
        row: rowNumber,
        severity: 'error',
        reason: 'tipo_transporte_invalid',
        message: `El tipoTransporte "${cleanString(row.tipoTransporte, corrections)}" no es válido.`,
      }, reservaSummary);
      return;
    }

    if (!estado) {
      recordIssue(issues, {
        sheet: 'reservas',
        row: rowNumber,
        severity: 'error',
        reason: 'estado_invalid',
        message: `El estado "${cleanString(row.estado, corrections)}" no se pudo normalizar.`,
      }, reservaSummary);
      return;
    }

    if (!fechaCreacion) {
      recordIssue(issues, {
        sheet: 'reservas',
        row: rowNumber,
        severity: 'error',
        reason: 'fecha_invalid',
        message: `La fechaCreacion del uid "${uid}" no se pudo parsear.`,
      }, reservaSummary);
      return;
    }

    if (!nombre || !telefono || !direccion || !puntoReferencia) {
      recordIssue(issues, {
        sheet: 'reservas',
        row: rowNumber,
        severity: 'error',
        reason: 'required_fields_missing',
        message: `Faltan datos personales obligatorios para la reserva del uid "${uid}".`,
      }, reservaSummary);
      return;
    }

    const duplicateKey = buildReservaDuplicateKey({
      uid,
      diasSemana,
      horarioEntrada,
      horarioSalida,
      fechaCreacion,
    });

    if (reservas.has(duplicateKey)) {
      reservaSummary.duplicateRows += 1;
      reservaSummary.omittedRows += 1;
      issues.push({
        sheet: 'reservas',
        row: rowNumber,
        severity: 'warning',
        reason: 'duplicate_reserva_in_file',
        message: 'Se detectó una reserva duplicada dentro del archivo y fue omitida.',
      });
      return;
    }

    reservas.set(duplicateKey, {
      uid,
      nombre,
      telefono,
      direccion,
      puntoReferencia,
      zona,
      diasSemana,
      horarioEntrada,
      horarioSalida,
      tipoTransporte,
      observaciones,
      estado,
      fechaCreacion,
      ultimaActualizacion: fechaCreacion,
      origen: 'excel',
      synthetic: false,
    });
    reservaSummary.validRows += 1;
  });

  const sheetSummaries = [userSummary, profileSummary, reservaSummary];
  const globalSummary = sheetSummaries.reduce<ImportSummary>(
    (accumulator, summary) => {
      accumulator.rowsRead += summary.totalRows;
      accumulator.validRecords += summary.validRows;
      accumulator.invalidRecords += summary.invalidRows;
      accumulator.duplicateRecords += summary.duplicateRows;
      accumulator.omittedRecords += summary.omittedRows;
      accumulator.readyToImport += summary.validRows;
      return accumulator;
    },
    {
      rowsRead: 0,
      validRecords: 0,
      invalidRecords: 0,
      duplicateRecords: 0,
      omittedRecords: 0,
      readyToImport: 0,
    }
  );

  return {
    fileName: file.name,
    missingSheets,
    users: Array.from(users.values()),
    perfiles: Array.from(perfiles.values()),
    reservas: Array.from(reservas.values()),
    issues,
    sheetSummaries,
    globalSummary,
    corrections,
    rejectionSummary: buildRejectionSummary(issues),
  };
}
