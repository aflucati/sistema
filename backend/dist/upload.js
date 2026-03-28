"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const XLSX = __importStar(require("xlsx"));
const engine_1 = require("./engine");
const fileParsers_1 = require("./fileParsers");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
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
];
function mapRowToExportRecord(row) {
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
function buildExportSheet(rows) {
    const exportRows = rows.map(mapRowToExportRecord);
    return XLSX.utils.json_to_sheet(exportRows, {
        header: [...EXPORT_HEADERS],
    });
}
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Arquivo não enviado.' });
    }
    const tempFilePath = path_1.default.resolve(req.file.path);
    const originalExtension = path_1.default.extname(req.file.originalname).toLowerCase();
    const filePath = originalExtension ? `${tempFilePath}${originalExtension}` : tempFilePath;
    try {
        if (filePath !== tempFilePath) {
            fs_1.default.renameSync(tempFilePath, filePath);
        }
        const routes = await (0, fileParsers_1.parseSpreadsheet)(filePath, req.file.originalname);
        const result = (0, engine_1.calculateDeadlines)(routes);
        fs_1.default.unlinkSync(filePath);
        return res.json({
            source: 'arquivo',
            sourceType: 'PLANILHA_LOGISTICA',
            fileName: req.file.originalname,
            importedRoutes: routes.length,
            sourceRoutes: routes,
            ...result,
        });
    }
    catch (error) {
        if (fs_1.default.existsSync(tempFilePath)) {
            fs_1.default.unlinkSync(tempFilePath);
        }
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Erro ao processar planilha.',
        });
    }
});
router.post('/export', (req, res) => {
    try {
        const format = req.body?.format;
        const rows = req.body?.rows;
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
            res.setHeader('Content-Disposition', `attachment; filename="${EXPORT_FILE_BASENAME}.csv"`);
            return res.send(csvContent);
        }
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, 'Prazos');
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${EXPORT_FILE_BASENAME}.xlsx"`);
        return res.send(buffer);
    }
    catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Erro ao exportar resultados.',
        });
    }
});
router.post('/calculate', (req, res) => {
    try {
        const routes = (req.body?.routes ?? []);
        if (!Array.isArray(routes) || routes.length === 0) {
            return res.status(400).json({ error: 'Envie ao menos uma rota para cálculo.' });
        }
        return res.json({
            source: 'manual',
            sourceType: 'CALCULO_MANUAL',
            sourceRoutes: routes,
            ...(0, engine_1.calculateDeadlines)(routes),
        });
    }
    catch (error) {
        return res.status(400).json({
            error: error instanceof Error ? error.message : 'Erro ao calcular prazos.',
        });
    }
});
exports.default = router;
