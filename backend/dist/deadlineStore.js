"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDeadlineDataset = saveDeadlineDataset;
exports.queryValidDeadlineRows = queryValidDeadlineRows;
exports.queryDeadlineHistory = queryDeadlineHistory;
exports.buildStandardReplacementPreview = buildStandardReplacementPreview;
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
    const date = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Data invalida: ${dateText}`);
    }
    date.setDate(date.getDate() + increment);
    return date.toISOString().slice(0, 10);
}
function validateMetadata(metadata) {
    if (metadata.validityType !== 'PADRAO' && metadata.validityType !== 'PONTUAL') {
        throw new Error('Tipo de vigencia invalido. Use PADRAO ou PONTUAL.');
    }
    if (!metadata.validFrom) {
        throw new Error('Informe a data inicial da vigencia.');
    }
    const validFromDate = new Date(`${metadata.validFrom}T00:00:00`);
    if (Number.isNaN(validFromDate.getTime())) {
        throw new Error('Data inicial da vigencia invalida.');
    }
    if (metadata.validityType === 'PONTUAL') {
        if (!metadata.validTo) {
            throw new Error('Para vigencia pontual, informe a data final.');
        }
        const validToDate = new Date(`${metadata.validTo}T00:00:00`);
        if (Number.isNaN(validToDate.getTime())) {
            throw new Error('Data final da vigencia invalida.');
        }
        if (validToDate.getTime() < validFromDate.getTime()) {
            throw new Error('A data final nao pode ser anterior a data inicial.');
        }
    }
    return {
        ...metadata,
        validTo: metadata.validityType === 'PADRAO' ? null : metadata.validTo ?? null,
        observation: metadata.observation?.trim() || null,
        fileName: metadata.fileName?.trim() || null,
        sourceName: metadata.sourceName?.trim() || null,
        payload: metadata.payload ?? null,
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
function buildRouteVersionsFromRows(rows) {
    const grouped = new Map();
    rows.forEach((row) => {
        normalizeModalValues(row.modal).forEach((modal) => {
            const routeIdentityKey = buildRouteIdentityKey(modal, row.geography, row.commercialLocation);
            const current = grouped.get(routeIdentityKey) ??
                {
                    route_identity_key: routeIdentityKey,
                    cd: String(row.cd ?? '').trim(),
                    modal,
                    geography: String(row.geography ?? '').trim(),
                    commercial_location: String(row.commercialLocation ?? '').trim(),
                    locality: String(row.locality ?? '').trim(),
                    rows: [],
                    logic_events: [],
                };
            current.rows.push({
                ...mapWindowRow(row),
                modal,
            });
            grouped.set(routeIdentityKey, current);
        });
    });
    return Array.from(grouped.values());
}
function attachLogicEvents(routeVersions, routes) {
    if (!routes?.length) {
        return routeVersions;
    }
    const routeVersionMap = new Map(routeVersions.map((routeVersion) => [routeVersion.route_identity_key, routeVersion]));
    routes.forEach((route) => {
        normalizeModalValues(route.modal).forEach((modal) => {
            const routeIdentityKey = buildRouteIdentityKey(modal, route.geography, route.commercialLocation);
            const routeVersion = routeVersionMap.get(routeIdentityKey);
            if (!routeVersion) {
                return;
            }
            routeVersion.logic_events = route.events.map((event, index) => ({
                event_order: index + 1,
                route_destination: String(route.routeDestination ?? '').trim(),
                event_day: String(event.day ?? '').trim(),
                cutoff_hour: Number(event.cutoffHour ?? 0),
                delivery_day: String(event.deliveryDay ?? '').trim(),
                frequency: String(event.frequency ?? 'SEMANAL').trim(),
                raw_event: {
                    day: event.day,
                    cutoffHour: event.cutoffHour,
                    deliveryDay: event.deliveryDay,
                    frequency: event.frequency,
                    routeDestination: route.routeDestination,
                },
            }));
        });
    });
    return routeVersions;
}
function buildDatasetPayload(rows, routes, metadata) {
    const validatedMetadata = validateMetadata(metadata);
    const routeVersions = attachLogicEvents(buildRouteVersionsFromRows(rows), routes);
    if (!routeVersions.length) {
        throw new Error('Nenhuma rota calculada foi enviada para persistencia.');
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
        route_versions: routeVersions,
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
        const result = await client.query(sql, values);
        return (result.rows[0]?.payload ?? result.rows);
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw error;
    }
    finally {
        await client.end().catch(() => { });
    }
}
async function saveDeadlineDataset(input) {
    const datasetPayload = buildDatasetPayload(input.rows, input.routes, input.metadata);
    return callDatabaseFunction('select public.prazos_apply_dataset($1::jsonb) as payload', [JSON.stringify(datasetPayload)]);
}
async function queryValidDeadlineRows(filters) {
    if (!filters.referenceDate) {
        throw new Error('Informe a data de referencia para consulta.');
    }
    if (!filters.commercialLocation?.trim()) {
        throw new Error('Informe a localizacao comercial para consulta.');
    }
    return callDatabaseFunction('select * from public.prazos_get_valid_rows($1::date, $2::text, $3::text, $4::text)', [
        filters.referenceDate,
        filters.commercialLocation.trim(),
        filters.geography?.trim() || null,
        filters.modal?.trim() || null,
    ]);
}
async function queryDeadlineHistory(filters) {
    if (!filters.commercialLocation?.trim()) {
        throw new Error('Informe a localizacao comercial para consultar o historico.');
    }
    return callDatabaseFunction('select * from public.prazos_get_version_history($1::text, $2::text, $3::text)', [
        filters.commercialLocation.trim(),
        filters.geography?.trim() || null,
        filters.modal?.trim() || null,
    ]);
}
function buildStandardReplacementPreview(validFrom) {
    return {
        closesPreviousStandardOn: addDays(validFrom, -1),
    };
}
