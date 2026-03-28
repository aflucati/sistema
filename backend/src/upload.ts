import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { calculateDeadlines, RouteInput, WindowRow } from './engine';
import { parseSpreadsheet } from './fileParsers';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const EXPORT_FILE_BASENAME = 'gestor_prazos_magalog';
const EXPORT_HEADERS = [
  'CD',
  'Modal',
  'Geografia',
  'Localizacao Comercial',
  'Localidade',
  'Metodo de Oferta Prazo CD',
  'Prazo CD',
  'Metodo de Oferta Prazo TR',
  'Prazo TR',
  'Prazo Cliente',
  'Horario Inicial',
  'Horario Final',
  'Rota Fixa',
  'Segunda',
  'Terca',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sabado',
  'Domingo',
] as const;

type ExportFormat = 'csv' | 'xlsx';

function mapRowToExportRecord(row: WindowRow): Record<(typeof EXPORT_HEADERS)[number], string | number> {
  return {
    CD: row.cd,
    Modal: row.modal,
    Geografia: row.geography,
    'Localizacao Comercial': row.commercialLocation,
    Localidade: row.locality,
    'Metodo de Oferta Prazo CD': row.metodoCd,
    'Prazo CD': row.prazoCd,
    'Metodo de Oferta Prazo TR': row.metodoTr,
    'Prazo TR': row.prazoTr,
    'Prazo Cliente': row.prazoCliente,
    'Horario Inicial': row.horarioInicial,
    'Horario Final': row.horarioFinal,
    'Rota Fixa': row.rotaFixa,
    Segunda: row.segunda,
    Terca: row.terca,
    Quarta: row.quarta,
    Quinta: row.quinta,
    Sexta: row.sexta,
    Sabado: row.sabado,
    Domingo: row.domingo,
  };
}

function buildExportSheet(rows: WindowRow[]): XLSX.WorkSheet {
  const exportRows = rows.map(mapRowToExportRecord);
  return XLSX.utils.json_to_sheet(exportRows, {
    header: [...EXPORT_HEADERS],
  });
}

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo não enviado.' });
  }

  const tempFilePath = path.resolve(req.file.path);
  const originalExtension = path.extname(req.file.originalname).toLowerCase();
  const filePath = originalExtension ? `${tempFilePath}${originalExtension}` : tempFilePath;

  try {
    if (filePath !== tempFilePath) {
      fs.renameSync(tempFilePath, filePath);
    }

    const routes = await parseSpreadsheet(filePath, req.file.originalname);
    const result = calculateDeadlines(routes);
    fs.unlinkSync(filePath);

    return res.json({
      source: 'arquivo',
      sourceType: 'PLANILHA_LOGISTICA',
      fileName: req.file.originalname,
      importedRoutes: routes.length,
      sourceRoutes: routes,
      ...result,
    });
  } catch (error) {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao processar planilha.',
    });
  }
});

router.post('/export', (req, res) => {
  try {
    const format = req.body?.format as ExportFormat;
    const rows = req.body?.rows as WindowRow[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Envie ao menos uma linha para exportacao.' });
    }

    if (format !== 'csv' && format !== 'xlsx') {
      return res.status(400).json({ error: 'Formato de exportacao invalido.' });
    }

    const sheet = buildExportSheet(rows);

    if (format === 'csv') {
      const csvContent = `\uFEFF${XLSX.utils.sheet_to_csv(sheet, {
        FS: ';',
        RS: '\n',
      })}`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${EXPORT_FILE_BASENAME}.csv"`,
      );
      return res.send(csvContent);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Prazos');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${EXPORT_FILE_BASENAME}.xlsx"`,
    );
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao exportar resultados.',
    });
  }
});

router.post('/calculate', (req, res) => {
  try {
    const routes = (req.body?.routes ?? []) as RouteInput[];
    if (!Array.isArray(routes) || routes.length === 0) {
      return res.status(400).json({ error: 'Envie ao menos uma rota para cálculo.' });
    }

    return res.json({
      source: 'manual',
      sourceType: 'CALCULO_MANUAL',
      sourceRoutes: routes,
      ...calculateDeadlines(routes),
    });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Erro ao calcular prazos.',
    });
  }
});

export default router;
