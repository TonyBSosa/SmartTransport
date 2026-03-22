import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, PlayCircle, RotateCcw, UploadCloud } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { executeFirestoreImport, ImportExecutionResult } from '@/features/import/firestoreImport';
import {
  ImportIssue,
  ImportMode,
  ImportProgressStage,
  parseImportWorkbook,
  ParsedImportWorkbook,
} from '@/features/import/excelImport';

const STAGE_LABELS: Record<ImportProgressStage, string> = {
  idle: 'Selecciona un archivo para comenzar.',
  'file-loaded': 'Archivo cargado.',
  'reading-sheets': 'Leyendo hojas...',
  'validating-structure': 'Validando estructura...',
  'normalizing-data': 'Normalizando datos...',
  'ready-to-import': 'Archivo listo para importar.',
  importing: 'Importando a Firestore...',
  completed: 'Importación completada.',
  error: 'Se encontró un error durante el proceso.',
};

type ProgressState = {
  stage: ImportProgressStage;
  progress: number;
  message: string;
};

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function IssueBadge({ issue }: { issue: ImportIssue }) {
  return issue.severity === 'error' ? (
    <Badge className="bg-destructive text-white">Error</Badge>
  ) : (
    <Badge variant="secondary">Advertencia</Badge>
  );
}

export default function ImportData() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedWorkbook, setParsedWorkbook] = useState<ParsedImportWorkbook | null>(null);
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('replace-synthetic');
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState>({
    stage: 'idle',
    progress: 0,
    message: STAGE_LABELS.idle,
  });

  const canImport = useMemo(() => {
    return !!parsedWorkbook && parsedWorkbook.missingSheets.length === 0 && parsedWorkbook.globalSummary.readyToImport > 0;
  }, [parsedWorkbook]);

  const previewReservas = parsedWorkbook?.reservas.slice(0, 5) ?? [];
  const previewUsers = parsedWorkbook?.users.slice(0, 5) ?? [];
  const previewProfiles = parsedWorkbook?.perfiles.slice(0, 5) ?? [];
  const visibleIssues = parsedWorkbook?.issues.slice(0, 20) ?? [];
  const rejectionSummary = useMemo(
    () =>
      parsedWorkbook?.rejectionSummary.filter((item) =>
        parsedWorkbook.issues.some(
          (issue) => issue.sheet === item.sheet && issue.reason === item.reason && issue.severity === 'error'
        )
      ) ?? [],
    [parsedWorkbook]
  );
  const warningSummary = useMemo(
    () =>
      parsedWorkbook?.rejectionSummary.filter((item) =>
        parsedWorkbook.issues.some(
          (issue) => issue.sheet === item.sheet && issue.reason === item.reason && issue.severity === 'warning'
        )
      ) ?? [],
    [parsedWorkbook]
  );
  const totalIssues = parsedWorkbook?.issues.length ?? 0;
  const totalErrors = parsedWorkbook?.issues.filter((issue) => issue.severity === 'error').length ?? 0;
  const totalWarnings = parsedWorkbook?.issues.filter((issue) => issue.severity === 'warning').length ?? 0;
  const importCompletedWithWarnings =
    !!importResult &&
    ((parsedWorkbook?.issues.length ?? 0) > 0 || importResult.skippedExistingReservas > 0);

  const resetState = () => {
    setSelectedFile(null);
    setParsedWorkbook(null);
    setImportResult(null);
    setProgressState({
      stage: 'idle',
      progress: 0,
      message: STAGE_LABELS.idle,
    });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setParsedWorkbook(null);
    setImportResult(null);

    if (file) {
      setProgressState({
        stage: 'file-loaded',
        progress: 10,
        message: `Archivo cargado: ${file.name}`,
      });
    } else {
      setProgressState({
        stage: 'idle',
        progress: 0,
        message: STAGE_LABELS.idle,
      });
    }
  };

  const runValidation = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo antes de validar.');
      return;
    }

    setIsValidating(true);
    setImportResult(null);

    try {
      setProgressState({
        stage: 'reading-sheets',
        progress: 20,
        message: STAGE_LABELS['reading-sheets'],
      });

      const workbookPromise = parseImportWorkbook(selectedFile);

      setProgressState({
        stage: 'validating-structure',
        progress: 40,
        message: STAGE_LABELS['validating-structure'],
      });

      setProgressState({
        stage: 'normalizing-data',
        progress: 65,
        message: STAGE_LABELS['normalizing-data'],
      });

      const workbook = await workbookPromise;
      setParsedWorkbook(workbook);

      const hasErrors = workbook.issues.some((issue) => issue.severity === 'error');
      setProgressState({
        stage: 'ready-to-import',
        progress: hasErrors ? 85 : 100,
        message: hasErrors
          ? 'Validación terminada con observaciones. Revisa el resumen.'
          : STAGE_LABELS['ready-to-import'],
      });

      if (hasErrors) {
        toast.warning('La validación terminó con errores o advertencias. Revisa el resumen antes de importar.');
      } else {
        toast.success('Archivo validado correctamente.');
      }
    } catch (error) {
      console.error('[ImportData] error validando archivo:', error);
      setProgressState({
        stage: 'error',
        progress: 100,
        message: error instanceof Error ? error.message : 'No se pudo procesar el archivo.',
      });
      toast.error('No se pudo procesar el archivo.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!parsedWorkbook || !canImport) {
      toast.error('No hay datos válidos listos para importar.');
      return;
    }

    setIsImporting(true);

    try {
      setProgressState({
        stage: 'importing',
        progress: 5,
        message: 'Preparando importación...',
      });

      const result = await executeFirestoreImport(parsedWorkbook, { mode: importMode }, (progress) => {
        setProgressState({
          stage: progress.stage === 'completed' ? 'completed' : 'importing',
          progress: progress.progress,
          message: progress.message,
        });
      });

      setImportResult(result);
      if ((parsedWorkbook.issues.length ?? 0) > 0 || result.skippedExistingReservas > 0) {
        toast.warning('Importación completada con advertencias. Revisa el resumen final.');
      } else {
        toast.success('Importación completada correctamente.');
      }
    } catch (error) {
      console.error('[ImportData] error importando datos:', error);
      setProgressState({
        stage: 'error',
        progress: 100,
        message: error instanceof Error ? error.message : 'No se pudo completar la importación.',
      });
      toast.error('No se pudo completar la importación.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold">Importar datos</h1>
          <p className="text-sm text-muted-foreground">
            Carga usuarios, perfiles y reservas desde Excel para poblar Firestore con datos reales.
          </p>
        </div>

        <Button variant="outline" onClick={resetState} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reiniciar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Selección de archivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">
                    {selectedFile ? selectedFile.name : 'Selecciona un archivo .xlsx, .xls o .csv'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    El formato recomendado es .xlsx con hojas `users`, `perfiles` y `reservas`.
                  </p>
                </div>
              </div>

              <Button onClick={() => inputRef.current?.click()} className="gap-2">
                <UploadCloud className="h-4 w-4" />
                Elegir archivo
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void runValidation()} disabled={!selectedFile || isValidating} className="gap-2">
              <PlayCircle className="h-4 w-4" />
              {isValidating ? 'Validando...' : 'Validar y normalizar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Progreso del ETL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressState.progress} />
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{progressState.stage}</Badge>
            <p className="text-sm text-muted-foreground">{progressState.message}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              'Archivo cargado',
              'Leyendo hojas',
              'Validando estructura',
              'Normalizando datos',
              'Resumen listo',
              'Importando a Firestore',
              'Importación completada',
            ].map((label, index) => (
              <div key={label} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <span className="font-medium">{index + 1}.</span> {label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {parsedWorkbook ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>3. Resumen de validación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                <SummaryMetric label="Filas leídas" value={parsedWorkbook.globalSummary.rowsRead} />
                <SummaryMetric label="Registros válidos" value={parsedWorkbook.globalSummary.validRecords} />
                <SummaryMetric label="Inválidos" value={parsedWorkbook.globalSummary.invalidRecords} />
                <SummaryMetric label="Duplicados" value={parsedWorkbook.globalSummary.duplicateRecords} />
                <SummaryMetric label="Omitidos" value={parsedWorkbook.globalSummary.omittedRecords} />
                <SummaryMetric label="Listos para importar" value={parsedWorkbook.globalSummary.readyToImport} />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SummaryMetric label="Incidencias totales" value={totalIssues} />
                <SummaryMetric label="Errores no corregibles" value={totalErrors} />
                <SummaryMetric label="Advertencias" value={totalWarnings} />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hoja</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Válidos</TableHead>
                    <TableHead>Inválidos</TableHead>
                    <TableHead>Duplicados</TableHead>
                    <TableHead>Omitidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedWorkbook.sheetSummaries.map((summary) => (
                    <TableRow key={summary.sheet}>
                      <TableCell className="font-medium">{summary.sheet}</TableCell>
                      <TableCell>{summary.totalRows}</TableCell>
                      <TableCell>{summary.validRows}</TableCell>
                      <TableCell>{summary.invalidRows}</TableCell>
                      <TableCell>{summary.duplicateRows}</TableCell>
                      <TableCell>{summary.omittedRows}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {parsedWorkbook.missingSheets.length > 0 ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  Faltan hojas obligatorias: {parsedWorkbook.missingSheets.join(', ')}.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Correcciones y calidad ETL</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-medium">Correcciones automáticas aplicadas</h3>
                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
                  <SummaryMetric label="Strings limpiados" value={parsedWorkbook.corrections.stringsTrimmed} />
                  <SummaryMetric label="Emails normalizados" value={parsedWorkbook.corrections.emailsNormalized} />
                  <SummaryMetric label="Roles normalizados" value={parsedWorkbook.corrections.rolesNormalized} />
                  <SummaryMetric label="Zonas normalizadas" value={parsedWorkbook.corrections.zonasNormalized} />
                  <SummaryMetric label="Teléfonos limpiados" value={parsedWorkbook.corrections.phonesCleaned} />
                  <SummaryMetric
                    label="perfilCompleto normalizado"
                    value={parsedWorkbook.corrections.perfilCompletoNormalized}
                  />
                  <SummaryMetric
                    label="Días de semana normalizados"
                    value={parsedWorkbook.corrections.diasSemanaNormalized}
                  />
                  <SummaryMetric
                    label="Tipos de transporte"
                    value={parsedWorkbook.corrections.transportTypesNormalized}
                  />
                  <SummaryMetric label="Estados normalizados" value={parsedWorkbook.corrections.estadosNormalized} />
                  <SummaryMetric label="Horas convertidas" value={parsedWorkbook.corrections.timesNormalized} />
                  <SummaryMetric label="Fechas parseadas" value={parsedWorkbook.corrections.datesParsed} />
                  <SummaryMetric label="Encabezados mapeados" value={parsedWorkbook.corrections.headersMapped} />
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-medium">Errores no corregibles</h3>
                  {rejectionSummary.length === 0 ? (
                    <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                      No se detectaron errores no corregibles.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hoja</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Cantidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rejectionSummary.map((item) => (
                          <TableRow key={`${item.sheet}-${item.reason}`}>
                            <TableCell>{item.sheet}</TableCell>
                            <TableCell>{item.reason}</TableCell>
                            <TableCell>{item.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Advertencias y duplicados</h3>
                  {warningSummary.length === 0 ? (
                    <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                      No se detectaron advertencias adicionales.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hoja</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Cantidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warningSummary.map((item) => (
                          <TableRow key={`${item.sheet}-${item.reason}`}>
                            <TableCell>{item.sheet}</TableCell>
                            <TableCell>{item.reason}</TableCell>
                            <TableCell>{item.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Vista previa limpia final</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-3">
                <div className="space-y-3">
                  <h3 className="font-medium">Users</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>uid</TableHead>
                        <TableHead>email</TableHead>
                        <TableHead>rol</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewUsers.map((item) => (
                        <TableRow key={item.uid}>
                          <TableCell className="font-mono text-xs">{item.uid}</TableCell>
                          <TableCell>{item.email}</TableCell>
                          <TableCell>{item.rol}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Perfiles</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>uid</TableHead>
                        <TableHead>nombre</TableHead>
                        <TableHead>zona</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewProfiles.map((item) => (
                        <TableRow key={item.uid}>
                          <TableCell className="font-mono text-xs">{item.uid}</TableCell>
                          <TableCell>{item.nombre}</TableCell>
                          <TableCell>{item.zona}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Reservas</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>uid</TableHead>
                        <TableHead>zona</TableHead>
                        <TableHead>tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewReservas.map((item, index) => (
                        <TableRow key={`${item.uid}-${index}`}>
                          <TableCell className="font-mono text-xs">{item.uid}</TableCell>
                          <TableCell>{item.zona}</TableCell>
                          <TableCell>{item.tipoTransporte}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium">Incidencias detectadas</h3>
                {visibleIssues.length === 0 ? (
                  <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    No se detectaron incidencias.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Hoja</TableHead>
                        <TableHead>Fila</TableHead>
                        <TableHead>Mensaje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleIssues.map((issue, index) => (
                        <TableRow key={`${issue.sheet}-${issue.row}-${index}`}>
                          <TableCell>
                            <IssueBadge issue={issue} />
                          </TableCell>
                          <TableCell>{issue.sheet}</TableCell>
                          <TableCell>{issue.row ?? '-'}</TableCell>
                          <TableCell>{issue.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Confirmar importación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setImportMode('replace-synthetic')}
                  className={`rounded-xl border p-4 text-left transition ${
                    importMode === 'replace-synthetic'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background'
                  }`}
                >
                  <p className="font-medium">Reemplazar datos sintéticos</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Elimina reservas y eventos sintéticos antes de importar los datos reales.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('append')}
                  className={`rounded-xl border p-4 text-left transition ${
                    importMode === 'append' ? 'border-primary bg-primary/5' : 'border-border bg-background'
                  }`}
                >
                  <p className="font-medium">Agregar sobre los existentes</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Conserva datos actuales y agrega los registros del archivo.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={resetState}
                  className="rounded-xl border border-border bg-background p-4 text-left transition hover:bg-muted/30"
                >
                  <p className="font-medium">Cancelar</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Descarta el archivo cargado y reinicia el flujo.
                  </p>
                </button>
              </div>

              <Button onClick={() => void handleImport()} disabled={!canImport || isImporting} className="gap-2">
                <UploadCloud className="h-4 w-4" />
                {isImporting ? 'Importando...' : 'Importar a Firestore'}
              </Button>

              {!canImport ? (
                <p className="text-sm text-muted-foreground">
                  Corrige primero las hojas faltantes o los errores críticos antes de importar.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {importResult ? (
            <Card>
              <CardHeader>
                <CardTitle>7. Resultado final</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`rounded-lg border p-4 text-sm ${
                    importCompletedWithWarnings
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  }`}
                >
                  {importCompletedWithWarnings
                    ? 'Importación completada con advertencias.'
                    : 'Importación completada correctamente.'}
                </div>

                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                  <SummaryMetric label="Users importados" value={importResult.importedUsers} />
                  <SummaryMetric label="Perfiles importados" value={importResult.importedProfiles} />
                  <SummaryMetric label="Reservas importadas" value={importResult.importedReservas} />
                  <SummaryMetric label="Reservas omitidas por duplicado" value={importResult.skippedExistingReservas} />
                  <SummaryMetric label="Reservas sintéticas borradas" value={importResult.deletedSyntheticReservas} />
                  <SummaryMetric label="Eventos sintéticos borrados" value={importResult.deletedSyntheticEventos} />
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
