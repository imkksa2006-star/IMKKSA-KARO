import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials missing. Real-time features might not work.');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

export interface SupabaseProposal {
  id?: number;
  nomor_surat: string;
  tujuan_surat: string;
  pemohon: string;
  tanggal_surat: string;
  no_urut: number;
  link_download: string;
}
