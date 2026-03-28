import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { RouteInput, WindowRow } from './engine';
import {
  buildStandardReplacementPreview,
  queryDeadlineHistory,
  queryValidDeadlineRows,
  saveDeadlineDataset,
  SaveDatasetMetadata,
  ValidityType,
} from './deadlineStore';
import { parseValidatedDeadlineSpreadsheet } from './validatedDeadlineParsers';
import { getSupabaseConfig } from './env';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

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

export default router;
