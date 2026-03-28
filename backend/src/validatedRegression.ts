import assert from 'assert';
import path from 'path';
import { compareWithValidatedRows, loadValidatedRows } from './validatedModel';

function resolveValidatedCsvPath(): string {
  return path.resolve('C:/Users/ar_lucati/Downloads/modelo prazos validados.csv');
}

function main(): void {
  const csvPath = resolveValidatedCsvPath();
  const rows = loadValidatedRows(csvPath);
  const mismatches = compareWithValidatedRows(rows);

  assert.strictEqual(
    mismatches.length,
    0,
    `Foram encontradas ${mismatches.length} divergencias:\n${JSON.stringify(
      mismatches.slice(0, 20),
      null,
      2,
    )}`,
  );

  console.log(
    JSON.stringify(
      {
        csvPath,
        validatedRows: rows.length,
        mismatches: mismatches.length,
        status: 'ok',
      },
      null,
      2,
    ),
  );
}

main();
