import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../src/lib/firebase';
import { normalizeUserRole } from '../src/lib/userRoles';

type Options = {
  confirm: boolean;
  dryRun: boolean;
};

function parseArgs(args: string[]): Options {
  return {
    confirm: args.includes('--confirm'),
    dryRun: args.includes('--dry-run'),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.confirm) {
    console.error('Debes usar --confirm para ejecutar la migración.');
    console.log('Ejemplo: npm run migrate:users -- --confirm --dry-run');
    process.exitCode = 1;
    return;
  }

  const snapshot = await getDocs(collection(db, 'users'));
  const batch = writeBatch(db);
  let writes = 0;
  let deletions = 0;
  let ambiguous = 0;

  console.log(`[migrateUsers] documentos encontrados: ${snapshot.size}`);

  snapshot.docs.forEach((item) => {
    const data = item.data();
    const normalizedRole = normalizeUserRole(data.rol ?? data.role);
    const targetUid = typeof data.uid === 'string' && data.uid.trim() ? data.uid.trim() : item.id;
    const hasRoleData = Boolean(normalizedRole);
    const requiresMove = item.id !== targetUid;
    const requiresNormalization =
      data.rol !== normalizedRole ||
      data.email !== String(data.email ?? '') ||
      data.uid !== targetUid ||
      Boolean(data.role);

    if (requiresMove && typeof data.uid !== 'string') {
      ambiguous += 1;
      console.warn('[migrateUsers] documento ambiguo, no se puede mover automáticamente:', {
        docId: item.id,
        data,
      });
      return;
    }

    if (!hasRoleData) {
      console.warn('[migrateUsers] documento sin rol válido:', {
        docId: item.id,
        data,
      });
      ambiguous += 1;
      return;
    }

    const normalizedDoc = {
      uid: targetUid,
      email: String(data.email ?? ''),
      rol: normalizedRole,
    };

    if (requiresMove || requiresNormalization) {
      console.log('[migrateUsers] corrigiendo documento:', {
        from: item.id,
        to: targetUid,
        normalizedDoc,
      });

      batch.set(doc(db, 'users', targetUid), normalizedDoc, { merge: true });
      writes += 1;

      if (requiresMove) {
        batch.delete(item.ref);
        deletions += 1;
      }
    }
  });

  console.log('[migrateUsers] resumen:', {
    writes,
    deletions,
    ambiguous,
    dryRun: options.dryRun,
  });

  if (options.dryRun) {
    console.log('[migrateUsers] dry-run completado sin cambios.');
    return;
  }

  if (writes > 0 || deletions > 0) {
    await batch.commit();
    console.log('[migrateUsers] migración aplicada correctamente.');
  } else {
    console.log('[migrateUsers] no hubo cambios para aplicar.');
  }
}

void main().catch((error) => {
  console.error('[migrateUsers] error inesperado:', error);
  process.exitCode = 1;
});
