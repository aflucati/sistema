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
exports.parseSpreadsheet = parseSpreadsheet;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const csv_parse_1 = require("csv-parse");
const XLSX = __importStar(require("xlsx"));
function normalizeToken(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}
function normalizeRecord(record) {
    return Object.fromEntries(Object.entries(record).map(([key, value]) => [String(key).trim(), value]));
}
function getField(record, predicates, fallbackIndex) {
    const entries = Object.entries(record);
    const match = entries.find(([key]) => {
        const normalized = normalizeToken(key);
        return predicates.some((predicate) => normalized.includes(predicate));
    });
    if (match) {
        return String(match[1] ?? '').trim();
    }
    return String(entries[fallbackIndex]?.[1] ?? '').trim();
}
function toCanonicalRecord(rawRecord) {
    const record = normalizeRecord(rawRecord);
    return {
        modal: getField(record, ['agrupamentomodal'], 0),
        geography: getField(record, ['geografiatipoloja'], 1),
        commercialLocation: getField(record, ['localizacaoloja', 'localizaoloja'], 2),
        day: getField(record, ['diadaproducao', 'diadaproduo'], 3),
        cutoffHour: getField(record, ['horariofinaldecorteparaproducao', 'horriofinaldecorteparaproduo'], 4),
        deliveryDay: getField(record, ['diaentregareal'], 5),
        frequency: getField(record, ['frequenciadeentrega', 'freqnciadeentrega'], 6) || 'SEMANAL',
        routeDestination: getField(record, ['rotadestino'], 7),
    };
}
function groupRecords(records) {
    const grouped = new Map();
    for (const rawRecord of records) {
        const record = toCanonicalRecord(rawRecord);
        if (!record.modal || !record.geography || !record.commercialLocation) {
            continue;
        }
        const key = `${record.modal}|||${record.geography}|||${record.commercialLocation}`;
        const current = grouped.get(key) ?? {
            modal: record.modal,
            geography: record.geography,
            commercialLocation: record.commercialLocation,
            routeDestination: record.routeDestination,
            events: [],
        };
        current.events.push({
            day: record.day,
            cutoffHour: record.cutoffHour,
            deliveryDay: record.deliveryDay,
            frequency: record.frequency || 'SEMANAL',
        });
        grouped.set(key, current);
    }
    return Array.from(grouped.values());
}
function parseCsv(filePath) {
    return new Promise((resolve, reject) => {
        const rows = [];
        fs_1.default.createReadStream(filePath)
            .pipe((0, csv_parse_1.parse)({
            delimiter: ';',
            columns: true,
            bom: true,
            trim: true,
            skip_empty_lines: true,
        }))
            .on('data', (row) => rows.push(row))
            .on('end', () => resolve(groupRecords(rows)))
            .on('error', reject);
    });
}
function parseXlsx(filePath) {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
        raw: false,
    });
    return groupRecords(rows);
}
function detectSpreadsheetType(filePath, sourceName) {
    const extension = path_1.default.extname(sourceName ?? filePath).toLowerCase();
    if (extension === '.csv' || extension === '.xlsx' || extension === '.xls') {
        return extension;
    }
    const buffer = fs_1.default.readFileSync(filePath);
    if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
        return '.xlsx';
    }
    const sample = buffer.toString('utf8', 0, Math.min(buffer.length, 2048));
    if (sample.includes(';') || sample.includes(',')) {
        return '.csv';
    }
    return null;
}
async function parseSpreadsheet(filePath, sourceName) {
    const extension = detectSpreadsheetType(filePath, sourceName);
    if (extension === '.csv') {
        return parseCsv(filePath);
    }
    if (extension === '.xlsx' || extension === '.xls') {
        return parseXlsx(filePath);
    }
    throw new Error('Formato de arquivo não suportado. Use CSV ou XLSX.');
}
