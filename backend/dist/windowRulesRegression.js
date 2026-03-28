"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const engine_1 = require("./engine");
const fileParsers_1 = require("./fileParsers");
const DAY_KEYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
function normalizePathToken(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
function resolvePcpCsvPath() {
    const projectRoot = path_1.default.resolve(process.cwd(), '..');
    const assetDirectory = fs_1.default
        .readdirSync(projectRoot, { withFileTypes: true })
        .find((entry) => entry.isDirectory() && normalizePathToken(entry.name) === 'gestao_de_prazos');
    if (!assetDirectory) {
        throw new Error('Diretorio de arquivos base nao encontrado.');
    }
    return path_1.default.join(projectRoot, assetDirectory.name, 'arquivos base', 'pcp.csv');
}
function normalizeDayKey(value) {
    const normalized = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, '');
    if (normalized.startsWith('seg')) {
        return 'segunda';
    }
    if (normalized.startsWith('ter')) {
        return 'terca';
    }
    if (normalized.startsWith('qua')) {
        return 'quarta';
    }
    if (normalized.startsWith('qui')) {
        return 'quinta';
    }
    if (normalized.startsWith('sex')) {
        return 'sexta';
    }
    if (normalized.startsWith('sab') ||
        normalized.startsWith('sa') ||
        normalized.startsWith('sb') ||
        normalized.includes('bado') ||
        (normalized.startsWith('s') && normalized.includes('ado'))) {
        return 'sabado';
    }
    return 'domingo';
}
function splitModalValues(modal) {
    const parts = String(modal)
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean);
    return parts.length > 0 ? Array.from(new Set(parts)) : [String(modal).trim()];
}
function expandRows(rows) {
    return rows.flatMap((row) => DAY_KEYS.filter((day) => row[day] === 'OK').map((day) => ({
        routeKey: [row.commercialLocation, row.geography, row.modal].join('|'),
        day,
        row,
    })));
}
function collectLoadDays(routes) {
    const loadDaysByRoute = new Map();
    for (const route of routes) {
        for (const modal of splitModalValues(route.modal)) {
            const routeKey = [route.commercialLocation, route.geography, modal].join('|');
            const bucket = loadDaysByRoute.get(routeKey) ?? new Set();
            for (const event of route.events) {
                bucket.add(normalizeDayKey(event.day));
            }
            loadDaysByRoute.set(routeKey, bucket);
        }
    }
    return loadDaysByRoute;
}
async function main() {
    const csvPath = resolvePcpCsvPath();
    const routes = await (0, fileParsers_1.parseSpreadsheet)(csvPath, 'pcp.csv');
    const result = (0, engine_1.calculateDeadlines)(routes);
    const expandedRows = expandRows(result.rows);
    const loadDaysByRoute = collectLoadDays(routes);
    const issues = [];
    for (const entry of expandedRows) {
        if (entry.row.horarioFinal < entry.row.horarioInicial) {
            issues.push({
                type: 'final_less_than_initial',
                routeKey: entry.routeKey,
                day: entry.day,
                detail: `${entry.row.horarioInicial}-${entry.row.horarioFinal}`,
            });
        }
        if (entry.row.horarioFinal === entry.row.horarioInicial) {
            issues.push({
                type: 'final_equal_initial',
                routeKey: entry.routeKey,
                day: entry.day,
                detail: `${entry.row.horarioInicial}-${entry.row.horarioFinal}`,
            });
        }
        if (entry.row.horarioFinal < 24 &&
            !(loadDaysByRoute.get(entry.routeKey)?.has(entry.day) ?? false)) {
            issues.push({
                type: 'end_before_24_without_load',
                routeKey: entry.routeKey,
                day: entry.day,
                detail: `${entry.row.horarioInicial}-${entry.row.horarioFinal}`,
            });
        }
    }
    const rowsByRouteDay = new Map();
    for (const entry of expandedRows) {
        const key = `${entry.routeKey}|${entry.day}`;
        const bucket = rowsByRouteDay.get(key) ?? [];
        bucket.push(entry.row);
        rowsByRouteDay.set(key, bucket);
    }
    for (const [key, rows] of rowsByRouteDay.entries()) {
        const intervals = rows
            .map((row) => [row.horarioInicial, row.horarioFinal])
            .sort((left, right) => left[0] - right[0] || left[1] - right[1]);
        let cursor = 0;
        let coverageOk = true;
        for (const [start, end] of intervals) {
            if (start !== cursor) {
                coverageOk = false;
                break;
            }
            cursor = end;
        }
        if (cursor !== 24) {
            coverageOk = false;
        }
        if (!coverageOk) {
            const [routeCommercialLocation, routeGeography, routeModal, day] = key.split('|');
            issues.push({
                type: 'day_without_full_coverage',
                routeKey: [routeCommercialLocation, routeGeography, routeModal].join('|'),
                day: day,
                detail: intervals.map(([start, end]) => `${start}-${end}`).join(', '),
            });
        }
    }
    assert_1.default.strictEqual(issues.length, 0, `Foram encontradas ${issues.length} violacoes estruturais:\n${JSON.stringify(issues.slice(0, 30), null, 2)}`);
    console.log(JSON.stringify({
        csvPath,
        auditedRoutes: routes.length,
        rows: result.rows.length,
        expandedRows: expandedRows.length,
        issues: issues.length,
        status: 'ok',
    }, null, 2));
}
main();
