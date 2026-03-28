import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { calculateDeadlines, RouteInput, WindowRow } from './engine';
import { parseSpreadsheet } from './fileParsers';

type DayKey = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';

interface ExpandedRow {
  routeKey: string;
  day: DayKey;
  row: WindowRow;
}

interface AuditIssue {
  type:
    | 'final_less_than_initial'
    | 'final_equal_initial'
    | 'day_without_full_coverage'
    | 'end_before_24_without_load';
  routeKey: string;
  day: DayKey;
  detail: string;
}

const DAY_KEYS: DayKey[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

function normalizePathToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function resolvePcpCsvPath(): string {
  const projectRoot = path.resolve(process.cwd(), '..');
  const assetDirectory = fs
    .readdirSync(projectRoot, { withFileTypes: true })
    .find((entry) => entry.isDirectory() && normalizePathToken(entry.name) === 'gestao_de_prazos');

  if (!assetDirectory) {
    throw new Error('Diretorio de arquivos base nao encontrado.');
  }

  return path.join(projectRoot, assetDirectory.name, 'arquivos base', 'pcp.csv');
}

function normalizeDayKey(value: string): DayKey {
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
  if (
    normalized.startsWith('sab') ||
    normalized.startsWith('sa') ||
    normalized.startsWith('sb') ||
    normalized.includes('bado') ||
    (normalized.startsWith('s') && normalized.includes('ado'))
  ) {
    return 'sabado';
  }
  return 'domingo';
}

function splitModalValues(modal: string): string[] {
  const parts = String(modal)
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? Array.from(new Set(parts)) : [String(modal).trim()];
}

function expandRows(rows: WindowRow[]): ExpandedRow[] {
  return rows.flatMap((row) =>
    DAY_KEYS.filter((day) => row[day] === 'OK').map((day) => ({
      routeKey: [row.commercialLocation, row.geography, row.modal].join('|'),
      day,
      row,
    })),
  );
}

function collectLoadDays(routes: RouteInput[]): Map<string, Set<DayKey>> {
  const loadDaysByRoute = new Map<string, Set<DayKey>>();

  for (const route of routes) {
    for (const modal of splitModalValues(route.modal)) {
      const routeKey = [route.commercialLocation, route.geography, modal].join('|');
      const bucket = loadDaysByRoute.get(routeKey) ?? new Set<DayKey>();
      for (const event of route.events) {
        bucket.add(normalizeDayKey(event.day));
      }
      loadDaysByRoute.set(routeKey, bucket);
    }
  }

  return loadDaysByRoute;
}

async function main(): Promise<void> {
  const csvPath = resolvePcpCsvPath();
  const routes = await parseSpreadsheet(csvPath, 'pcp.csv');
  const result = calculateDeadlines(routes);
  const expandedRows = expandRows(result.rows);
  const loadDaysByRoute = collectLoadDays(routes);
  const issues: AuditIssue[] = [];

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

    if (
      entry.row.horarioFinal < 24 &&
      !(loadDaysByRoute.get(entry.routeKey)?.has(entry.day) ?? false)
    ) {
      issues.push({
        type: 'end_before_24_without_load',
        routeKey: entry.routeKey,
        day: entry.day,
        detail: `${entry.row.horarioInicial}-${entry.row.horarioFinal}`,
      });
    }
  }

  const rowsByRouteDay = new Map<string, WindowRow[]>();
  for (const entry of expandedRows) {
    const key = `${entry.routeKey}|${entry.day}`;
    const bucket = rowsByRouteDay.get(key) ?? [];
    bucket.push(entry.row);
    rowsByRouteDay.set(key, bucket);
  }

  for (const [key, rows] of rowsByRouteDay.entries()) {
    const intervals = rows
      .map((row) => [row.horarioInicial, row.horarioFinal] as const)
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
        day: day as DayKey,
        detail: intervals.map(([start, end]) => `${start}-${end}`).join(', '),
      });
    }
  }

  assert.strictEqual(
    issues.length,
    0,
    `Foram encontradas ${issues.length} violacoes estruturais:\n${JSON.stringify(
      issues.slice(0, 30),
      null,
      2,
    )}`,
  );

  console.log(
    JSON.stringify(
      {
        csvPath,
        auditedRoutes: routes.length,
        rows: result.rows.length,
        expandedRows: expandedRows.length,
        issues: issues.length,
        status: 'ok',
      },
      null,
      2,
    ),
  );
}

main();
