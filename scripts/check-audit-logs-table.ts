import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAuditLogsTable() {
  console.log('Checking audit_logs table...\n');

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('relation "audit_logs" does not exist')) {
        console.error('❌ Table audit_logs does not exist!');
        console.log('\nTo fix this, run:');
        console.log('  supabase db push');
        console.log('\nOr manually run the migrations:');
        console.log('  1. supabase/migrations/20260221000000_create_audit_logs_table.sql');
        console.log('  2. supabase/migrations/20260221000001_add_audit_logs_permissions.sql');
        process.exit(1);
      } else {
        console.error('❌ Error checking table:', error.message);
        process.exit(1);
      }
    }

    console.log('✅ Table audit_logs exists!');
    
    // Check permissions
    const { data: permissions, error: permError } = await supabase
      .from('permissions')
      .select('name')
      .like('name', '%audit-logs%');

    if (permError) {
      console.error('⚠️  Warning: Could not check permissions:', permError.message);
    } else if (!permissions || permissions.length === 0) {
      console.log('⚠️  Warning: No audit-logs permissions found');
      console.log('   Run migration: 20260221000001_add_audit_logs_permissions.sql');
    } else {
      console.log(`✅ Found ${permissions.length} audit-logs permissions`);
      permissions.forEach(p => console.log(`   - ${p.name}`));
    }

    console.log('\n✅ Audit logs system is ready!');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

checkAuditLogsTable();
