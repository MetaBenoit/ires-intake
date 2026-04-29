import { supabase } from './notes';

// ─── Field Lead Creation ──────────────────────────────────────────────────────
/**
 * Create a new lead in the field (coffee shop scenario).
 * Calls ires.create_agent_lead() RPC — atomically generates LEAD-XXXX and
 * self-assigns to the creating agent.
 */
export async function createAgentLead(data, agentId) {
  const { data: result, error } = await supabase.rpc('create_agent_lead', {
    p_full_name:         data.full_name,
    p_phone_number:      data.phone_number  || null,
    p_email:             data.email         || null,
    p_budget_max:        data.budget_max    || null,
    p_budget_min:        data.budget_min    || null,
    p_area:              data.area          || null,
    p_type:              data.type          || null,
    p_intent:            data.intent        || 'buy',
    p_personality:       data.personality   || null,
    p_preferred_beds:    data.preferred_beds != null ? parseInt(data.preferred_beds) : null,
    p_timeline:          data.timeline      || null,
    p_preferred_contact: data.preferred_contact || null,
    p_agent_id:          agentId            || null,
  });
  if (error) throw error;
  return result;
}

// ─── Lead Wishlist ────────────────────────────────────────────────────────────
export async function getLeadWishlist(leadId) {
  const { data, error } = await supabase
    .from('lead_wishlist')
    .select('*')
    .eq('lead_id', leadId)
    .order('saved_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addToWishlist(item) {
  const { data, error } = await supabase
    .from('lead_wishlist')
    .insert([item])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeFromWishlist(id) {
  const { error } = await supabase
    .from('lead_wishlist')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── MLS External Search ──────────────────────────────────────────────────────
export async function searchMLS(criteria) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const resp = await fetch(`${supabaseUrl}/functions/v1/mls-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey:          anonKey,
      Authorization:  `Bearer ${anonKey}`,
    },
    body: JSON.stringify(criteria),
  });

  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`MLS search failed: ${resp.status} ${msg}`);
  }
  return resp.json();
}

/**
 * Fetch leads assigned to a specific agent
 * @param {string} agentId - Agent ID
 * @returns {Promise<Array>} - Array of leads with assignment details
 */
export async function getAssignedLeads(agentId) {
  try {
    const { data, error } = await supabase
      .from('lead_assignments')
      .select('*, leads(*)')
      .eq('assigned_to_agent_id', agentId)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false });

    if (error) throw error;

    // Flatten lead data for easier component access
    return (data || []).map(assignment => ({
      assignment_id: assignment.id,
      lead_id: assignment.lead_id,
      assigned_at: assignment.assigned_at,
      assigned_by: assignment.assigned_by,
      // Lead fields
      full_name: assignment.leads?.full_name || '',
      email: assignment.leads?.email || '',
      phone_number: assignment.leads?.phone_number || '',
      phone_e164: assignment.leads?.phone_e164 || null,
      phone_country_iso: assignment.leads?.phone_country_iso || null,
      contact_status: assignment.leads?.contact_status || 'new',
      intent_normalized: assignment.leads?.intent_normalized || null,
      type_normalized: assignment.leads?.type_normalized || null,
      next_follow_up: assignment.leads?.next_follow_up || null,
      budget_max: assignment.leads?.budget_max || null,
      type: assignment.leads?.type || '',
      area: assignment.leads?.area || '',
      source: assignment.leads?.source || '',
      notes_history: assignment.leads?.notes_history || '',
    }));
  } catch (err) {
    console.error('Error fetching assigned leads:', err);
    throw err;
  }
}

/**
 * Subscribe to real-time updates for leads assigned to an agent
 * @param {string} agentId - Agent ID
 * @param {Function} callback - Function to call on updates (INSERT, UPDATE, DELETE)
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToAssignedLeads(agentId, callback) {
  try {
    const channel = supabase
      .channel(`hot_leads_${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'ires',
          table: 'lead_assignments',
          filter: `assigned_to_agent_id=eq.${agentId}`,
        },
        async (payload) => {
          // Re-fetch the full lead data on any change
          if (payload.new && payload.new.lead_id) {
            const { data: leadData } = await supabase
              .from('leads')
              .select('*')
              .eq('lead_id', payload.new.lead_id)
              .single();

            callback({
              event: payload.eventType,
              assignment: payload.new,
              lead: leadData,
            });
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => supabase.removeChannel(channel);
  } catch (err) {
    console.error('Error subscribing to assigned leads:', err);
    throw err;
  }
}

/**
 * Update lead contact status, intent, and follow-up date
 * Calls the lead-update Edge Function
 * @param {string} leadId - Lead ID
 * @param {string} contactStatus - New contact status
 * @param {string} nextFollowUp - ISO date string for next follow-up
 * @param {string} intentNormalized - Lead's intent (buy, rent, sell, invest, services, not_interested)
 * @returns {Promise<Object>} - { success: boolean, error: string|null }
 */
export async function updateLeadStatus(leadId, contactStatus, nextFollowUp, intentNormalized) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/lead-update`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          lead_id: leadId,
          contact_status: contactStatus,
          next_follow_up: nextFollowUp,
          intent_normalized: intentNormalized,
          agent_name: localStorage.getItem('ires_agent_id') || 'agent',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return { success: true, data: result, error: null };
  } catch (err) {
    console.error('Error updating lead status:', err);
    return { success: false, data: null, error: err.message };
  }
}

/**
 * Retry pending edits from offline queue
 * @param {Array} pendingEdits - Array of { lead_id, contact_status, next_follow_up }
 * @returns {Promise<Object>} - { successful: [], failed: [] }
 */
export async function retryPendingEdits(pendingEdits) {
  const results = { successful: [], failed: [] };

  for (const edit of pendingEdits) {
    const result = await updateLeadStatus(
      edit.lead_id,
      edit.contact_status,
      edit.next_follow_up
    );

    if (result.success) {
      results.successful.push(edit.lead_id);
    } else {
      results.failed.push({ lead_id: edit.lead_id, error: result.error });
    }
  }

  return results;
}
