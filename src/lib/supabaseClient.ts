import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://kvegqbvjazxvujnrayfi.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZWdxYnZqYXp4dnVqbnJheWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU3MTA0OTcsImV4cCI6MjExMTI4NjQ5N30.vf2qfXP-sF4LZp4xHE_55eHg-jf4MJVzhGyfKBmSRcc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function testSupabaseConnection() {
  try {
    const { error } = await supabase.from('settings').select('id').limit(1);
    if (error) {
      console.warn('Supabase table check note:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase connection error:', err);
    return false;
  }
}
