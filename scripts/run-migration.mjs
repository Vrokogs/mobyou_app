import pg from 'pg';
import { readFileSync } from 'fs';

const client = new pg.Client({
  host: 'db.gshikzdnvrlhqdqlplxg.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'MIKbVmHRJ1YYXxeo',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected!\n');

  // Read the migration file
  const sql = readFileSync('supabase/migrations/002_fixed_schema.sql', 'utf8');

  // Split by semicolons but respect $$ blocks
  const statements = [];
  let current = '';
  let inBlock = false;

  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') && !inBlock) {
      continue;
    }

    if (trimmed.includes('$$') && !inBlock) {
      inBlock = true;
      current += line + '\n';
      if ((line.match(/\$\$/g) || []).length >= 2) {
        inBlock = false;
      }
      continue;
    }

    if (inBlock) {
      current += line + '\n';
      if (trimmed.includes('$$')) {
        inBlock = false;
      }
      continue;
    }

    current += line + '\n';

    if (trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt && stmt !== ';') {
        statements.push(stmt);
      }
      current = '';
    }
  }

  if (current.trim()) statements.push(current.trim());

  console.log(`Found ${statements.length} SQL statements\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');

    try {
      await client.query(stmt);
      success++;
      console.log(`[${i + 1}/${statements.length}] OK: ${preview}...`);
    } catch (err) {
      const msg = err.message;
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        skipped++;
        console.log(`[${i + 1}/${statements.length}] SKIP: ${preview}...`);
      } else {
        errors++;
        console.log(`[${i + 1}/${statements.length}] ERROR: ${msg}`);
        console.log(`  Statement: ${preview}...`);
      }
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Success: ${success} | Skipped: ${skipped} | Errors: ${errors}`);

  // Now create profiles for existing auth users
  console.log('\n--- Creating profiles for test users ---');

  const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaGlremRudnJsaHFkcWxwbHhnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY4MzUyMSwiZXhwIjoyMDk2MjU5NTIxfQ.UE9vT8SGXs69ILUO-vNyFE604c9sOo-oNErsbi4_4lY";

  const usersRes = await fetch('https://gshikzdnvrlhqdqlplxg.supabase.co/auth/v1/admin/users?page=1&per_page=50', {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY },
  });
  const usersData = await usersRes.json();

  const testUsers = [
    { email: 'gestor@mobyou.com', nome: 'Admin Gestor', role: 'gestor', cpf: '111.111.111-11', telefone: '(12) 99999-0001' },
    { email: 'vendedor@mobyou.com', nome: 'Carlos Vendedor', role: 'vendedor', cpf: '222.222.222-22', telefone: '(12) 99999-0002' },
    { email: 'tecnico@mobyou.com', nome: 'Ricardo Tecnico', role: 'tecnico', cpf: '333.333.333-33', telefone: '(12) 99999-0003' },
    { email: 'cliente@mobyou.com', nome: 'Maria Cliente', role: 'cliente', cpf: '444.444.444-44', telefone: '(12) 99999-0004' },
  ];

  for (const tu of testUsers) {
    const authUser = usersData.users?.find(u => u.email === tu.email);
    if (!authUser) {
      console.log(`  [SKIP] ${tu.email} - not found in auth`);
      continue;
    }

    try {
      await client.query(
        `INSERT INTO profiles (id, nome, email, role, cpf, telefone, ativo)
         VALUES ($1, $2, $3, $4::user_role, $5, $6, true)
         ON CONFLICT (id) DO UPDATE SET nome=$2, role=$4::user_role, cpf=$5, telefone=$6`,
        [authUser.id, tu.nome, tu.email, tu.role, tu.cpf, tu.telefone]
      );
      console.log(`  [OK] ${tu.role}: ${tu.email} (${authUser.id})`);
    } catch (err) {
      console.log(`  [ERROR] ${tu.email}: ${err.message}`);
    }
  }

  // Insert empresa config
  try {
    await client.query(
      `INSERT INTO empresa_config (nome, cnpj, endereco, telefone, email)
       VALUES ('MOBYOU Litoral Norte', '00.000.000/0001-00', 'Litoral Norte - SP', '(12) 99999-0000', 'contato@mobyou.com')
       ON CONFLICT DO NOTHING`
    );
    console.log('  [OK] Empresa config created');
  } catch (err) {
    console.log(`  [INFO] Empresa: ${err.message}`);
  }

  await client.end();

  console.log('\n=== DONE ===');
  console.log('\nTest accounts:');
  console.log('┌─────────────┬──────────────────────┬───────────────┐');
  console.log('│ Role        │ Email                │ Password      │');
  console.log('├─────────────┼──────────────────────┼───────────────┤');
  console.log('│ gestor      │ gestor@mobyou.com    │ Mobyou@2024   │');
  console.log('│ vendedor    │ vendedor@mobyou.com  │ Mobyou@2024   │');
  console.log('│ tecnico     │ tecnico@mobyou.com   │ Mobyou@2024   │');
  console.log('│ cliente     │ cliente@mobyou.com   │ Mobyou@2024   │');
  console.log('└─────────────┴──────────────────────┴───────────────┘');
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
