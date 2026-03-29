"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePlanningDataset = savePlanningDataset;
exports.queryValidPlanning = queryValidPlanning;
exports.queryPlanningHistory = queryPlanningHistory;
exports.compareCurrentDeadlineWithPrevious = compareCurrentDeadlineWithPrevious;
const engine_1 = require("./engine");
const deadlineStore_1 = require("./deadlineStore");
const env_1 = require("./env");
const pg_1 = require("pg");
function normalizeModalValues(modal) {
    const values = String(modal ?? '')
        .split('/')
        .map((value) => value.trim())
        .filter(Boolean);
    return values.length ? Array.from(new Set(values)) : [String(modal ?? '').trim()];
}
function buildRouteIdentityKey(modal, geography, commercialLocation) {
    return [String(modal).trim(), String(geography).trim(), String(commercialLocation).trim()].join('|||');
}
function addDays(dateText, increment) {
    const date = new Date(`${dateText}T12:00:00`);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Data invalida: ${dateText}`);
    }
    date.setDate(date.getDate() + increment);
    return date.toISOString().slice(0, 10);
}
function toIsoDateText(value) {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    const text = String(value ?? '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
        return text.slice(0, 10);
    }
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Data invalida: ${text}`);
    }
    return parsed.toISOString().slice(0, 10);
}
function validateMetadata(metadata) {
    if (metadata.validityType !== 'PADRAO' && metadata.validityType !== 'PONTUAL') {
        throw new Error('Tipo de vigencia invalido. Use PADRAO ou PONTUAL.');
    }
    if (!metadata.validFrom) {
        throw new Error('Informe a data inicial da vigencia do planejamento.');
    }
    if (metadata.validityType === 'PONTUAL' && !metadata.validTo) {
        throw new Error('Para vigencia pontual, informe a data final do planejamento.');
    }
    if (metadata.validityType === 'PONTUAL' &&
        metadata.validTo &&
        new Date(`${metadata.validTo}T12:00:00`).getTime() < new Date(`${metadata.validFrom}T12:00:00`).getTime()) {
        throw new Error('A data final do planejamento nao pode ser anterior a data inicial.');
    }
    return {
        ...metadata,
        validTo: metadata.validityType === 'PADRAO' ? null : metadata.validTo ?? null,
        observation: metadata.observation?.trim() || null,
        fileName: metadata.fileName?.trim() || null,
        sourceName: metadata.sourceName?.trim() || null,
        payload: metadata.payload ?? null,
        deadlineSourceType: metadata.deadlineSourceType ?? 'PLANILHA_LOGISTICA',
    };
}
function mapWindowRow(row) {
    return {
        cd: String(row.cd ?? '').trim(),
        modal: String(row.modal ?? '').trim(),
        geography: String(row.geography ?? '').trim(),
        commercial_location: String(row.commercialLocation ?? '').trim(),
        locality: String(row.locality ?? '').trim(),
        metodo_cd: String(row.metodoCd ?? 'SUBSTITUIR').trim(),
        prazo_cd: Number(row.prazoCd ?? 0),
        metodo_tr: String(row.metodoTr ?? 'SUBSTITUIR').trim(),
        prazo_tr: Number(row.prazoTr ?? 0),
        prazo_cliente: Number(row.prazoCliente ?? 0),
        horario_inicial: Number(row.horarioInicial ?? 0),
        horario_final: Number(row.horarioFinal ?? 0),
        rota_fixa: row.rotaFixa === 'SIM' ? 'SIM' : 'NAO',
        segunda: row.segunda === 'OK',
        terca: row.terca === 'OK',
        quarta: row.quarta === 'OK',
        quinta: row.quinta === 'OK',
        sexta: row.sexta === 'OK',
        sabado: row.sabado === 'OK',
        domingo: row.domingo === 'OK',
        raw_row: row,
    };
}
function buildRowsByRoute(rows) {
    const grouped = new Map();
    rows.forEach((row) => {
        const routeIdentityKey = buildRouteIdentityKey(row.modal, row.geography, row.commercialLocation);
        const current = grouped.get(routeIdentityKey) ??
            {
                route_identity_key: routeIdentityKey,
                cd: String(row.cd ?? '').trim(),
                modal: String(row.modal ?? '').trim(),
                geography: String(row.geography ?? '').trim(),
                commercial_location: String(row.commercialLocation ?? '').trim(),
                locality: String(row.locality ?? '').trim(),
                route_destination: '',
                transport_plan: '',
                alignment_code: '',
                alignment_name: '',
                rows: [],
                logic_events: [],
            };
        current.rows.push(mapWindowRow(row));
        grouped.set(routeIdentityKey, current);
    });
    return grouped;
}
function buildPlanningPayload(routes, rows, metadata) {
    const validatedMetadata = validateMetadata(metadata);
    const rowsByRoute = buildRowsByRoute(rows);
    const routeVersions = new Map();
    routes.forEach((route) => {
        normalizeModalValues(route.modal).forEach((modal) => {
            const routeIdentityKey = buildRouteIdentityKey(modal, route.geography, route.commercialLocation);
            const rowGroup = rowsByRoute.get(routeIdentityKey);
            if (!rowGroup) {
                return;
            }
            routeVersions.set(routeIdentityKey, {
                ...rowGroup,
                modal,
                route_destination: String(route.routeDestination ?? '').trim(),
                transport_plan: String(route.transportPlan ?? '').trim(),
                alignment_code: String(route.alignmentCode ?? '').trim(),
                alignment_name: String(route.alignmentName ?? '').trim(),
                logic_events: route.events.map((event, index) => ({
                    event_order: index + 1,
                    event_day: String(event.day ?? '').trim(),
                    cutoff_hour: Number(event.cutoffHour ?? 0),
                    delivery_day: String(event.deliveryDay ?? '').trim(),
                    delivery_offered_day: null,
                    frequency: String(event.frequency ?? 'SEMANAL').trim(),
                    raw_event: {
                        day: event.day,
                        cutoffHour: event.cutoffHour,
                        deliveryDay: event.deliveryDay,
                        frequency: event.frequency,
                        routeDestination: route.routeDestination,
                        transportPlan: route.transportPlan,
                        alignmentCode: route.alignmentCode,
                        alignmentName: route.alignmentName,
                    },
                })),
            });
        });
    });
    if (!routeVersions.size) {
        throw new Error('Nenhuma rota de planejamento foi gerada para persistencia.');
    }
    return {
        source_type: validatedMetadata.sourceType,
        source_name: validatedMetadata.sourceName ?? null,
        file_name: validatedMetadata.fileName ?? null,
        validity_type: validatedMetadata.validityType,
        valid_from: validatedMetadata.validFrom,
        valid_to: validatedMetadata.validTo ?? null,
        observation: validatedMetadata.observation ?? null,
        payload: validatedMetadata.payload ?? null,
        change_type: validatedMetadata.changeType,
        scope_type: validatedMetadata.scopeType,
        deadline_source_type: validatedMetadata.deadlineSourceType,
        route_versions: Array.from(routeVersions.values()),
    };
}
function createDatabaseClient() {
    const config = (0, env_1.getSupabaseConfig)();
    if (!config.dbHost || !config.dbPort || !config.dbName || !config.dbUser || !config.dbPassword) {
        throw new Error('Credenciais do Postgres nao configuradas. Preencha SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_NAME, SUPABASE_DB_USER e SUPABASE_DB_PASSWORD no backend.');
    }
    return new pg_1.Client({
        host: config.dbHost,
        port: Number(config.dbPort),
        database: config.dbName,
        user: config.dbUser,
        password: config.dbPassword,
        ssl: {
            rejectUnauthorized: false,
        },
    });
}
async function callDatabaseFunction(sql, values) {
    const client = createDatabaseClient();
    try {
        await client.connect();
        await client.query("set statement_timeout = '0'");
        await client.query("set lock_timeout = '0'");
        const result = await client.query(sql, values);
        return (result.rows[0]?.payload ?? result.rows);
    }
    finally {
        await client.end().catch(() => { });
    }
}
async function savePlanningDataset(input) {
    const calculatedRows = input.rows && input.rows.length ? input.rows : (0, engine_1.calculateDeadlines)(input.routes).rows;
    const payload = buildPlanningPayload(input.routes, calculatedRows, input.metadata);
    return callDatabaseFunction('select public.prazos_apply_planning_dataset($1::jsonb) as payload', [JSON.stringify(payload)]);
}
async function queryValidPlanning(filters) {
    if (!filters.referenceDate) {
        throw new Error('Informe a data de referencia do planejamento.');
    }
    if (!filters.commercialLocation?.trim()) {
        throw new Error('Informe a localizacao comercial para consultar o planejamento.');
    }
    return callDatabaseFunction('select * from public.prazos_get_valid_planning($1::date, $2::text, $3::text, $4::text)', [
        filters.referenceDate,
        filters.commercialLocation.trim(),
        filters.geography?.trim() || null,
        filters.modal?.trim() || null,
    ]);
}
async function queryPlanningHistory(filters) {
    if (!filters.commercialLocation?.trim()) {
        throw new Error('Informe a localizacao comercial para consultar o historico do planejamento.');
    }
    return callDatabaseFunction('select * from public.prazos_get_planning_history($1::text, $2::text, $3::text)', [
        filters.commercialLocation.trim(),
        filters.geography?.trim() || null,
        filters.modal?.trim() || null,
    ]);
}
function buildComparisonKey(row) {
    return [
        row.modal,
        row.geography,
        row.commercial_location,
        row.horario_inicial,
        row.horario_final,
        row.segunda,
        row.terca,
        row.quarta,
        row.quinta,
        row.sexta,
        row.sabado,
        row.domingo,
    ].join('|');
}
async function compareCurrentDeadlineWithPrevious(filters) {
    const currentRows = await (0, deadlineStore_1.queryValidDeadlineRows)(filters);
    const history = await (0, deadlineStore_1.queryDeadlineHistory)({
        commercialLocation: filters.commercialLocation,
        geography: filters.geography,
        modal: filters.modal,
    });
    if (!currentRows.length) {
        return {
            currentRows: [],
            previousRows: [],
            currentVersionId: null,
            previousVersionId: null,
            changedRows: [],
            summary: {
                currentRows: 0,
                previousRows: 0,
                changedRows: 0,
            },
        };
    }
    const currentVersionId = String(currentRows[0].route_version_id ?? '');
    const currentHistoryIndex = history.findIndex((row) => String(row.route_version_id ?? '') === currentVersionId);
    const previousHistoryRow = history
        .slice(currentHistoryIndex >= 0 ? currentHistoryIndex + 1 : 0)
        .find((row) => String(row.route_version_id ?? '') !== currentVersionId) ?? null;
    const previousVersionId = previousHistoryRow ? String(previousHistoryRow.route_version_id ?? '') : null;
    const previousRows = previousVersionId ? await (0, deadlineStore_1.queryDeadlineRowsByVersion)(previousVersionId) : [];
    const previousMap = new Map(previousRows.map((row) => [buildComparisonKey(row), row]));
    const changedRows = currentRows
        .map((row) => {
        const previous = previousMap.get(buildComparisonKey(row));
        const changed = !previous ||
            Number(previous.prazo_cd ?? 0) !== Number(row.prazo_cd ?? 0) ||
            Number(previous.prazo_tr ?? 0) !== Number(row.prazo_tr ?? 0) ||
            Number(previous.prazo_cliente ?? 0) !== Number(row.prazo_cliente ?? 0);
        return {
            current: row,
            previous: previous ?? null,
            changed,
        };
    })
        .filter((row) => row.changed);
    return {
        currentRows,
        previousRows,
        currentVersionId,
        previousVersionId,
        changedRows,
        summary: {
            currentRows: currentRows.length,
            previousRows: previousRows.length,
            changedRows: changedRows.length,
            closesPreviousStandardOn: currentRows.length && currentRows[0].valid_from ? addDays(toIsoDateText(currentRows[0].valid_from), -1) : null,
        },
    };
}
