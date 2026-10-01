import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
// Nama lama (…_DEFAULT_KEY) masih dipakai di environment variables Vercel.
const supabaseKey = (process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY ||
  process.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY)!;

export const supabase = createClient(supabaseUrl, supabaseKey);
