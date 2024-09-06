import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.API_SUPABASE_URL;
const supabaseAnonKey = process.env.API_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});
