import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const DEMO_PASSWORD = 'DemoPass!2026';

const DEMO_USERS = [
  { email: 'owner@sunriseeyecare.test',      role: 'OWNER',       label: 'Owner' },
  { email: 'od@sunriseeyecare.test',         role: 'OPTOMETRIST', label: 'Optometrist' },
  { email: 'tech@sunriseeyecare.test',       role: 'TECHNICIAN',  label: 'Technician' },
  { email: 'frontdesk@sunriseeyecare.test',  role: 'FRONT_DESK',  label: 'Front desk' },
];

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const db = new PrismaClient();

async function ensureAuthUser(email) {
  // Try to find an existing Supabase Auth user with this email.
  const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (list.error) throw list.error;
  const existing = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    // Make sure password is reset to the demo password so we can log in.
    await supabaseAdmin.auth.admin.updateUserById(existing.id, { password: DEMO_PASSWORD });
    return { id: existing.id, created: false };
  }

  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  return { id: created.data.user.id, created: true };
}

let updated = 0;
for (const u of DEMO_USERS) {
  const auth = await ensureAuthUser(u.email);
  const dbUser = await db.user.update({
    where: { email: u.email },
    data: { supabaseUserId: auth.id, isActive: true },
  });
  updated += 1;
  console.log(`  ${u.label.padEnd(12)} ${u.email}  ->  authId=${auth.id}  ${auth.created ? '(created)' : '(reused)'}`);
}

console.log(`\nDone. Updated ${updated} users.`);
console.log(`\nLog in at http://localhost:3000/login with any of the emails above`);
console.log(`Password for all demo accounts: ${DEMO_PASSWORD}`);

await db.$disconnect();
