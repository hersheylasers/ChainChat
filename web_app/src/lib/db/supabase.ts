import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// For client-side code, use NEXT_PUBLIC_ variables directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ahxyjxbseijczbuehpbp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeHlqeGJzZWlqY3pidWVocGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkwMTgxMTMsImV4cCI6MjA1NDU5NDExM30.wYGSzCNzq2pUDYN2vIMe8P43i9ZeIKrXCKgGnXCdpEc';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
