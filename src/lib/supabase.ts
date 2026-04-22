import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadPDF(file: File, subjectId: string): Promise<string | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    return null;
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${subjectId}/${fileName}`;

  const { error } = await supabase.storage.from('pdfs').upload(filePath, file);
  
  if (error) {
    console.error('Error uploading to Supabase:', error.message);
    throw error;
  }

  const { data } = supabase.storage.from('pdfs').getPublicUrl(filePath);
  return data.publicUrl;
}
