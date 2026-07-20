import { Client } from 'pg';

const hosts = [
  { name: 'transaction:6543', host: 'aws-1-us-west-2.pooler.supabase.com', port: 6543 },
  { name: 'session:5432',     host: 'aws-1-us-west-2.pooler.supabase.com', port: 5432 },
];

for (const cfg of hosts) {
  const start = Date.now();
  const client = new Client({
    host: cfg.host,
    port: cfg.port,
    user: 'postgres.padvkzkdihllhdibrecc',
    password: 'UHCOEyeQAI07',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    const r = await client.query('select now() as t, current_user as u');
    console.log(`${cfg.name.padEnd(20)} OK in ${Date.now() - start}ms`, r.rows[0]);
    await client.end();
  } catch (e) {
    console.log(`${cfg.name.padEnd(20)} FAIL after ${Date.now() - start}ms: ${e.message}`);
    try { await client.end(); } catch {}
  }
}
