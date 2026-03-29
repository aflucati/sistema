"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fileParsers_1 = require("./fileParsers");
const deadlineStore_1 = require("./deadlineStore");
const planningStore_1 = require("./planningStore");
const validatedDeadlineParsers_1 = require("./validatedDeadlineParsers");
const env_1 = require("./env");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
const backgroundJobs = new Map();
function updateBackgroundJob(id, patch) {
    const current = backgroundJobs.get(id);
    if (!current) {
        return;
    }
    backgroundJobs.set(id, {
        ...current,
        ...patch,
        progress: patch.progress === undefined
            ? current.progress
            : Math.max(0, Math.min(100, Math.round(Number(patch.progress) || 0))),
        updatedAt: new Date().toISOString(),
    });
}
function startProgressTicker(update, options) {
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
function createBackgroundJob(type, queuedMessage, runner) {
    const job = {
        id: crypto_1.default.randomUUID(),
        type,
        status: 'QUEUED',
        message: queuedMessage,
        progress: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    backgroundJobs.set(job.id, job);
    setTimeout(async () => {
        const update = (patch) => updateBackgroundJob(job.id, {
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
        }
        catch (error) {
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
function parsePlanningMetadata(body, defaults) {
    const validityType = String(body.validityType ?? defaults?.validityType ?? '').trim();
    const validFrom = String(body.validFrom ?? defaults?.validFrom ?? '').trim();
    const validTo = String(body.validTo ?? defaults?.validTo ?? '').trim();
    const observation = String(body.observation ?? defaults?.observation ?? '').trim();
    const fileName = String(body.fileName ?? defaults?.fileName ?? '').trim();
    const sourceName = String(body.sourceName ?? defaults?.sourceName ?? '').trim();
    const sourceType = String(body.sourceType ?? defaults?.sourceType ?? '').trim();
    const changeType = String(body.changeType ?? defaults?.changeType ?? validityType).trim();
    const scopeType = String(body.scopeType ?? defaults?.scopeType ?? 'ROTA').trim();
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
router.post('/db/save-planning-current', async (req, res) => {
    try {
        const routes = (req.body?.routes ?? []);
        const rows = (req.body?.rows ?? []);
        if (!Array.isArray(routes) || routes.length === 0) {
            return res.status(400).json({ error: 'Envie ao menos uma rota do planejamento para salvar.' });
        }
        const metadata = parsePlanningMetadata(req.body ?? {}, {
            sourceType: 'PLANEJAMENTO_MANUAL',
            changeType: 'PADRAO',
            scopeType: 'ROTA',
        });
        const job = createBackgroundJob('SAVE_PLANNING', 'Planejamento recebido. A rotina foi colocada em fila para salvar e recalcular os prazos.', async (update) => {
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
            const result = await (0, planningStore_1.savePlanningDataset)({
                routes,
                rows: Array.isArray(rows) && rows.length ? rows : undefined,
                metadata: {
                    ...metadata,
                    payload: req.body?.payload ?? null,
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
                standardReplacementPreview: metadata.validityType === 'PADRAO'
                    ? (0, deadlineStore_1.buildStandardReplacementPreview)(metadata.validFrom)
                    : null,
            };
        });
        return res.status(202).json({
            status: 'accepted',
            jobId: job.id,
            message: job.message,
        });
    }
    catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Nao foi possivel salvar o planejamento atual no banco.',
        });
    }
});
router.post('/db/import-planning', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Arquivo do planejamento nao enviado.' });
    }
    const tempFilePath = path_1.default.resolve(req.file.path);
    const originalExtension = path_1.default.extname(req.file.originalname).toLowerCase();
    const filePath = originalExtension ? `${tempFilePath}${originalExtension}` : tempFilePath;
    try {
        if (filePath !== tempFilePath) {
            fs_1.default.renameSync(tempFilePath, filePath);
        }
        const metadata = parsePlanningMetadata(req.body, {
            fileName: req.file.originalname,
            sourceName: 'Importacao de planejamento logistico',
            sourceType: 'PLANEJAMENTO_UPLOAD',
            changeType: 'PADRAO',
            scopeType: 'ROTA',
        });
        const job = createBackgroundJob('IMPORT_PLANNING', 'Arquivo recebido. O servidor vai processar o planejamento e recalcular os prazos em segundo plano.', async (update) => {
            try {
                update({
                    status: 'RUNNING',
                    progress: 12,
                    message: 'Lendo e validando a planilha enviada...',
                });
                const routes = await (0, fileParsers_1.parseSpreadsheet)(filePath, req.file.originalname);
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
                const result = await (0, planningStore_1.savePlanningDataset)({
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
                    standardReplacementPreview: metadata.validityType === 'PADRAO'
                        ? (0, deadlineStore_1.buildStandardReplacementPreview)(metadata.validFrom)
                        : null,
                };
            }
            finally {
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
            }
        });
        return res.status(202).json({
            status: 'accepted',
            jobId: job.id,
            message: job.message,
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
                : 'Nao foi possivel importar o planejamento logistico para o banco.',
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
router.get('/db/planning/query', async (req, res) => {
    try {
        const rows = await (0, planningStore_1.queryValidPlanning)({
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
            error: error instanceof Error ? error.message : 'Nao foi possivel consultar o planejamento no banco.',
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
router.get('/db/planning/history', async (req, res) => {
    try {
        const history = await (0, planningStore_1.queryPlanningHistory)({
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
            error: error instanceof Error ? error.message : 'Nao foi possivel consultar o historico do planejamento.',
        });
    }
});
router.get('/db/compare', async (req, res) => {
    try {
        const comparison = await (0, planningStore_1.compareCurrentDeadlineWithPrevious)({
            referenceDate: String(req.query.referenceDate ?? '').trim(),
            commercialLocation: String(req.query.commercialLocation ?? '').trim(),
            geography: String(req.query.geography ?? '').trim() || undefined,
            modal: String(req.query.modal ?? '').trim() || undefined,
        });
        return res.json({
            status: 'ok',
            ...comparison,
        });
    }
    catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Nao foi possivel comparar o prazo vigente com o anterior.',
        });
    }
});
exports.default = router;
