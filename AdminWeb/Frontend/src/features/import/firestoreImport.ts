import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { buildReservaDuplicateKey, ParsedImportWorkbook } from './excelImport';

type ImportExecutionOptions = {
  mode: 'append' | 'replace-synthetic';
};

export type ImportExecutionProgress = {
  stage: 'cleaning' | 'users' | 'perfiles' | 'reservas' | 'completed';
  message: string;
  progress: number;
};

export type ImportExecutionResult = {
  deletedSyntheticReservas: number;
  deletedSyntheticEventos: number;
  importedUsers: number;
  importedProfiles: number;
  importedReservas: number;
  skippedExistingReservas: number;
};

const BATCH_SIZE = 400;

async function deleteSyntheticCollection(
  collectionName: 'reservas' | 'eventos_asistencia'
): Promise<number> {
  const snapshot = await getDocs(query(collection(db, collectionName), where('synthetic', '==', true)));
  let deleted = 0;

  for (let index = 0; index < snapshot.docs.length; index += BATCH_SIZE) {
    const batch = writeBatch(db);
    snapshot.docs.slice(index, index + BATCH_SIZE).forEach((item) => {
      batch.delete(item.ref);
      deleted += 1;
    });
    await batch.commit();
  }

  return deleted;
}

async function batchSetUsers(data: ParsedImportWorkbook['users']) {
  for (let index = 0; index < data.length; index += BATCH_SIZE) {
    const batch = writeBatch(db);
    data.slice(index, index + BATCH_SIZE).forEach((item) => {
      batch.set(
        doc(db, 'users', item.uid),
        {
          uid: item.uid,
          email: item.email,
          rol: item.rol,
          origen: item.origen,
          synthetic: item.synthetic,
        },
        { merge: true }
      );
    });
    await batch.commit();
  }
}

async function batchSetProfiles(data: ParsedImportWorkbook['perfiles']) {
  for (let index = 0; index < data.length; index += BATCH_SIZE) {
    const batch = writeBatch(db);
    data.slice(index, index + BATCH_SIZE).forEach((item) => {
      batch.set(
        doc(db, 'perfiles', item.uid),
        {
          ...item,
        },
        { merge: true }
      );
    });
    await batch.commit();
  }
}

async function batchAddReservas(data: ParsedImportWorkbook['reservas']) {
  const existingKeys = new Set<string>();
  const existingSnapshot = await getDocs(collection(db, 'reservas'));

  existingSnapshot.forEach((document) => {
    const item = document.data();

    if (
      typeof item.uid !== 'string' ||
      !Array.isArray(item.diasSemana) ||
      typeof item.horarioEntrada !== 'string' ||
      typeof item.horarioSalida !== 'string' ||
      !item.fechaCreacion
    ) {
      return;
    }

    try {
      existingKeys.add(
        buildReservaDuplicateKey({
          uid: item.uid,
          diasSemana: item.diasSemana,
          horarioEntrada: item.horarioEntrada,
          horarioSalida: item.horarioSalida,
          fechaCreacion: item.fechaCreacion,
        })
      );
    } catch (error) {
      console.warn('[firestoreImport] No se pudo evaluar una reserva existente para deduplicación:', error);
    }
  });

  let imported = 0;
  let skipped = 0;

  for (let index = 0; index < data.length; index += BATCH_SIZE) {
    const chunk = data.slice(index, index + BATCH_SIZE);

    await Promise.all(
      chunk.map(async (item) => {
        const duplicateKey = buildReservaDuplicateKey(item);

        if (existingKeys.has(duplicateKey)) {
          skipped += 1;
          return;
        }

        await addDoc(collection(db, 'reservas'), {
          ...item,
        });
        existingKeys.add(duplicateKey);
        imported += 1;
      })
    );
  }

  return {
    imported,
    skipped,
  };
}

export async function executeFirestoreImport(
  workbook: ParsedImportWorkbook,
  options: ImportExecutionOptions,
  onProgress?: (progress: ImportExecutionProgress) => void
): Promise<ImportExecutionResult> {
  let deletedSyntheticReservas = 0;
  let deletedSyntheticEventos = 0;

  if (options.mode === 'replace-synthetic') {
    onProgress?.({
      stage: 'cleaning',
      progress: 10,
      message: 'Eliminando datos sintéticos existentes...',
    });

    deletedSyntheticReservas = await deleteSyntheticCollection('reservas');
    deletedSyntheticEventos = await deleteSyntheticCollection('eventos_asistencia');
  }

  onProgress?.({
    stage: 'users',
    progress: 30,
    message: 'Guardando usuarios en Firestore...',
  });
  await batchSetUsers(workbook.users);

  onProgress?.({
    stage: 'perfiles',
    progress: 55,
    message: 'Guardando perfiles en Firestore...',
  });
  await batchSetProfiles(workbook.perfiles);

  onProgress?.({
    stage: 'reservas',
    progress: 80,
    message: 'Guardando reservas en Firestore y deduplicando existentes...',
  });
  const reservasResult = await batchAddReservas(workbook.reservas);

  onProgress?.({
    stage: 'completed',
    progress: 100,
    message: 'Importación completada.',
  });

  return {
    deletedSyntheticReservas,
    deletedSyntheticEventos,
    importedUsers: workbook.users.length,
    importedProfiles: workbook.perfiles.length,
    importedReservas: reservasResult.imported,
    skippedExistingReservas: reservasResult.skipped,
  };
}
