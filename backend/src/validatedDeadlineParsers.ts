import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import * as XLSX from 'xlsx';
import { WindowRow } from './engine';

type ParsedRecord = Record<string, string | number | undefined>;

const DAY_KEYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const;

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

function decodeCsvBuffer(buffer: Buffer): string {
  const utf8 = buffer.toString('utf8');
  const latin1 = buffer.toString('latin1');

  if (utf8.includes('\uFFFD')) {
    return latin1;
  }

  const score = (text: string) => {
    const normalized = normalizeToken(text.slice(0, 1200));
    let total = 0;

    if (normalized.includes('localizacaocomercial')) total += 4;
    if (normalized.includes('metododeofertaprazocd')) total += 4;
    if (normalized.includes('metododeofertaprazotr')) total += 4;
    if (normalized.includes('prazocliente')) total += 4;
    if (normalized.includes('horarioinicial')) total += 4;
    if (normalized.includes('horariofinal')) total += 4;

    const replacementMatches = (text.match(/\uFFFD/g) || []).length;
    total -= replacementMatches * 3;

    if (/[ÃÂ]/.test(text)) {
      total -= 8;
    }

    return total;
  };

  return score(latin1) > score(utf8) ? latin1 : utf8;
}

function getFieldExact(record: ParsedRecord, aliases: string[]): string {
  const normalizedAliases = aliases.map((alias) => normalizeToken(alias));
  const match = Object.entries(record).find(([key]) => normalizedAliases.includes(normalizeToken(key)));
  return match ? String(match[1] ?? '').trim() : '';
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

function toOkFlag(value: string): string {
  return normalizeToken(value) === 'ok' ? 'OK' : 'NOK';
}

function toNaoSim(value: string): 'SIM' | 'NAO' {
  const normalized = normalizeToken(value);
  return normalized.startsWith('sim') ? 'SIM' : 'NAO';
}

function toInt(value: string): number {
  return parseInt(String(value ?? '').trim(), 10) || 0;
}

function toWindowRow(rawRecord: ParsedRecord): WindowRow {
  const record = normalizeRecord(rawRecord);
  const dayDetails = Object.fromEntries(
    DAY_KEYS.map((dayKey) => [dayKey, null]),
  ) as Record<string, string | null>;
  const dayEventDetails = Object.fromEntries(
    DAY_KEYS.map((dayKey) => [dayKey, null]),
  ) as Record<string, null>;

  const cd = getFieldExact(record, ['CD']) || getField(record, ['codigo'], 0);
  const modal = getFieldExact(record, ['Modal']) || getField(record, ['agrupamentomodal'], 1);
  const geography = getFieldExact(record, ['Geografia']) || getField(record, ['geotipo', 'geografia', 'geotipoloja'], 2);
  const commercialLocation =
    getFieldExact(record, ['Localizacao Comercial']) ||
    getField(record, ['localizacaocomercial', 'localloja', 'localizacao', 'localizaoloja'], 3);
  const locality = getFieldExact(record, ['Localidade']) || getField(record, ['localidade'], 4);
  const metodoCd =
    getFieldExact(record, ['Metodo de Oferta Prazo CD']) || getField(record, ['metododeofertaprazocd'], 5) || 'SUBSTITUIR';
  const prazoCd = toInt(getFieldExact(record, ['Prazo CD']) || getField(record, ['prazocd'], 6));
  const metodoTr =
    getFieldExact(record, ['Metodo de Oferta Prazo TR']) || getField(record, ['metododeofertaprazotr'], 7) || 'SUBSTITUIR';
  const prazoTr =
    toInt(getFieldExact(record, ['Prazo TR']) || getField(record, ['prazotranspajustado', 'prazotransp'], 8));
  const prazoCliente =
    toInt(getFieldExact(record, ['Prazo Cliente']) || getField(record, ['prazocliente'], 9));
  const horarioInicial =
    toInt(getFieldExact(record, ['Horario Inicial']) || getField(record, ['horarioinicial'], 10));
  const horarioFinal =
    toInt(getFieldExact(record, ['Horario Final']) || getField(record, ['horariofinal'], 11));
  const rotaFixa =
    toNaoSim(getFieldExact(record, ['Rota Fixa']) || getField(record, ['rotafixa'], 12));

  return {
    cd,
    modal,
    geography,
    commercialLocation,
    locality,
    metodoCd,
    prazoCd,
    metodoTr,
    prazoTr,
    prazoCliente,
    horarioInicial,
    horarioFinal,
    rotaFixa,
    segunda: toOkFlag(getFieldExact(record, ['Segunda']) || getField(record, ['segunda'], 13)),
    terca: toOkFlag(getFieldExact(record, ['Terca']) || getField(record, ['terca'], 14)),
    quarta: toOkFlag(getFieldExact(record, ['Quarta']) || getField(record, ['quarta'], 15)),
    quinta: toOkFlag(getFieldExact(record, ['Quinta']) || getField(record, ['quinta'], 16)),
    sexta: toOkFlag(getFieldExact(record, ['Sexta']) || getField(record, ['sexta'], 17)),
    sabado: toOkFlag(getFieldExact(record, ['Sabado']) || getField(record, ['sabado'], 18)),
    domingo: toOkFlag(getFieldExact(record, ['Domingo']) || getField(record, ['domingo'], 19)),
    dayDetails,
    dayEventDetails,
  };
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

function parseCsv(filePath: string): Promise<WindowRow[]> {
  return new Promise((resolve, reject) => {
    const rows: ParsedRecord[] = [];
    const content = decodeCsvBuffer(fs.readFileSync(filePath));

    parse(
      content,
      {
        delimiter: ';',
        columns: true,
        bom: true,
        trim: true,
        skip_empty_lines: true,
      },
      (error, records: ParsedRecord[]) => {
        if (error) {
          reject(error);
          return;
        }

        rows.push(...records);
        resolve(rows.map(toWindowRow));
      },
    );
  });
}

function parseXlsx(filePath: string): WindowRow[] {
  const workbook = XLSX.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<ParsedRecord>(sheet, {
    defval: '',
    raw: false,
  });

  return rows.map(toWindowRow);
}

export async function parseValidatedDeadlineSpreadsheet(
  filePath: string,
  sourceName?: string,
): Promise<WindowRow[]> {
  const extension = detectSpreadsheetType(filePath, sourceName);
  if (extension === '.csv') {
    return parseCsv(filePath);
  }
  if (extension === '.xlsx' || extension === '.xls') {
    return parseXlsx(filePath);
  }

  throw new Error('Formato de arquivo nao suportado. Use CSV ou XLSX.');
}
