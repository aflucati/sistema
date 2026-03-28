"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadValidatedRows = loadValidatedRows;
exports.buildRoutesFromValidatedRows = buildRoutesFromValidatedRows;
exports.compareWithValidatedRows = compareWithValidatedRows;
const fs_1 = __importDefault(require("fs"));
const engine_1 = require("./engine");
function normalizeExpectedSplit(row) {
    if (row.prazoCliente > 0 && row.prazoTr === 0 && row.prazoCd > 0) {
        return {
            ...row,
            prazoCd: row.prazoCd - 1,
            prazoTr: 1,
        };
    }
    return row;
}
function toComparableRecord(row) {
    const normalized = normalizeExpectedSplit(row);
    return {
        commercialLocation: normalized.commercialLocation,
        geography: normalized.geography,
        modal: normalized.modal,
        saleDay: normalized.saleDay,
        productionDay: normalized.productionDay,
        offeredDay: normalized.offeredDay,
        startHour: normalized.startHour,
        endHour: normalized.endHour,
        prazoCd: normalized.prazoCd,
        prazoTr: normalized.prazoTr,
        prazoCliente: normalized.prazoCliente,
    };
}
const DAY_NAME_MAP = {
    domingo: 'Domingo',
    domingofeira: 'Domingo',
    segunda: 'Segunda',
    segundafeira: 'Segunda',
    terca: 'Terca',
    tercafeira: 'Terca',
    terça: 'Terca',
    terafeira: 'Terca',
    quarta: 'Quarta',
    quartafeira: 'Quarta',
    quinta: 'Quinta',
    quintafeira: 'Quinta',
    sexta: 'Sexta',
    sextafeira: 'Sexta',
    sabado: 'Sabado',
    sábado: 'Sabado',
    sbado: 'Sabado',
};
function normalizeToken(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}
function toCanonicalDay(value) {
    return DAY_NAME_MAP[normalizeToken(value)] ?? value;
}
const DAY_INDEX_MAP = {
    Segunda: 0,
    Terca: 1,
    Quarta: 2,
    Quinta: 3,
    Sexta: 4,
    Sabado: 5,
    Domingo: 6,
};
function isBusinessDay(dayNumber) {
    const dow = ((dayNumber % 7) + 7) % 7;
    return dow >= 0 && dow <= 4;
}
function nextOccurrence(fromDayNumber, targetDayIndex) {
    const currentDayIndex = ((fromDayNumber % 7) + 7) % 7;
    const offset = (targetDayIndex - currentDayIndex + 7) % 7;
    return fromDayNumber + offset;
}
function toOfferedDay(realDeliveryDayNumber) {
    let offeredDay = realDeliveryDayNumber;
    while (!isBusinessDay(offeredDay)) {
        offeredDay += 1;
    }
    return offeredDay;
}
function addBusinessDays(startDayNumber, businessDays) {
    if (businessDays <= 0) {
        return startDayNumber;
    }
    let cursor = startDayNumber;
    let counted = 0;
    while (counted < businessDays) {
        cursor += 1;
        if (isBusinessDay(cursor)) {
            counted += 1;
        }
    }
    return cursor;
}
function businessDaysBetween(startDayNumber, endDayNumber) {
    let count = 0;
    for (let cursor = startDayNumber + 1; cursor <= endDayNumber; cursor += 1) {
        if (isBusinessDay(cursor)) {
            count += 1;
        }
    }
    return count;
}
function inferFrequencyFromRows(rows) {
    const referenceRow = [...rows].sort((left, right) => left.prazoCd - right.prazoCd)[0];
    const chargeDayIndex = DAY_INDEX_MAP[referenceRow.productionDay];
    const offeredDayIndex = DAY_INDEX_MAP[referenceRow.offeredDay];
    if (chargeDayIndex === undefined || offeredDayIndex === undefined) {
        return 'SEMANAL';
    }
    const baseRealDeliveryDay = nextOccurrence(chargeDayIndex, offeredDayIndex);
    const candidates = [
        { frequency: 'SEMANAL', extraDays: 0 },
        { frequency: 'PROXIMA_SEMANA', extraDays: 7 },
        { frequency: 'PROXIMA_QUINZENA', extraDays: 14 },
        { frequency: 'QUINZENAL', extraDays: 14 },
    ];
    const bestCandidate = candidates.find((candidate) => {
        const offeredDay = toOfferedDay(baseRealDeliveryDay + candidate.extraDays);
        const prazoTr = businessDaysBetween(chargeDayIndex, offeredDay);
        return prazoTr === referenceRow.prazoTr;
    });
    return bestCandidate?.frequency ?? 'SEMANAL';
}
function inferOfferedDayFromRows(rows) {
    const referenceRow = [...rows].sort((left, right) => left.prazoCd - right.prazoCd)[0];
    const chargeDayIndex = DAY_INDEX_MAP[referenceRow.productionDay];
    if (chargeDayIndex === undefined) {
        return referenceRow.offeredDay;
    }
    const inferredOfferedDayNumber = addBusinessDays(chargeDayIndex, referenceRow.prazoTr);
    const inferredLabel = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'][((inferredOfferedDayNumber % 7) + 7) % 7];
    return inferredLabel ?? referenceRow.offeredDay;
}
function loadValidatedRows(csvPath) {
    const content = fs_1.default.readFileSync(csvPath, 'utf8');
    const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    return lines.slice(1).map((line) => {
        const columns = line.split(';');
        return {
            commercialLocation: columns[0]?.trim() ?? '',
            geography: columns[1]?.trim() ?? '',
            modal: columns[2]?.trim() ?? '',
            saleDay: toCanonicalDay(columns[3] ?? ''),
            productionDay: toCanonicalDay(columns[4] ?? ''),
            offeredDay: toCanonicalDay(columns[5] ?? ''),
            startHour: parseInt(columns[6] ?? '0', 10) || 0,
            endHour: parseInt(columns[7] ?? '0', 10) || 0,
            prazoCd: parseInt(columns[8] ?? '0', 10) || 0,
            prazoTr: parseInt(columns[9] ?? '0', 10) || 0,
            prazoCliente: parseInt(columns[10] ?? '0', 10) || 0,
        };
    });
}
function buildRoutesFromValidatedRows(rows) {
    const grouped = new Map();
    const frequencyByEventKey = new Map();
    const offeredDayByEventKey = new Map();
    const rowsByEventKey = new Map();
    for (const row of rows) {
        const eventKey = [
            row.commercialLocation,
            row.geography,
            row.modal,
            row.productionDay,
            row.endHour,
        ].join('|||');
        const group = rowsByEventKey.get(eventKey) ?? [];
        group.push(row);
        rowsByEventKey.set(eventKey, group);
    }
    for (const [eventKey, eventRows] of rowsByEventKey.entries()) {
        frequencyByEventKey.set(eventKey, inferFrequencyFromRows(eventRows));
        offeredDayByEventKey.set(eventKey, inferOfferedDayFromRows(eventRows));
    }
    for (const row of rows) {
        const routeKey = `${row.commercialLocation}|||${row.geography}|||${row.modal}`;
        const route = grouped.get(routeKey) ?? {
            modal: row.modal,
            geography: row.geography,
            commercialLocation: row.commercialLocation,
            routeDestination: row.commercialLocation,
            events: [],
        };
        const compositeEventKey = [
            row.commercialLocation,
            row.geography,
            row.modal,
            row.productionDay,
            row.endHour,
        ].join('|||');
        const inferredOfferedDay = offeredDayByEventKey.get(compositeEventKey) ?? row.offeredDay;
        const eventKey = `${row.productionDay}|||${row.endHour}|||${inferredOfferedDay}`;
        const exists = route.events.some((event) => `${toCanonicalDay(event.day)}|||${String(event.cutoffHour)}|||${toCanonicalDay(event.deliveryDay)}` ===
            eventKey);
        if (!exists) {
            const frequency = frequencyByEventKey.get(compositeEventKey);
            route.events.push({
                day: row.productionDay,
                cutoffHour: String(row.endHour),
                deliveryDay: inferredOfferedDay ?? row.offeredDay,
                frequency: frequency ?? 'SEMANAL',
            });
        }
        grouped.set(routeKey, route);
    }
    return Array.from(grouped.values());
}
function expandEngineRows(rows) {
    const expanded = [];
    const saleDayByKey = [
        { key: 'segunda', label: 'Segunda' },
        { key: 'terca', label: 'Terca' },
        { key: 'quarta', label: 'Quarta' },
        { key: 'quinta', label: 'Quinta' },
        { key: 'sexta', label: 'Sexta' },
        { key: 'sabado', label: 'Sabado' },
        { key: 'domingo', label: 'Domingo' },
    ];
    for (const row of rows) {
        for (const day of saleDayByKey) {
            if (row[day.key] !== 'OK') {
                continue;
            }
            expanded.push({
                commercialLocation: row.commercialLocation,
                geography: row.geography,
                modal: row.modal,
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
function compareWithValidatedRows(validatedRows) {
    const routes = buildRoutesFromValidatedRows(validatedRows);
    const engineRows = expandEngineRows((0, engine_1.calculateDeadlines)(routes).rows);
    const mismatches = [];
    const actualRowsByRouteDay = new Map();
    for (const row of engineRows) {
        const key = [row.commercialLocation, row.geography, row.modal, row.saleDay].join('|');
        const bucket = actualRowsByRouteDay.get(key) ?? [];
        bucket.push(row);
        actualRowsByRouteDay.set(key, bucket);
    }
    for (const expectedRow of validatedRows) {
        const normalizedExpected = normalizeExpectedSplit(expectedRow);
        const key = [
            normalizedExpected.commercialLocation,
            normalizedExpected.geography,
            normalizedExpected.modal,
            normalizedExpected.saleDay,
            normalizedExpected.startHour,
            normalizedExpected.endHour,
        ].join('|');
        const routeDayKey = [
            normalizedExpected.commercialLocation,
            normalizedExpected.geography,
            normalizedExpected.modal,
            normalizedExpected.saleDay,
        ].join('|');
        const candidates = (actualRowsByRouteDay.get(routeDayKey) ?? []).filter((actual) => {
            const startHour = Number(actual.startHour);
            const endHour = Number(actual.endHour);
            return startHour <= normalizedExpected.startHour && normalizedExpected.startHour < endHour;
        });
        if (candidates.length === 0) {
            mismatches.push({
                key,
                issue: 'missing_in_engine',
                expected: toComparableRecord(normalizedExpected),
            });
            continue;
        }
        const matchingCandidate = candidates.find((actual) => Number(actual.prazoCd) === normalizedExpected.prazoCd &&
            Number(actual.prazoTr) === normalizedExpected.prazoTr &&
            Number(actual.prazoCliente) === normalizedExpected.prazoCliente);
        if (matchingCandidate) {
            continue;
        }
        const closestCandidate = [...candidates].sort((left, right) => Number(left.startHour) - Number(right.startHour))[0];
        mismatches.push({
            key,
            issue: 'value_mismatch',
            expected: {
                prazoCd: normalizedExpected.prazoCd,
                prazoTr: normalizedExpected.prazoTr,
                prazoCliente: normalizedExpected.prazoCliente,
            },
            actual: {
                prazoCd: closestCandidate.prazoCd,
                prazoTr: closestCandidate.prazoTr,
                prazoCliente: closestCandidate.prazoCliente,
            },
        });
    }
    return mismatches;
}
