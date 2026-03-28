import fs from 'fs';
import path from 'path';

let envLoaded = false;

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      return;
    }

    const [key, value] = parsed;
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

export function ensureLocalEnvLoaded(): void {
  if (envLoaded) {
    return;
  }

  const rootDir = path.resolve(__dirname, '..');
  loadEnvFile(path.join(rootDir, '.env'));
  loadEnvFile(path.join(rootDir, '.env.local'));
  envLoaded = true;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  ensureLocalEnvLoaded();

  return {
    url: process.env.SUPABASE_URL?.trim() ?? '',
    anonKey: process.env.SUPABASE_ANON_KEY?.trim() ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '',
    dbHost: process.env.SUPABASE_DB_HOST?.trim() ?? '',
    dbPort: process.env.SUPABASE_DB_PORT?.trim() ?? '',
    dbName: process.env.SUPABASE_DB_NAME?.trim() ?? '',
    dbUser: process.env.SUPABASE_DB_USER?.trim() ?? '',
    dbPassword: process.env.SUPABASE_DB_PASSWORD?.trim() ?? '',
  };
}

export function assertSupabaseServiceRole(): SupabaseConfig {
  const config = getSupabaseConfig();

  if (!config.url) {
    throw new Error('SUPABASE_URL nao configurada no backend.');
  }

  if (!config.serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY nao configurada. Para gravar e consultar o banco com seguranca, adicione a service role key no backend.',
    );
  }

  return config;
}
