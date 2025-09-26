import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your project's credentials
export const supabaseUrl = 'https://zcxsscvheqidzvkhlnwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeHNzY3ZoZXFpZHp2a2hsbnd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTgwNzIsImV4cCI6MjA3MjgzNDA3Mn0.sLp0HawqmZDxZ1pSv1BWZU4abuoHZAI2mkkwlrb4gHs';

if (!supabaseUrl) {
    console.warn('Supabase URL is not configured. Please add it to supabaseClient.ts');
}
if (!supabaseAnonKey) {
    console.warn('Supabase Anon Key is not configured. Please add it to supabaseClient.ts');
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);