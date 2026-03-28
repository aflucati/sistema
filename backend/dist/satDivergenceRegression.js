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
const DAY_MAP = [
    { key: 'segunda', label: 'SEG', columnIndex: 12 },
    { key: 'terca', label: 'TER', columnIndex: 13 },
    { key: 'quarta', label: 'QUA', columnIndex: 14 },
    { key: 'quinta', label: 'QUI', columnIndex: 15 },
    { key: 'sexta', label: 'SEX', columnIndex: 16 },
    { key: 'sabado', label: 'SAB', columnIndex: 17 },
    { key: 'domingo', label: 'DOM', columnIndex: 18 },
];
function normalizeToken(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}
function resolveAssetsDirectory() {
    const projectRoot = path_1.default.resolve(process.cwd(), '..');
    const candidate = fs_1.default
        .readdirSync(projectRoot, { withFileTypes: true })
        .find((entry) => entry.isDirectory() && normalizeToken(entry.name) === 'GESTAO_DE_PRAZOS');
    if (!candidate) {
        throw new Error('Diretorio de arquivos base nao encontrado.');
    }
    return path_1.default.join(projectRoot, candidate.name, 'arquivos base');
}
function resolveSatDivergenceCsvPath() {
    const downloadsDirectory = 'C:/Users/ar_lucati/Downloads';
    const candidate = fs_1.default
        .readdirSync(downloadsDirectory, { withFileTypes: true })
        .find((entry) => {
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.csv')) {
            return false;
        }
        const normalized = normalizeToken(entry.name);
        return (normalized.includes('ROTAS COM DIVERGENCIA') &&
            normalized.includes('PRAZOS VALIDADOS'));
    });
    if (!candidate) {
        throw new Error('CSV de divergencia das rotas SAT nao encontrado em Downloads.');
    }
    return path_1.default.join(downloadsDirectory, candidate.name);
}
function parseExportedValidationRows(csvPath) {
    const content = fs_1.default
        .readFileSync(csvPath, 'utf8')
        .replace(/^\uFEFF/, '');
    const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    return lines.slice(1).map((line) => {
        const columns = line.split(';');
        return {
            modal: columns[0]?.trim() ?? '',
            geography: columns[1]?.trim() ?? '',
            commercialLocation: columns[2]?.trim() ?? '',
            prazoCd: parseInt(columns[5] ?? '0', 10) || 0,
            prazoTr: parseInt(columns[7] ?? '0', 10) || 0,
            prazoCliente: parseInt(columns[8] ?? '0', 10) || 0,
            startHour: parseInt(columns[9] ?? '0', 10) || 0,
            endHour: parseInt(columns[10] ?? '0', 10) || 0,
            dayFlags: Object.fromEntries(DAY_MAP.map((day) => [day.label, columns[day.columnIndex]?.trim() ?? ''])),
        };
    });
}
function expandEngineRows(rows) {
    const expanded = [];
    for (const row of rows) {
        for (const day of DAY_MAP) {
            if (row[day.key] !== 'OK') {
                continue;
            }
            expanded.push({
                modal: row.modal,
                geography: row.geography,
                commercialLocation: row.commercialLocation,
                saleDay: day.label,
                startHour: row.horarioInicial,
                endHour: row.horarioFinal,
                prazoCd: row.prazoCd,
                prazoTr: row.prazoTr,
                prazoCliente: row.prazoCliente,
            });
        }
    }
    return expanded;
}
function compareExportedRows(expectedRows, actualRows) {
    const mismatches = [];
    for (const expectedRow of expectedRows) {
        for (const [saleDay, flag] of Object.entries(expectedRow.dayFlags)) {
            if (normalizeToken(flag) !== 'OK') {
                continue;
            }
            const candidates = actualRows.filter((actualRow) => normalizeToken(actualRow.commercialLocation) ===
                normalizeToken(expectedRow.commercialLocation) &&
                normalizeToken(actualRow.geography) === normalizeToken(expectedRow.geography) &&
                normalizeToken(actualRow.modal) === normalizeToken(expectedRow.modal) &&
                actualRow.saleDay === saleDay &&
                actualRow.startHour <= expectedRow.startHour &&
                expectedRow.startHour < actualRow.endHour);
            if (candidates.length === 0) {
                mismatches.push({
                    type: 'missing_in_engine',
                    routeKey: `${expectedRow.modal}|${expectedRow.geography}|${expectedRow.commercialLocation}`,
                    saleDay,
                    expected: expectedRow,
                });
                continue;
            }
            const matched = candidates.find((candidate) => candidate.prazoCd === expectedRow.prazoCd &&
                candidate.prazoTr === expectedRow.prazoTr &&
                candidate.prazoCliente === expectedRow.prazoCliente);
            if (matched) {
                continue;
            }
            const closest = [...candidates].sort((left, right) => left.startHour - right.startHour || left.endHour - right.endHour)[0];
            mismatches.push({
                type: 'value_mismatch',
                routeKey: `${expectedRow.modal}|${expectedRow.geography}|${expectedRow.commercialLocation}`,
                saleDay,
                expected: expectedRow,
                actual: closest,
            });
        }
    }
    return mismatches;
}
async function main() {
    const pcpCsvPath = path_1.default.join(resolveAssetsDirectory(), 'pcp.csv');
    const satDivergenceCsvPath = resolveSatDivergenceCsvPath();
    const routes = await (0, fileParsers_1.parseSpreadsheet)(pcpCsvPath, 'pcp.csv');
    const result = (0, engine_1.calculateDeadlines)(routes);
    const expectedRows = parseExportedValidationRows(satDivergenceCsvPath);
    const actualRows = expandEngineRows(result.rows);
    const mismatches = compareExportedRows(expectedRows, actualRows);
    const combinedModalRows = result.rows.filter((row) => normalizeToken(row.modal).includes('/'));
    assert_1.default.strictEqual(combinedModalRows.length, 0, `Ainda existem ${combinedModalRows.length} linhas com modal combinado na saida.`);
    assert_1.default.strictEqual(mismatches.length, 0, `Foram encontradas ${mismatches.length} divergencias no CSV SAT:\n${JSON.stringify(mismatches.slice(0, 20), null, 2)}`);
    console.log(JSON.stringify({
        pcpCsvPath,
        satDivergenceCsvPath,
        expectedRows: expectedRows.length,
        engineRows: result.rows.length,
        expandedRows: actualRows.length,
        mismatches: mismatches.length,
        status: 'ok',
    }, null, 2));
}
main();
