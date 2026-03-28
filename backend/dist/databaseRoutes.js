"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const deadlineStore_1 = require("./deadlineStore");
const validatedDeadlineParsers_1 = require("./validatedDeadlineParsers");
const env_1 = require("./env");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
function parseMetadata(body, defaults) {
    const validityType = String(body.validityType ?? defaults?.validityType ?? '').trim();
    const validFrom = String(body.validFrom ?? defaults?.validFrom ?? '').trim();
    const validTo = String(body.validTo ?? defaults?.validTo ?? '').trim();
    const observation = String(body.observation ?? defaults?.observation ?? '').trim();
    const fileName = String(body.fileName ?? defaults?.fileName ?? '').trim();
    const sourceName = String(body.sourceName ?? defaults?.sourceName ?? '').trim();
    const sourceType = String(body.sourceType ?? defaults?.sourceType ?? '').trim();
    return {
        validityType,
        validFrom,
        validTo: validTo || null,
        observation: observation || null,
        fileName: fileName || null,
        sourceName: sourceName || null,
        sourceType,
        payload: body.payload ?? defaults?.payload ?? null,
    };
}
router.get('/db/status', (req, res) => {
    const config = (0, env_1.getSupabaseConfig)();
    const hasDbConnection = Boolean(config.dbHost) &&
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
        const rows = (req.body?.rows ?? []);
        const routes = (req.body?.routes ?? []);
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'Envie o resultado calculado para salvar no banco.' });
        }
        const metadata = parseMetadata(req.body ?? {}, {
            sourceType: 'CALCULO_MANUAL',
        });
        const result = await (0, deadlineStore_1.saveDeadlineDataset)({
            rows,
            routes: Array.isArray(routes) && routes.length ? routes : undefined,
            metadata,
        });
        return res.json({
            status: 'ok',
            mode: 'save-current',
            ...result,
            standardReplacementPreview: metadata.validityType === 'PADRAO'
                ? (0, deadlineStore_1.buildStandardReplacementPreview)(metadata.validFrom)
                : null,
        });
    }
    catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Nao foi possivel salvar o calculo atual no banco.',
        });
    }
});
router.post('/db/import-validated', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Arquivo validado nao enviado.' });
    }
    const tempFilePath = path_1.default.resolve(req.file.path);
    const originalExtension = path_1.default.extname(req.file.originalname).toLowerCase();
    const filePath = originalExtension ? `${tempFilePath}${originalExtension}` : tempFilePath;
    try {
        if (filePath !== tempFilePath) {
            fs_1.default.renameSync(tempFilePath, filePath);
        }
        const rows = await (0, validatedDeadlineParsers_1.parseValidatedDeadlineSpreadsheet)(filePath, req.file.originalname);
        const metadata = parseMetadata(req.body, {
            fileName: req.file.originalname,
            sourceName: 'Importacao de prazos validados',
            sourceType: 'PLANILHA_VALIDADA',
        });
        const result = await (0, deadlineStore_1.saveDeadlineDataset)({
            rows,
            metadata,
        });
        fs_1.default.unlinkSync(filePath);
        return res.json({
            status: 'ok',
            mode: 'import-validated',
            importedRows: rows.length,
            ...result,
            standardReplacementPreview: metadata.validityType === 'PADRAO'
                ? (0, deadlineStore_1.buildStandardReplacementPreview)(metadata.validFrom)
                : null,
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
            error: error instanceof Error
                ? error.message
                : 'Nao foi possivel importar os prazos validados para o banco.',
        });
    }
});
router.get('/db/query', async (req, res) => {
    try {
        const rows = await (0, deadlineStore_1.queryValidDeadlineRows)({
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
    }
    catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Nao foi possivel consultar os prazos no banco.',
        });
    }
});
router.get('/db/history', async (req, res) => {
    try {
        const history = await (0, deadlineStore_1.queryDeadlineHistory)({
            commercialLocation: String(req.query.commercialLocation ?? '').trim(),
            geography: String(req.query.geography ?? '').trim() || undefined,
            modal: String(req.query.modal ?? '').trim() || undefined,
        });
        return res.json({
            status: 'ok',
            history,
            count: history.length,
        });
    }
    catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Nao foi possivel consultar o historico de prazos.',
        });
    }
});
exports.default = router;
