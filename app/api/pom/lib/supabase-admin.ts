import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  console.warn('⚠️ [PayNode Web] NEXT_PUBLIC_SUPABASE_URL not found.');
}

// Function to get a Service Role client for admin tasks (bypass RLS)
export const getServiceSupabase = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceKey) console.warn('⚠️ [PayNode Web] SUPABASE_SERVICE_ROLE_KEY not found.');
  return createClient(supabaseUrl, serviceKey);
};

// Standardized admin constant for internal consistency
export const supabaseAdmin = getServiceSupabase();
