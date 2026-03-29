import { calculateDeadlines, RouteInput, WindowRow } from './engine';
import {
  queryDeadlineHistory,
  queryDeadlineRowsByVersion,
  queryValidDeadlineRows,
  QueryDeadlinesFilters,
  QueryHistoryFilters,
} from './deadlineStore';
import { getSupabaseConfig } from './env';
import { Client } from 'pg';

export type PlanningValidityType = 'PADRAO' | 'PONTUAL';
export type PlanningSourceType =
  | 'PLANEJAMENTO_MANUAL'
  | 'PLANEJAMENTO_UPLOAD'
  | 'AJUSTE_PONTUAL'
  | 'AJUSTE_CD'
  | 'AJUSTE_EMPRESA';
export type PlanningChangeType =
  | 'PADRAO'
  | 'PONTUAL'
  | 'FERIADO'
  | 'PARALISACAO'
  | 'DEMANDA'
  | 'ALTERACAO_DEFINITIVA';
export type PlanningScopeType = 'ROTA' | 'ALINHAMENTO' | 'CD' | 'EMPRESA';

export interface SavePlanningMetadata {
  validityType: PlanningValidityType;
  validFrom: string;
  validTo?: string | null;
  observation?: string | null;
  fileName?: string | null;
  sourceName?: string | null;
  sourceType: PlanningSourceType;
  changeType: PlanningChangeType;
  scopeType: PlanningScopeType;
  payload?: Record<string, unknown> | null;
  deadlineSourceType?: 'CALCULO_MANUAL' | 'PLANILHA_LOGISTICA' | 'PLANILHA_VALIDADA';
}

export interface QueryPlanningFilters {
  referenceDate: string;
  commercialLocation: string;
  geography?: string;
  modal?: string;
}

type PersistedDeadlineRowPayload = {
  cd: string;
  modal: string;
  geography: string;
  commercial_location: string;
  locality: string;
  metodo_cd: string;
  prazo_cd: number;
  metodo_tr: string;
  prazo_tr: number;
  prazo_cliente: number;
  horario_inicial: number;
  horario_final: number;
  rota_fixa: string;
  segunda: boolean;
  terca: boolean;
  quarta: boolean;
  quinta: boolean;
  sexta: boolean;
  sabado: boolean;
  domingo: boolean;
  raw_row: Record<string, unknown>;
};

type PersistedLogicEventPayload = {
  event_order: number;
  event_day: string;
  cutoff_hour: number;
  delivery_day: string;
  delivery_offered_day: string | null;
  frequency: string;
  raw_event: Record<string, unknown>;
};

type PersistedPlanningRoutePayload = {
  route_identity_key: string;
  cd: string;
  modal: string;
  geography: string;
  commercial_location: string;
  locality: string;
  route_destination: string;
  transport_plan: string;
  alignment_code: string;
  alignment_name: string;
  rows: PersistedDeadlineRowPayload[];
  logic_events: PersistedLogicEventPayload[];
};

function normalizeModalValues(modal: string): string[] {
  const values = String(modal ?? '')
    .split('/')
    .map((value) => value.trim())
    .filter(Boolean);

  return values.length ? Array.from(new Set(values)) : [String(modal ?? '').trim()];
}

function buildRouteIdentityKey(modal: string, geography: string, commercialLocation: string): string {
  return [String(modal).trim(), String(geography).trim(), String(commercialLocation).trim()].join('|||');
}

function addDays(dateText: string, increment: number): string {
  const date = new Date(`${dateText}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Data invalida: ${dateText}`);
  }

  date.setDate(date.getDate() + increment);
  return date.toISOString().slice(0, 10);
}

function toIsoDateText(value: unknown): string {
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

function validateMetadata(metadata: SavePlanningMetadata): SavePlanningMetadata {
  if (metadata.validityType !== 'PADRAO' && metadata.validityType !== 'PONTUAL') {
    throw new Error('Tipo de vigencia invalido. Use PADRAO ou PONTUAL.');
  }

  if (!metadata.validFrom) {
    throw new Error('Informe a data inicial da vigencia do planejamento.');
  }

  if (metadata.validityType === 'PONTUAL' && !metadata.validTo) {
    throw new Error('Para vigencia pontual, informe a data final do planejamento.');
  }

  if (
    metadata.validityType === 'PONTUAL' &&
    metadata.validTo &&
    new Date(`${metadata.validTo}T12:00:00`).getTime() < new Date(`${metadata.validFrom}T12:00:00`).getTime()
  ) {
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

function mapWindowRow(row: WindowRow): PersistedDeadlineRowPayload {
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
    raw_row: row as unknown as Record<string, unknown>,
  };
}

function buildRowsByRoute(rows: WindowRow[]): Map<string, PersistedPlanningRoutePayload> {
  const grouped = new Map<string, PersistedPlanningRoutePayload>();

  rows.forEach((row) => {
    const routeIdentityKey = buildRouteIdentityKey(row.modal, row.geography, row.commercialLocation);
    const current =
      grouped.get(routeIdentityKey) ??
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

function buildPlanningPayload(routes: RouteInput[], rows: WindowRow[], metadata: SavePlanningMetadata): Record<string, unknown> {
  const validatedMetadata = validateMetadata(metadata);
  const rowsByRoute = buildRowsByRoute(rows);
  const routeVersions = new Map<string, PersistedPlanningRoutePayload>();

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

function createDatabaseClient(): Client {
  const config = getSupabaseConfig();

  if (!config.dbHost || !config.dbPort || !config.dbName || !config.dbUser || !config.dbPassword) {
    throw new Error(
      'Credenciais do Postgres nao configuradas. Preencha SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_NAME, SUPABASE_DB_USER e SUPABASE_DB_PASSWORD no backend.',
    );
  }

  return new Client({
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

async function callDatabaseFunction<T>(sql: string, values: unknown[]): Promise<T> {
  const client = createDatabaseClient();

  try {
    await client.connect();
    await client.query("set statement_timeout = '0'");
    await client.query("set lock_timeout = '0'");
    const result = await client.query(sql, values);
    return (result.rows[0]?.payload ?? result.rows) as T;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function savePlanningDataset(input: {
  routes: RouteInput[];
  rows?: WindowRow[];
  metadata: SavePlanningMetadata;
}): Promise<Record<string, unknown>> {
  const calculatedRows = input.rows && input.rows.length ? input.rows : calculateDeadlines(input.routes).rows;
  const payload = buildPlanningPayload(input.routes, calculatedRows, input.metadata);
  return callDatabaseFunction<Record<string, unknown>>(
    'select public.prazos_apply_planning_dataset($1::jsonb) as payload',
    [JSON.stringify(payload)],
  );
}

export async function queryValidPlanning(
  filters: QueryPlanningFilters,
): Promise<Array<Record<string, unknown>>> {
  if (!filters.referenceDate) {
    throw new Error('Informe a data de referencia do planejamento.');
  }

  if (!filters.commercialLocation?.trim()) {
    throw new Error('Informe a localizacao comercial para consultar o planejamento.');
  }

  return callDatabaseFunction<Array<Record<string, unknown>>>(
    'select * from public.prazos_get_valid_planning($1::date, $2::text, $3::text, $4::text)',
    [
      filters.referenceDate,
      filters.commercialLocation.trim(),
      filters.geography?.trim() || null,
      filters.modal?.trim() || null,
    ],
  );
}

export async function queryPlanningHistory(
  filters: QueryHistoryFilters,
): Promise<Array<Record<string, unknown>>> {
  if (!filters.commercialLocation?.trim()) {
    throw new Error('Informe a localizacao comercial para consultar o historico do planejamento.');
  }

  return callDatabaseFunction<Array<Record<string, unknown>>>(
    'select * from public.prazos_get_planning_history($1::text, $2::text, $3::text)',
    [
      filters.commercialLocation.trim(),
      filters.geography?.trim() || null,
      filters.modal?.trim() || null,
    ],
  );
}

function buildComparisonKey(row: Record<string, unknown>): string {
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

export async function compareCurrentDeadlineWithPrevious(
  filters: QueryDeadlinesFilters,
): Promise<Record<string, unknown>> {
  const currentRows = await queryValidDeadlineRows(filters);
  const history = await queryDeadlineHistory({
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
  const currentHistoryIndex = history.findIndex(
    (row) => String(row.route_version_id ?? '') === currentVersionId,
  );
  const previousHistoryRow =
    history
      .slice(currentHistoryIndex >= 0 ? currentHistoryIndex + 1 : 0)
      .find((row) => String(row.route_version_id ?? '') !== currentVersionId) ?? null;

  const previousVersionId = previousHistoryRow ? String(previousHistoryRow.route_version_id ?? '') : null;
  const previousRows = previousVersionId ? await queryDeadlineRowsByVersion(previousVersionId) : [];
  const previousMap = new Map(previousRows.map((row) => [buildComparisonKey(row), row]));

  const changedRows = currentRows
    .map((row) => {
      const previous = previousMap.get(buildComparisonKey(row));
      const changed =
        !previous ||
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
      closesPreviousStandardOn:
        currentRows.length && currentRows[0].valid_from ? addDays(toIsoDateText(currentRows[0].valid_from), -1) : null,
    },
  };
}
