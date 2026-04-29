import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'ires' }
});

// ============================================================
// IRES NOTES SERVICE
// ============================================================

// Allowed agents for IRES PWA
export const IRES_PWA_AGENTS = ['Ming', 'Phil', 'Zac', 'Pang', 'Ben'];

/**
 * Get notes by context
 * @param {string} context - 'property_id' | 'lead_id' | 'general'
 * @param {string} contextId - reference ID (e.g., 'P-0001') or null for general
 * @returns {Promise<Array>}
 */
export async function getNotes(context, contextId = null) {
  let query = supabase
    .from('notes')
    .select('id, context, context_id, author, type, content, resolved, created_at')
    .eq('context', context)
    .order('created_at', { ascending: false });

  if (contextId) {
    query = query.eq('context_id', contextId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Add a note
 * @param {Object} note - { context, context_id, author, content }
 * @returns {Promise<Object>}
 */
export async function addNote({ context, context_id, author, type = 'note', content }) {
  const { data, error } = await supabase
    .from('notes')
    .insert([{ context, context_id, author, type, content }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Delete a note (by id, author validation on frontend)
 * @param {string} noteId
 * @returns {Promise<void>}
 */
export async function deleteNote(noteId) {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId);
  if (error) throw error;
}
