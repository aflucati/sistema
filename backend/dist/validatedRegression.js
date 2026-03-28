"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const path_1 = __importDefault(require("path"));
const validatedModel_1 = require("./validatedModel");
function resolveValidatedCsvPath() {
    return path_1.default.resolve('C:/Users/ar_lucati/Downloads/modelo prazos validados.csv');
}
function main() {
    const csvPath = resolveValidatedCsvPath();
    const rows = (0, validatedModel_1.loadValidatedRows)(csvPath);
    const mismatches = (0, validatedModel_1.compareWithValidatedRows)(rows);
    assert_1.default.strictEqual(mismatches.length, 0, `Foram encontradas ${mismatches.length} divergencias:\n${JSON.stringify(mismatches.slice(0, 20), null, 2)}`);
    console.log(JSON.stringify({
        csvPath,
        validatedRows: rows.length,
        mismatches: mismatches.length,
        status: 'ok',
    }, null, 2));
}
main();
