import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { RouteInput, WindowRow } from './engine';
import { parseSpreadsheet } from './fileParsers';
import {
  buildStandardReplacementPreview,
  queryDeadlineHistory,
  queryDeadlineRowsByVersion,
  queryValidDeadlineRows,
  saveDeadlineDataset,
  SaveDatasetMetadata,
  ValidityType,
} from './deadlineStore';
import {
  compareCurrentDeadlineWithPrevious,
  queryPlanningHistory,
  queryValidPlanning,
  savePlanningDataset,
  PlanningChangeType,
  PlanningScopeType,
  PlanningSourceType,
} from './planningStore';
import { parseValidatedDeadlineSpreadsheet } from './validatedDeadlineParsers';
import { getSupabaseConfig } from './env';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

type BackgroundJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

type BackgroundJobRecord = {
  id: string;
  type: 'SAVE_PLANNING' | 'IMPORT_PLANNING';
  status: BackgroundJobStatus;
  message: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  result?: Record<string, unknown>;
  error?: string;
};

const backgroundJobs = new Map<string, BackgroundJobRecord>();

function updateBackgroundJob(id: string, patch: Partial<BackgroundJobRecord>) {
  const current = backgroundJobs.get(id);
  if (!current) {
    return;
  }

  backgroundJobs.set(id, {
    ...current,
    ...patch,
    progress:
      patch.progress === undefined
        ? current.progress
        : Math.max(0, Math.min(100, Math.round(Number(patch.progress) || 0))),
    updatedAt: new Date().toISOString(),
  });
}

type BackgroundJobProgressUpdater = (patch: {
  message?: string;
  progress?: number;
  status?: BackgroundJobStatus;
}) => void;

function startProgressTicker(
  update: BackgroundJobProgressUpdater,
  options: {
    start: number;
    end: number;
    step?: number;
    intervalMs?: number;
    message: string;
  },
) {
  let current = options.start;
  update({
    progress: current,
    message: options.message,
  });

  const timer = setInterval(() => {
    current = Math.min(options.end, current + (options.step ?? 2));
    update({
      progress: current,
      message: options.message,
    });

    if (current >= options.end) {
      clearInterval(timer);
    }
  }, options.intervalMs ?? 3500);

  return () => clearInterval(timer);
}

function createBackgroundJob(
  type: BackgroundJobRecord['type'],
  queuedMessage: string,
  runner: (update: BackgroundJobProgressUpdater) => Promise<Record<string, unknown>>,
): BackgroundJobRecord {
  const job: BackgroundJobRecord = {
    id: crypto.randomUUID(),
    type,
    status: 'QUEUED',
    message: queuedMessage,
    progress: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  backgroundJobs.set(job.id, job);

  setTimeout(async () => {
    const update: BackgroundJobProgressUpdater = (patch) =>
      updateBackgroundJob(job.id, {
        status: patch.status,
        message: patch.message,
        progress: patch.progress,
      });

    update({
      status: 'RUNNING',
      message: 'Preparando a rotina no servidor...',
      progress: 8,
    });

    try {
      const result = await runner(update);
      updateBackgroundJob(job.id, {
        status: 'COMPLETED',
        message: 'Processamento concluido com sucesso.',
        progress: 100,
        result,
      });
    } catch (error) {
      updateBackgroundJob(job.id, {
        status: 'FAILED',
        message: 'Falha ao processar a rotina.',
        progress: 100,
        error: error instanceof Error ? error.message : 'Erro interno ao processar a rotina.',
      });
    }
  }, 10);

  return job;
}

function parseMetadata(body: Record<string, unknown>, defaults?: Partial<SaveDatasetMetadata>): SaveDatasetMetadata {
  const validityType = String(body.validityType ?? defaults?.validityType ?? '').trim() as ValidityType;
  const validFrom = String(body.validFrom ?? defaults?.validFrom ?? '').trim();
  const validTo = String(body.validTo ?? defaults?.validTo ?? '').trim();
  const observation = String(body.observation ?? defaults?.observation ?? '').trim();
  const fileName = String(body.fileName ?? defaults?.fileName ?? '').trim();
  const sourceName = String(body.sourceName ?? defaults?.sourceName ?? '').trim();
  const sourceType = String(body.sourceType ?? defaults?.sourceType ?? '').trim() as SaveDatasetMetadata['sourceType'];

  return {
    validityType,
    validFrom,
    validTo: validTo || null,
    observation: observation || null,
    fileName: fileName || null,
    sourceName: sourceName || null,
    sourceType,
    payload: (body.payload as Record<string, unknown> | undefined) ?? defaults?.payload ?? null,
  };
}

function parsePlanningMetadata(
  body: Record<string, unknown>,
  defaults?: {
    validityType?: ValidityType;
    validFrom?: string;
    validTo?: string | null;
    observation?: string | null;
    fileName?: string | null;
    sourceName?: string | null;
    sourceType?: PlanningSourceType;
    changeType?: PlanningChangeType;
    scopeType?: PlanningScopeType;
  },
) {
  const validityType = String(body.validityType ?? defaults?.validityType ?? '').trim() as ValidityType;
  const validFrom = String(body.validFrom ?? defaults?.validFrom ?? '').trim();
  const validTo = String(body.validTo ?? defaults?.validTo ?? '').trim();
  const observation = String(body.observation ?? defaults?.observation ?? '').trim();
  const fileName = String(body.fileName ?? defaults?.fileName ?? '').trim();
  const sourceName = String(body.sourceName ?? defaults?.sourceName ?? '').trim();
  const sourceType = String(body.sourceType ?? defaults?.sourceType ?? '').trim() as PlanningSourceType;
  const changeType = String(body.changeType ?? defaults?.changeType ?? validityType).trim() as PlanningChangeType;
  const scopeType = String(body.scopeType ?? defaults?.scopeType ?? 'ROTA').trim() as PlanningScopeType;

  return {
    validityType,
    validFrom,
    validTo: validTo || null,
    observation: observation || null,
    fileName: fileName || null,
    sourceName: sourceName || null,
    sourceType,
    changeType,
    scopeType,
  };
}

router.get('/db/status', (req, res) => {
  const config = getSupabaseConfig();
  const hasDbConnection =
    Boolean(config.dbHost) &&
    Boolean(config.dbPort) &&
    Boolean(config.dbName) &&
    Boolean(config.dbUser) &&
    Boolean(config.dbPassword);

  res.json({
    configured: Boolean(config.url && (config.serviceRoleKey || hasDbConnection)),
    hasUrl: Boolean(config.url),
    hasAnonKey: Boolean(config.anonKey),
    hasServiceRoleKey: Boolean(config.serviceRoleKey),
    hasDbConnection,
  });
});

router.get('/db/jobs/:jobId', (req, res) => {
  const job = backgroundJobs.get(String(req.params.jobId ?? '').trim());

  if (!job) {
    return res.status(404).json({ error: 'Job nao encontrado.' });
  }

  return res.json({
    status: 'ok',
    job,
  });
});

router.post('/db/save-current', async (req, res) => {
  try {
    const rows = (req.body?.rows ?? []) as WindowRow[];
    const routes = (req.body?.routes ?? []) as RouteInput[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Envie o resultado calculado para salvar no banco.' });
    }

    const metadata = parseMetadata(req.body ?? {}, {
      sourceType: 'CALCULO_MANUAL',
    });

    const result = await saveDeadlineDataset({
      rows,
      routes: Array.isArray(routes) && routes.length ? routes : undefined,
      metadata,
    });

    return res.json({
      status: 'ok',
      mode: 'save-current',
      ...result,
      standardReplacementPreview:
        metadata.validityType === 'PADRAO'
          ? buildStandardReplacementPreview(metadata.validFrom)
          : null,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Nao foi possivel salvar o calculo atual no banco.',
    });
  }
});

router.post('/db/import-validated', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo validado nao enviado.' });
  }

  const tempFilePath = path.resolve(req.file.path);
  const originalExtension = path.extname(req.file.originalname).toLowerCase();
  const filePath = originalExtension ? `${tempFilePath}${originalExtension}` : tempFilePath;

  try {
    if (filePath !== tempFilePath) {
      fs.renameSync(tempFilePath, filePath);
    }

    const rows = await parseValidatedDeadlineSpreadsheet(filePath, req.file.originalname);
    const metadata = parseMetadata(req.body as Record<string, unknown>, {
      fileName: req.file.originalname,
      sourceName: 'Importacao de prazos validados',
      sourceType: 'PLANILHA_VALIDADA',
    });

    const result = await saveDeadlineDataset({
      rows,
      metadata,
    });

    fs.unlinkSync(filePath);

    return res.json({
      status: 'ok',
      mode: 'import-validated',
      importedRows: rows.length,
      ...result,
      standardReplacementPreview:
        metadata.validityType === 'PADRAO'
          ? buildStandardReplacementPreview(metadata.validFrom)
          : null,
    });
  } catch (error) {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Nao foi possivel importar os prazos validados para o banco.',
    });
  }
});

router.post('/db/save-planning-current', async (req, res) => {
  try {
    const routes = (req.body?.routes ?? []) as RouteInput[];
    const rows = (req.body?.rows ?? []) as WindowRow[];

    if (!Array.isArray(routes) || routes.length === 0) {
      return res.status(400).json({ error: 'Envie ao menos uma rota do planejamento para salvar.' });
    }

    const metadata = parsePlanningMetadata(req.body ?? {}, {
      sourceType: 'PLANEJAMENTO_MANUAL',
      changeType: 'PADRAO',
      scopeType: 'ROTA',
    });

    const job = createBackgroundJob(
      'SAVE_PLANNING',
      'Planejamento recebido. A rotina foi colocada em fila para salvar e recalcular os prazos.',
      async (update) => {
        update({
          status: 'RUNNING',
          progress: 15,
          message: 'Preparando o planejamento para persistencia...',
        });

        const stopTicker = startProgressTicker(update, {
          start: 20,
          end: 92,
          step: 4,
          intervalMs: 4000,
          message: 'Salvando planejamento e recalculando prazos no banco...',
        });

        const result = await savePlanningDataset({
          routes,
          rows: Array.isArray(rows) && rows.length ? rows : undefined,
          metadata: {
            ...metadata,
            payload: (req.body?.payload as Record<string, unknown> | undefined) ?? null,
            deadlineSourceType: 'CALCULO_MANUAL',
          },
        });
        stopTicker();

        update({
          progress: 97,
          message: 'Finalizando o lote e consolidando o resultado...',
        });

        return {
          mode: 'save-planning-current',
          ...result,
          standardReplacementPreview:
            metadata.validityType === 'PADRAO'
              ? buildStandardReplacementPreview(metadata.validFrom)
              : null,
        };
      },
    );

    return res.status(202).json({
      status: 'accepted',
      jobId: job.id,
      message: job.message,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Nao foi possivel salvar o planejamento atual no banco.',
    });
  }
});

router.post('/db/import-planning', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo do planejamento nao enviado.' });
  }

  const tempFilePath = path.resolve(req.file.path);
  const originalExtension = path.extname(req.file.originalname).toLowerCase();
  const filePath = originalExtension ? `${tempFilePath}${originalExtension}` : tempFilePath;

  try {
    if (filePath !== tempFilePath) {
      fs.renameSync(tempFilePath, filePath);
    }
    const metadata = parsePlanningMetadata(req.body as Record<string, unknown>, {
      fileName: req.file.originalname,
      sourceName: 'Importacao de planejamento logistico',
      sourceType: 'PLANEJAMENTO_UPLOAD',
      changeType: 'PADRAO',
      scopeType: 'ROTA',
    });
    const job = createBackgroundJob(
      'IMPORT_PLANNING',
      'Arquivo recebido. O servidor vai processar o planejamento e recalcular os prazos em segundo plano.',
      async (update) => {
        try {
          update({
            status: 'RUNNING',
            progress: 12,
            message: 'Lendo e validando a planilha enviada...',
          });
          const routes = await parseSpreadsheet(filePath, req.file!.originalname);

          update({
            progress: 28,
            message: `Planilha lida com sucesso. ${routes.length} rotas identificadas. Preparando o salvamento...`,
          });

          const stopTicker = startProgressTicker(update, {
            start: 34,
            end: 92,
            step: 3,
            intervalMs: 4000,
            message: 'Salvando planejamento e recalculando prazos no banco...',
          });

          const result = await savePlanningDataset({
            routes,
            metadata: {
              ...metadata,
              payload: {
                importedRoutes: routes.length,
              },
              deadlineSourceType: 'PLANILHA_LOGISTICA',
            },
          });
          stopTicker();

          update({
            progress: 97,
            message: 'Finalizando o lote e consolidando o resultado...',
          });

          return {
            mode: 'import-planning',
            importedRoutes: routes.length,
            ...result,
            standardReplacementPreview:
              metadata.validityType === 'PADRAO'
                ? buildStandardReplacementPreview(metadata.validFrom)
                : null,
          };
        } finally {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      },
    );

    return res.status(202).json({
      status: 'accepted',
      jobId: job.id,
      message: job.message,
    });
  } catch (error) {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Nao foi possivel importar o planejamento logistico para o banco.',
    });
  }
});

router.get('/db/query', async (req, res) => {
  try {
    const rows = await queryValidDeadlineRows({
      referenceDate: String(req.query.referenceDate ?? '').trim(),
      commercialLocation: String(req.query.commercialLocation ?? '').trim(),
      geography: String(req.query.geography ?? '').trim() || undefined,
      modal: String(req.query.modal ?? '').trim() || undefined,
    });

    return res.json({
      status: 'ok',
      rows,
      count: rows.length,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Nao foi possivel consultar os prazos no banco.',
    });
  }
});

router.get('/db/planning/query', async (req, res) => {
  try {
    const rows = await queryValidPlanning({
      referenceDate: String(req.query.referenceDate ?? '').trim(),
      commercialLocation: String(req.query.commercialLocation ?? '').trim(),
      geography: String(req.query.geography ?? '').trim() || undefined,
      modal: String(req.query.modal ?? '').trim() || undefined,
    });

    return res.json({
      status: 'ok',
      rows,
      count: rows.length,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Nao foi possivel consultar o planejamento no banco.',
    });
  }
});

router.get('/db/history', async (req, res) => {
  try {
    const history = await queryDeadlineHistory({
      commercialLocation: String(req.query.commercialLocation ?? '').trim(),
      geography: String(req.query.geography ?? '').trim() || undefined,
      modal: String(req.query.modal ?? '').trim() || undefined,
    });

    return res.json({
      status: 'ok',
      history,
      count: history.length,
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Nao foi possivel consultar o historico de prazos.',
    });
  }
});

router.get('/db/planning/history', async (req, res) => {
  try {
    const history = await queryPlanningHistory({
      commercialLocation: String(req.query.commercialLocation ?? '').trim(),
      geography: String(req.query.geography ?? '').trim() || undefined,
      modal: String(req.query.modal ?? '').trim() || undefined,
    });

    return res.json({
      status: 'ok',
      history,
      count: history.length,
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Nao foi possivel consultar o historico do planejamento.',
    });
  }
});

router.get('/db/compare', async (req, res) => {
  try {
    const comparison = await compareCurrentDeadlineWithPrevious({
      referenceDate: String(req.query.referenceDate ?? '').trim(),
      commercialLocation: String(req.query.commercialLocation ?? '').trim(),
      geography: String(req.query.geography ?? '').trim() || undefined,
      modal: String(req.query.modal ?? '').trim() || undefined,
    });

    return res.json({
      status: 'ok',
      ...comparison,
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Nao foi possivel comparar o prazo vigente com o anterior.',
    });
  }
});

export default router;
