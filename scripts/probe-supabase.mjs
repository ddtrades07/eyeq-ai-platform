import { Client } from 'pg';

const REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ca-central-1',
  'eu-central-1', 'eu-central-2', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1',
  'sa-east-1',
];

const REF = process.env.SUPABASE_REF;
const PASS = process.env.SUPABASE_DB_PASSWORD;
if (!REF || !PASS) {
  console.error('Set SUPABASE_REF and SUPABASE_DB_PASSWORD');
  process.exit(2);
}

const HOST_PREFIXES = ['aws-1', 'aws-0'];

async function probe(region, prefix) {
  const host = `${prefix}-${region}.pooler.supabase.com`;
  const client = new Client({
    host,
    port: 5432,
    user: `postgres.${REF}`,
    password: PASS,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 4000,
    statement_timeout: 4000,
  });
  try {
    await client.connect();
    const r = await client.query('SELECT current_database() AS db, current_user AS user');
    await client.end();
    return { host, region, prefix, ok: true, info: r.rows[0] };
  } catch (e) {
    try { await client.end(); } catch {}
    return { host, region, prefix, ok: false, msg: String(e.message || e) };
  }
}

for (const prefix of HOST_PREFIXES) {
  for (const region of REGIONS) {
    const r = await probe(region, prefix);
    if (r.ok) {
      console.log(`HIT ${r.host}  ->`, r.info);
      process.exit(0);
    } else {
      const short = r.msg.split('\n')[0].slice(0, 100);
      console.log(`miss ${r.host.padEnd(46)} ${short}`);
    }
  }
}
console.log('NO MATCH');
process.exit(1);
