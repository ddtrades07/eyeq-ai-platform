import { Client } from 'pg';

const password = 'UHCOEyeQAI07';
const ref = 'padvkzkdihllhdibrecc';
const host = 'aws-1-us-west-2.pooler.supabase.com';

console.log('Password length:', password.length);
console.log('Password char codes:', Array.from(password).map((c) => c.charCodeAt(0)).join(','));
console.log('Connecting to', host);

const client = new Client({
  host,
  port: 5432,
  user: `postgres.${ref}`,
  password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
});

try {
  await client.connect();
  const r = await client.query('SELECT current_database() AS db, current_user AS u, now() AS t');
  console.log('OK:', r.rows[0]);
  await client.end();
} catch (e) {
  console.log('FAIL:', e.message);
  console.log('code:', e.code);
  console.log('routine:', e.routine);
}
