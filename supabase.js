const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL environment variable is not set');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

module.exports = { supabase };
