import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const CONSTANTS_PATH = resolve(process.cwd(), 'packages/schema/constants/enums.ts');
const SQL_PATH = resolve(
  process.cwd(),
  'packages/nuxt-layer-api/server/data/migrations/001_init.sql'
);

const enumSpecs = [
  { name: 'role', mapKey: 'USER_ROLE' },
  { name: 'work_format', mapKey: 'WORK_FORMAT' },
  { name: 'source_file_type', mapKey: 'SOURCE_FILE_TYPE' },
  { name: 'llm_provider', mapKey: 'LLM_PROVIDER' },
  { name: 'operation', mapKey: 'OPERATION' },
  { name: 'provider_type', mapKey: 'PROVIDER_TYPE' }
];

const constantsText = readFileSync(CONSTANTS_PATH, 'utf8');
const sqlText = readFileSync(SQL_PATH, 'utf8');

const maps = parseEnumMaps(constantsText);
const failures = [];

for (const spec of enumSpecs) {
  const expected = maps[spec.mapKey];
  if (!expected) {
    failures.push(`Enum map "${spec.mapKey}_MAP" not found in ${CONSTANTS_PATH}`);
    continue;
  }

  const actual = parseEnumValues(sqlText, spec.name);
  if (!actual) {
    failures.push(`Enum "${spec.name}" not found in ${SQL_PATH}`);
    continue;
  }

  if (!arrayEquals(actual, expected)) {
    failures.push(
      `Enum "${spec.name}" mismatch.\n  expected: ${expected.join(
        ', '
      )}\n  actual:   ${actual.join(', ')}`
    );
  }
}

if (failures.length > 0) {
  console.error('Enum sync check failed:');
  failures.forEach(message => {
    console.error(`- ${message}`);
  });
  process.exit(1);
}

console.log('Enum sync check passed.');

function parseEnumMaps(text) {
  const mapRegex = /export const (\w+)_MAP = \{([\s\S]*?)\}\s*as const;/g;
  const entryRegex = /[A-Z0-9_]+\s*:\s*'([^']+)'/g;
  const maps = {};
  for (const mapMatch of text.matchAll(mapRegex)) {
    const mapKey = mapMatch[1];
    const body = mapMatch[2];
    const values = [];

    for (const entryMatch of body.matchAll(entryRegex)) {
      values.push(entryMatch[1]);
    }

    if (values.length > 0) {
      maps[mapKey] = values;
    }
  }

  return maps;
}

function parseEnumValues(text, enumName) {
  const pattern = new RegExp(
    `CREATE\\s+TYPE\\s+${enumName}\\s+AS\\s+ENUM\\s*\\(([^;]+?)\\)\\s*;`,
    'is'
  );
  const match = text.match(pattern);
  if (!match) {
    return null;
  }

  const valuesBlock = match[1];
  const values = [];
  const valueRegex = /'([^']+)'/g;
  for (const valueMatch of valuesBlock.matchAll(valueRegex)) {
    values.push(valueMatch[1]);
  }

  return values.length > 0 ? values : null;
}

function arrayEquals(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}
