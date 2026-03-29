import fs from 'fs';
import path from 'path';

export type Frequency =
  | 'SEMANAL'
  | 'QUINZENAL'
  | 'PROXIMA_SEMANA'
  | 'PROXIMA_QUINZENA'
  | 'D0';

export interface RouteEventInput {
  day: string;
  cutoffHour: number | string;
  deliveryDay: string;
  frequency?: string;
}

export interface RouteInput {
  modal: string;
  geography: string;
  commercialLocation: string;
  locality?: string;
  cd?: string;
  routeDestination?: string;
  transportPlan?: string;
  alignmentCode?: string;
  alignmentName?: string;
  events: RouteEventInput[];
}

interface NormalizedEvent {
  routeKey: string;
  routeName: string;
  modal: string;
  geography: string;
  commercialLocation: string;
  locality: string;
  cd: string;
  deliveryDayIndex: number | null;
  deliveryOffsetDays: number | null;
  dayIndex: number;
  cutoffHour: number;
  frequency: Frequency;
  timestamp: number;
}

export interface DayEventDetail {
  orderDay: string;
  windowStartHour: number;
  windowEndHour: number;
  chargeDay: string;
  cutoffHour: number;
  realDeliveryDay: string;
  offeredDeliveryDay: string;
  frequency: Frequency;
  prazoCd: number;
  prazoTr: number;
  prazoCliente: number;
}

export interface WindowRow {
  cd: string;
  modal: string;
  geography: string;
  commercialLocation: string;
  locality: string;
  metodoCd: string;
  prazoCd: number;
  metodoTr: string;
  prazoTr: number;
  prazoCliente: number;
  horarioInicial: number;
  horarioFinal: number;
  rotaFixa: 'SIM' | 'NAO';
  segunda: string;
  terca: string;
  quarta: string;
  quinta: string;
  sexta: string;
  sabado: string;
  domingo: string;
  dayDetails: Record<string, string | null>;
  dayEventDetails: Record<string, DayEventDetail[] | null>;
}

interface RouteComputationResult {
  routeKey: string;
  routeName: string;
  rowCount: number;
  rows: WindowRow[];
}

export interface CalculationResult {
  summary: {
    routes: number;
    events: number;
    rows: number;
  };
  rows: WindowRow[];
  html: string;
  routes: RouteComputationResult[];
}

const DAY_NAMES = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
const DAY_KEYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const;
function normalizePathToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function resolveAssetsDirectory(): string {
  const projectRoot = path.resolve(process.cwd(), '..');
  const candidate = fs
    .readdirSync(projectRoot, { withFileTypes: true })
    .find((entry) => entry.isDirectory() && normalizePathToken(entry.name) === 'gestao_de_prazos');

  if (!candidate) {
    throw new Error('Diretório de arquivos base não encontrado.');
  }

  return path.join(projectRoot, candidate.name, 'arquivos base');
}

const DEFAULT_TEMPLATE_PATH = path.join(resolveAssetsDirectory(), 'template_oficial_horizontal.html');

const DAY_ALIASES: Record<string, number> = {
  segunda: 0,
  'segunda-feira': 0,
  terca: 1,
  'terca-feira': 1,
  terça: 1,
  'terça-feira': 1,
  quarta: 2,
  'quarta-feira': 2,
  quinta: 3,
  'quinta-feira': 3,
  sexta: 4,
  'sexta-feira': 4,
  sabado: 5,
  sábado: 5,
  domingo: 6,
  domigo: 6,
};

const FREQUENCY_ALIASES: Record<string, Frequency> = {
  semanal: 'SEMANAL',
  quinzenal: 'QUINZENAL',
  proximasemana: 'PROXIMA_SEMANA',
  'proxima semana': 'PROXIMA_SEMANA',
  próximasemana: 'PROXIMA_SEMANA',
  'próxima semana': 'PROXIMA_SEMANA',
  proximaquinzena: 'PROXIMA_QUINZENA',
  'proxima quinzena': 'PROXIMA_QUINZENA',
  próximaquinzena: 'PROXIMA_QUINZENA',
  'próxima quinzena': 'PROXIMA_QUINZENA',
  d0: 'D0',
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function parseDay(value: string): number {
  const normalized = normalizeText(value);
  const dayIndex = DAY_ALIASES[normalized];
  if (dayIndex !== undefined) {
    return dayIndex;
  }

  const lettersOnly = normalized.replace(/[^a-z]/g, '');

  if (lettersOnly.startsWith('seg')) {
    return 0;
  }
  if (lettersOnly.startsWith('ter')) {
    return 1;
  }
  if (lettersOnly.startsWith('qua')) {
    return 2;
  }
  if (lettersOnly.startsWith('qui')) {
    return 3;
  }
  if (lettersOnly.startsWith('sex')) {
    return 4;
  }
  if (
    lettersOnly.startsWith('sab') ||
    lettersOnly.startsWith('sa') ||
    lettersOnly.startsWith('sb') ||
    lettersOnly.includes('bado') ||
    (lettersOnly.startsWith('s') && lettersOnly.includes('ado'))
  ) {
    return 5;
  }
  if (lettersOnly.startsWith('dom')) {
    return 6;
  }

  throw new Error(`Dia inválido: ${value}`);
}

function parseFrequency(value?: string): Frequency {
  if (!value) {
    return 'SEMANAL';
  }
  const normalized = normalizeText(value).replace(/\s+/g, ' ');
  const compact = normalized.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  const mapped = FREQUENCY_ALIASES[normalized] ?? FREQUENCY_ALIASES[compact];
  if (mapped) {
    return mapped;
  }
  if (compact.includes('d0')) {
    return 'D0';
  }
  if (
    compact.includes('quinzena') &&
    (compact.includes('pro') || compact.includes('prox') || compact.includes('prxim'))
  ) {
    return 'PROXIMA_QUINZENA';
  }
  if (
    compact.includes('semana') &&
    (compact.includes('pro') || compact.includes('prox') || compact.includes('prxim'))
  ) {
    return 'PROXIMA_SEMANA';
  }
  if (compact.includes('quinzen')) {
    return 'QUINZENAL';
  }
  return 'SEMANAL';
}

function parseCutoffHour(value: number | string): number {
  if (typeof value === 'number') {
    return Math.min(24, Math.max(0, Math.floor(value)));
  }
  const trimmed = String(value).trim();
  if (trimmed.includes(':')) {
    const [hour] = trimmed.split(':');
    return Math.min(24, Math.max(0, parseInt(hour, 10) || 0));
  }
  return Math.min(24, Math.max(0, parseInt(trimmed, 10) || 0));
}

function parseDeliveryRule(value: string): { deliveryDayIndex: number | null; deliveryOffsetDays: number | null } {
  const trimmed = String(value).trim();
  const normalized = normalizeText(trimmed);
  const numericMatch = normalized.match(/^(\d+)$/) ?? normalized.match(/(\d+)\s*dias?/);
  if (numericMatch) {
    return {
      deliveryDayIndex: null,
      deliveryOffsetDays: parseInt(numericMatch[1], 10),
    };
  }

  return {
    deliveryDayIndex: parseDay(trimmed),
    deliveryOffsetDays: null,
  };
}

function normalizeCd(commercialLocation: string, explicitCd?: string): string {
  const raw = explicitCd?.trim() || commercialLocation.split('-')[0]?.trim() || '0';
  const numeric = raw.replace(/\D/g, '');
  if (!numeric) {
    return '000';
  }
  return numeric.padStart(3, '0').slice(-3);
}

function deriveLocality(commercialLocation: string, locality?: string, routeDestination?: string): string {
  if (locality?.trim()) {
    return locality.trim();
  }
  if (routeDestination?.trim()) {
    return routeDestination.trim();
  }
  const [, ...rest] = commercialLocation.split('-');
  return rest.join('-').trim() || commercialLocation.trim();
}

function nextOccurrence(fromDayNumber: number, targetDayIndex: number): number {
  const currentDayIndex = ((fromDayNumber % 7) + 7) % 7;
  const offset = (targetDayIndex - currentDayIndex + 7) % 7;
  return fromDayNumber + offset;
}

function calculateDeliveryDayNumber(
  chargeDayNumber: number,
  deliveryDayIndex: number | null,
  deliveryOffsetDays: number | null,
): number {
  if (deliveryOffsetDays !== null) {
    if (deliveryOffsetDays <= 0) {
      return chargeDayNumber;
    }

    let cursor = chargeDayNumber;
    let countedDays = 0;
    while (countedDays < deliveryOffsetDays) {
      cursor += 1;
      const dow = ((cursor % 7) + 7) % 7;
      if (dow !== 6) {
        countedDays += 1;
      }
    }
    return cursor;
  }

  if (deliveryDayIndex === null) {
    return chargeDayNumber;
  }

  return nextOccurrence(chargeDayNumber, deliveryDayIndex);
}

function isBusinessDay(dayNumber: number): boolean {
  const dow = ((dayNumber % 7) + 7) % 7;
  return dow >= 0 && dow <= 4;
}

function toOfferedDay(realDeliveryDayNumber: number): number {
  let offeredDay = realDeliveryDayNumber;
  while (!isBusinessDay(offeredDay)) {
    offeredDay += 1;
  }
  return offeredDay;
}

function businessDaysBetween(startDayNumber: number, endDayNumber: number): number {
  let count = 0;
  for (let cursor = startDayNumber + 1; cursor <= endDayNumber; cursor += 1) {
    if (isBusinessDay(cursor)) {
      count += 1;
    }
  }
  return count;
}

function dayNumberToLabel(dayNumber: number): string {
  return DAY_NAMES[((dayNumber % 7) + 7) % 7];
}

function dayIndexToLabel(dayIndex: number): string {
  return DAY_NAMES[dayIndex];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function splitModalValues(modal: string): string[] {
  const parts = String(modal)
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? Array.from(new Set(parts)) : [String(modal).trim()];
}

function buildDayEventDetail(
  orderDayIndex: number,
  startHour: number,
  endHour: number,
  chargeDayNumber: number,
  selectedEvent: NormalizedEvent,
  realDeliveryDayNumber: number,
  offeredDayNumber: number,
  prazoCd: number,
  prazoTr: number,
  prazoCliente: number,
): DayEventDetail {
  return {
    orderDay: dayIndexToLabel(orderDayIndex),
    windowStartHour: startHour,
    windowEndHour: endHour,
    chargeDay: dayNumberToLabel(chargeDayNumber),
    cutoffHour: selectedEvent.cutoffHour,
    realDeliveryDay: dayNumberToLabel(realDeliveryDayNumber),
    offeredDeliveryDay: dayNumberToLabel(offeredDayNumber),
    frequency: selectedEvent.frequency,
    prazoCd,
    prazoTr,
    prazoCliente,
  };
}

function buildDayEventDetailText(routeName: string, detail: DayEventDetail): string {
  return [
    routeName,
    `Dia do Pedido: ${detail.orderDay} | Janela: ${detail.windowStartHour}-${detail.windowEndHour}`,
    `Dia de Produção/Carga: ${detail.chargeDay}`,
    `Dia de Entrega Real: ${detail.realDeliveryDay}`,
    `Dia do Prazo Ofertado: ${detail.offeredDeliveryDay}`,
    `Frequência: ${detail.frequency}`,
    `CD ${detail.prazoCd} | TR ${detail.prazoTr} | CLIENTE ${detail.prazoCliente}`,
  ].join('\n');
}

function buildDetails(
  routeName: string,
  orderDayIndex: number,
  startHour: number,
  endHour: number,
  chargeDayNumber: number,
  realDeliveryDayNumber: number,
  offeredDayNumber: number,
  prazoCd: number,
  prazoTr: number,
  prazoCliente: number,
): string {
  return [
    routeName,
    `Dia do Pedido: ${dayIndexToLabel(orderDayIndex)} | Janela: ${startHour}-${endHour}`,
    `Dia de Produção/Carga: ${dayNumberToLabel(chargeDayNumber)}`,
    `Dia de Entrega Real: ${dayNumberToLabel(realDeliveryDayNumber)}`,
    `Dia do Prazo Ofertado: ${dayNumberToLabel(offeredDayNumber)}`,
    `CD ${prazoCd} | TR ${prazoTr} | CLIENTE ${prazoCliente}`,
  ].join('\n');
}

function createBaseRow(
  event: NormalizedEvent,
  startHour: number,
  endHour: number,
  orderDayNumber: number,
  cargasPorSemana: number,
  selectedEvent: NormalizedEvent,
  selectedTimestamp: number,
): WindowRow {
  const orderDayIndex = ((orderDayNumber % 7) + 7) % 7;
  const chargeDayNumber = Math.floor(selectedTimestamp / 24);
  let realDeliveryDayNumber = calculateDeliveryDayNumber(
    chargeDayNumber,
    selectedEvent.deliveryDayIndex,
    selectedEvent.deliveryOffsetDays,
  );

  if (selectedEvent.frequency === 'PROXIMA_SEMANA') {
    realDeliveryDayNumber += 7;
  }
  if (selectedEvent.frequency === 'PROXIMA_QUINZENA') {
    realDeliveryDayNumber += 14;
  }
  if (selectedEvent.frequency === 'QUINZENAL') {
    realDeliveryDayNumber += 7;
  }

  const offeredDayNumber = toOfferedDay(realDeliveryDayNumber);
  let prazoCd = businessDaysBetween(orderDayNumber, chargeDayNumber);
  let prazoTr = businessDaysBetween(chargeDayNumber, offeredDayNumber);
  if (prazoCd === 0 && prazoTr === 0 && selectedEvent.frequency !== 'D0') {
    prazoTr = 1;
  }
  if (prazoTr === 0 && prazoCd > 0) {
    prazoCd -= 1;
    prazoTr = 1;
  }
  const prazoCliente = prazoCd + prazoTr;

  const dayDetails: Record<string, string | null> = Object.fromEntries(
    DAY_KEYS.map((key) => [key, null]),
  ) as Record<string, string | null>;
  const dayEventDetails: Record<string, DayEventDetail[] | null> = Object.fromEntries(
    DAY_KEYS.map((key) => [key, null]),
  ) as Record<string, DayEventDetail[] | null>;
  const detail = buildDayEventDetail(
    orderDayIndex,
    startHour,
    endHour,
    chargeDayNumber,
    selectedEvent,
    realDeliveryDayNumber,
    offeredDayNumber,
    prazoCd,
    prazoTr,
    prazoCliente,
  );
  dayDetails[DAY_KEYS[orderDayIndex]] = buildDayEventDetailText(event.routeName, detail);
  dayEventDetails[DAY_KEYS[orderDayIndex]] = [detail];

  return {
    cd: event.cd,
    modal: event.modal,
    geography: event.geography,
    commercialLocation: event.commercialLocation,
    locality: event.locality,
    metodoCd: 'SUBSTITUIR',
    prazoCd,
    metodoTr: 'SUBSTITUIR',
    prazoTr,
    prazoCliente,
    horarioInicial: startHour,
    horarioFinal: endHour,
    rotaFixa: 'NAO',
    segunda: 'NOK',
    terca: 'NOK',
    quarta: 'NOK',
    quinta: 'NOK',
    sexta: 'NOK',
    sabado: 'NOK',
    domingo: 'NOK',
    dayDetails,
    dayEventDetails,
  };
}

function mergeRows(rows: WindowRow[]): WindowRow[] {
  const grouped = new Map<string, WindowRow>();

  for (const row of rows) {
    const key = [
      row.cd,
      row.modal,
      row.geography,
      row.commercialLocation,
      row.locality,
      row.metodoCd,
      row.prazoCd,
      row.metodoTr,
      row.prazoTr,
      row.prazoCliente,
      row.horarioInicial,
      row.horarioFinal,
    ].join('|');

    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, row);
      continue;
    }

    DAY_KEYS.forEach((dayKey) => {
      const value = row.dayDetails[dayKey];
      const detailEntries = row.dayEventDetails[dayKey];
      if (!value) {
        return;
      }

      current[dayKey] = 'OK';
      current.dayDetails[dayKey] = current.dayDetails[dayKey]
        ? `${current.dayDetails[dayKey]}\n\n${value}`
        : value;
      current.dayEventDetails[dayKey] = [
        ...(current.dayEventDetails[dayKey] ?? []),
        ...(detailEntries ?? []),
      ];
    });
  }

  return Array.from(grouped.values()).map((row) => {
    DAY_KEYS.forEach((dayKey) => {
      row[dayKey] = row.dayDetails[dayKey] ? 'OK' : 'NOK';
    });
    const okCount = DAY_KEYS.filter((dayKey) => row[dayKey] === 'OK').length;
    row.rotaFixa =
      row.horarioInicial === 0 && row.horarioFinal === 24 && okCount >= 5 ? 'SIM' : 'NAO';
    return row;
  });
}

function buildRouteWindows(events: NormalizedEvent[]): WindowRow[] {
  const orderedEvents = [...events].sort((left, right) => left.timestamp - right.timestamp);
  const cargasPorSemana = orderedEvents.length;
  const rows: WindowRow[] = [];

  for (let index = 0; index < orderedEvents.length; index += 1) {
    const selectedEvent = orderedEvents[index];
    const previousEvent = orderedEvents[(index - 1 + orderedEvents.length) % orderedEvents.length];
    const intervalStart =
      previousEvent.timestamp >= selectedEvent.timestamp
        ? previousEvent.timestamp - 168
        : previousEvent.timestamp;
    const intervalEnd = selectedEvent.timestamp;
    const startDayNumber = Math.floor(intervalStart / 24);
    const endDayNumber = Math.floor((intervalEnd - 0.0001) / 24);

    for (let orderDayNumber = startDayNumber; orderDayNumber <= endDayNumber; orderDayNumber += 1) {
      const dayStart = orderDayNumber * 24;
      const dayEnd = dayStart + 24;
      const sliceStart = Math.max(intervalStart, dayStart);
      const sliceEnd = Math.min(intervalEnd, dayEnd);

      if (sliceStart >= sliceEnd) {
        continue;
      }

      const startHour = sliceStart - dayStart;
      const endHour = sliceEnd - dayStart;

      rows.push(
        createBaseRow(
          events[0],
          startHour,
          endHour,
          orderDayNumber,
          cargasPorSemana,
          selectedEvent,
          selectedEvent.timestamp,
        ),
      );
    }
  }

  return mergeRows(rows);
}

function sortRows(rows: WindowRow[]): WindowRow[] {
  return [...rows].sort((left, right) => {
    const byLocation = left.commercialLocation.localeCompare(right.commercialLocation, 'pt-BR');
    if (byLocation !== 0) {
      return byLocation;
    }
    const byGeography = left.geography.localeCompare(right.geography, 'pt-BR');
    if (byGeography !== 0) {
      return byGeography;
    }
    const byModal = left.modal.localeCompare(right.modal, 'pt-BR');
    if (byModal !== 0) {
      return byModal;
    }
    for (const dayKey of DAY_KEYS) {
      if (left[dayKey] !== right[dayKey]) {
        return left[dayKey] === 'OK' ? -1 : 1;
      }
    }
    return left.horarioInicial - right.horarioInicial;
  });
}

function buildHtml(rows: WindowRow[]): string {
  const template = fs.readFileSync(DEFAULT_TEMPLATE_PATH, 'utf8');
  const htmlRows = rows
    .map((row) => {
      const cells = [
        row.cd,
        row.modal,
        row.geography,
        row.commercialLocation,
        row.locality,
        row.metodoCd,
        String(row.prazoCd),
        row.metodoTr,
        String(row.prazoTr),
        String(row.prazoCliente),
        String(row.horarioInicial),
        String(row.horarioFinal),
        row.rotaFixa === 'NAO' ? 'NÃO' : row.rotaFixa,
      ];

      const staticCells = cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('');
      const dayCells = DAY_KEYS.map((dayKey) => {
        const details = row.dayDetails[dayKey];
        if (!details) {
          return '<td class="nok">NOK</td>';
        }

        return `<td class="ok" title="${escapeHtml(details)}" onclick="showModal('${escapeJsString(
          details,
        )}')" style="cursor:pointer">OK</td>`;
      }).join('');

      return `<tr>${staticCells}${dayCells}</tr>`;
    })
    .join('\n');

  return template.replace(
    /<!--DATA_ROWS_START-->[\s\S]*<!--DATA_ROWS_END-->/,
    `<!--DATA_ROWS_START-->\n${htmlRows}\n<!--DATA_ROWS_END-->`,
  );
}

function expandRowsByModal(rows: WindowRow[]): WindowRow[] {
  return rows.flatMap((row) =>
    splitModalValues(row.modal).map((modal) => ({
      ...row,
      modal,
      dayDetails: { ...row.dayDetails },
      dayEventDetails: Object.fromEntries(
        Object.entries(row.dayEventDetails).map(([dayKey, details]) => [
          dayKey,
          details ? details.map((detail) => ({ ...detail })) : null,
        ]),
      ) as Record<string, DayEventDetail[] | null>,
    })),
  );
}

export function calculateDeadlines(routes: RouteInput[]): CalculationResult {
  const normalizedRoutes = routes.map((route) => {
    const cd = normalizeCd(route.commercialLocation, route.cd);
    const locality = deriveLocality(route.commercialLocation, route.locality, route.routeDestination);
    const routeName = `${route.commercialLocation} | ${route.geography} | ${route.modal}`;
    const routeKey = `${route.modal}|||${route.geography}|||${route.commercialLocation}`;
    const events = route.events.map((event) => {
      const dayIndex = parseDay(event.day);
      const cutoffHour = parseCutoffHour(event.cutoffHour);
      const deliveryRule = parseDeliveryRule(event.deliveryDay);

      return {
        routeKey,
        routeName,
        modal: route.modal.trim(),
        geography: route.geography.trim(),
        commercialLocation: route.commercialLocation.trim(),
        locality,
        cd,
        deliveryDayIndex: deliveryRule.deliveryDayIndex,
        deliveryOffsetDays: deliveryRule.deliveryOffsetDays,
        dayIndex,
        cutoffHour,
        frequency: parseFrequency(event.frequency),
        timestamp: cutoffHour === 24 ? dayIndex * 24 : dayIndex * 24 + cutoffHour,
      } satisfies NormalizedEvent;
    });

    return {
      routeKey,
      routeName,
      events,
    };
  });

  const routeResults = normalizedRoutes.map((route) => {
    if (route.events.length === 0) {
      throw new Error(`A rota ${route.routeName} não possui eventos.`);
    }
    const rows = sortRows(expandRowsByModal(buildRouteWindows(route.events)));
    return {
      routeKey: route.routeKey,
      routeName: route.routeName,
      rowCount: rows.length,
      rows,
    };
  });

  const allRows = sortRows(routeResults.flatMap((route) => route.rows));

  return {
    summary: {
      routes: routeResults.length,
      events: normalizedRoutes.reduce((total, route) => total + route.events.length, 0),
      rows: allRows.length,
    },
    rows: allRows,
    html: buildHtml(allRows),
    routes: routeResults,
  };
}
