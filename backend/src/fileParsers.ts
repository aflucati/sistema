import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import * as XLSX from 'xlsx';
import { RouteInput } from './engine';

type ParsedRecord = Record<string, string | number | undefined>;

interface CanonicalRecord {
  modal: string;
  geography: string;
  commercialLocation: string;
  day: string;
  cutoffHour: string;
  deliveryDay: string;
  frequency: string;
  routeDestination: string;
}

function normalizeToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeRecord(record: ParsedRecord): ParsedRecord {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [String(key).trim(), value]));
}

function getField(record: ParsedRecord, predicates: string[], fallbackIndex: number): string {
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

function toCanonicalRecord(rawRecord: ParsedRecord): CanonicalRecord {
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

function groupRecords(records: ParsedRecord[]): RouteInput[] {
  const grouped = new Map<string, RouteInput>();

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

function parseCsv(filePath: string): Promise<RouteInput[]> {
  return new Promise((resolve, reject) => {
    const rows: ParsedRecord[] = [];
    fs.createReadStream(filePath)
      .pipe(
        parse({
          delimiter: ';',
          columns: true,
          bom: true,
          trim: true,
          skip_empty_lines: true,
        }),
      )
      .on('data', (row: ParsedRecord) => rows.push(row))
      .on('end', () => resolve(groupRecords(rows)))
      .on('error', reject);
  });
}

function parseXlsx(filePath: string): RouteInput[] {
  const workbook = XLSX.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<ParsedRecord>(sheet, {
    defval: '',
    raw: false,
  });
  return groupRecords(rows);
}

function detectSpreadsheetType(filePath: string, sourceName?: string): '.csv' | '.xlsx' | '.xls' | null {
  const extension = path.extname(sourceName ?? filePath).toLowerCase();
  if (extension === '.csv' || extension === '.xlsx' || extension === '.xls') {
    return extension;
  }

  const buffer = fs.readFileSync(filePath);
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return '.xlsx';
  }

  const sample = buffer.toString('utf8', 0, Math.min(buffer.length, 2048));
  if (sample.includes(';') || sample.includes(',')) {
    return '.csv';
  }

  return null;
}

export async function parseSpreadsheet(filePath: string, sourceName?: string): Promise<RouteInput[]> {
  const extension = detectSpreadsheetType(filePath, sourceName);
  if (extension === '.csv') {
    return parseCsv(filePath);
  }
  if (extension === '.xlsx' || extension === '.xls') {
    return parseXlsx(filePath);
  }
  throw new Error('Formato de arquivo não suportado. Use CSV ou XLSX.');
}
