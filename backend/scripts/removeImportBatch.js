const { Client } = require('pg');

function requireEnv(name, fallback = '') {
  const value = (process.env[name] || fallback || '').trim();
  if (!value) {
    throw new Error(`Variavel obrigatoria ausente: ${name}`);
  }
  return value;
}

async function main() {
  const batchId = requireEnv('BATCH_ID');

  const client = new Client({
    host: requireEnv('SUPABASE_DB_HOST'),
    port: Number(requireEnv('SUPABASE_DB_PORT', '5432')),
    database: requireEnv('SUPABASE_DB_NAME', 'postgres'),
    user: requireEnv('SUPABASE_DB_USER'),
    password: requireEnv('SUPABASE_DB_PASSWORD'),
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    const result = await client.query(
      `
        delete from prazos.import_batches
        where id = $1::uuid
        returning id
      `,
      [batchId],
    );

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          batchId,
          deleted: result.rowCount || 0,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
