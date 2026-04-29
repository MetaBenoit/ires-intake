import { useState, useEffect } from 'react';
import {
  getAssignedLeads,
  subscribeToAssignedLeads,
  updateLeadStatus,
  retryPendingEdits,
} from '../services/leadsService';
import NewLeadModal from '../components/NewLeadModal';

// Status enum: what happened on the call
const STATUS_OPTIONS = [
  { value: 'new', label: '🆕 New' },
  { value: 'reached_whatsapp', label: '💬 WhatsApp' },
  { value: 'reached_landline', label: '📞 Landline' },
  { value: 'no_answer', label: '📵 No Answer' },
  { value: 'call_back', label: '🔄 Call Back' },
  { value: 'bad_number', label: '❌ Bad Number' },
  { value: 'email', label: '📧 Email' },
  { value: 'follow_up', label: '📅 Follow Up' },
];

// Intent enum: what the lead wants
const INTENT_OPTIONS = [
  { value: 'buy', label: '🏠 Buy' },
  { value: 'rent', label: '🔑 Rent' },
  { value: 'sell', label: '💰 Sell' },
  { value: 'invest', label: '📈 Invest' },
  { value: 'services', label: '🔧 Services' },
  { value: 'not_interested', label: '🚫 Not Interested' },
];

// Helper: map status value to display label
const statusLabel = (value) => {
  const status = STATUS_OPTIONS.find(s => s.value === value);
  return status ? status.label : value;
};

function HotLeadsTab({ agentId, agentName: _agentName }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLeadId, setExpandedLeadId] = useState(null);
  const [, setEditingLeadId] = useState(null);
  const [editData, setEditData] = useState({});
  const [toastMsg, setToastMsg] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState({});
  const [showNewLead, setShowNewLead] = useState(false);

  // Load assigned leads on mount
  useEffect(() => {
    if (!agentId) return;

    const loadLeads = async () => {
      try {
        setLoading(true);
        const data = await getAssignedLeads(agentId);
        setLeads(data);
        setLastSyncTime(new Date());
        setError(null);

        // Check for pending edits in localStorage
        loadOfflineQueue();
      } catch (err) {
        console.error('Error loading leads:', err);
        setError('Failed to load assigned leads');
      } finally {
        setLoading(false);
      }
    };

    loadLeads();
  }, [agentId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!agentId) return;

    let unsubscribe;

    const subscribeToUpdates = async () => {
      try {
        unsubscribe = subscribeToAssignedLeads(agentId, (payload) => {
          if (payload.event === 'INSERT') {
            // New assignment
            const newLead = {
              assignment_id: payload.assignment.id,
              lead_id: payload.assignment.lead_id,
              assigned_at: payload.assignment.assigned_at,
              assigned_by: payload.assignment.assigned_by,
              full_name: payload.lead?.full_name || '',
              email: payload.lead?.email || '',
              phone_number: payload.lead?.phone_number || '',
              contact_status: payload.lead?.contact_status || 'new',
              next_follow_up: payload.lead?.next_follow_up || null,
              budget_max: payload.lead?.budget_max || null,
              type: payload.lead?.type || '',
              area: payload.lead?.area || '',
              source: payload.lead?.source || '',
              notes_history: payload.lead?.notes_history || '',
            };
            setLeads(prev => [newLead, ...prev]);
            showToast(`✅ New lead assigned: ${newLead.full_name}`);
          } else if (payload.event === 'UPDATE') {
            // Lead updated
            setLeads(prev =>
              prev.map(lead =>
                lead.lead_id === payload.assignment.lead_id
                  ? {
                      ...lead,
                      contact_status: payload.lead?.contact_status || lead.contact_status,
                      next_follow_up: payload.lead?.next_follow_up || lead.next_follow_up,
                    }
                  : lead
              )
            );
          }
          setLastSyncTime(new Date());
        });
      } catch (err) {
        console.error('Error subscribing to updates:', err);
      }
    };

    subscribeToUpdates();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [agentId]);

  // Toast notification helper
  const showToast = (message) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(null), 5000);
  };

  // Load offline queue from localStorage
  const loadOfflineQueue = () => {
    const queue = {};
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('ires_pending_edit_')) {
        const leadId = key.replace('ires_pending_edit_', '');
        queue[leadId] = JSON.parse(localStorage.getItem(key));
      }
    });
    setOfflineQueue(queue);
  };

  // Save edit to offline queue
  const saveToOfflineQueue = (leadId, data) => {
    const queueKey = `ires_pending_edit_${leadId}`;
    const queueData = {
      ...data,
      timestamp: Date.now(),
    };
    localStorage.setItem(queueKey, JSON.stringify(queueData));
    setOfflineQueue(prev => ({ ...prev, [leadId]: queueData }));
  };

  // Clear offline queue item
  const clearOfflineQueueItem = (leadId) => {
    const queueKey = `ires_pending_edit_${leadId}`;
    localStorage.removeItem(queueKey);
    setOfflineQueue(prev => {
      const updated = { ...prev };
      delete updated[leadId];
      return updated;
    });
  };

  // Handle lead status update
  const handleSaveEdit = async (leadId) => {
    const data = editData[leadId];
    if (!data || !data.contact_status) {
      setError('Please select a status');
      return;
    }

    setSyncing(true);
    const result = await updateLeadStatus(
      leadId,
      data.contact_status,
      data.next_follow_up || null,
      data.intent_normalized || null
    );

    if (result.success) {
      // Update lead in list
      setLeads(prev =>
        prev.map(lead =>
          lead.lead_id === leadId
            ? {
                ...lead,
                contact_status: data.contact_status,
                next_follow_up: data.next_follow_up,
              }
            : lead
        )
      );
      clearOfflineQueueItem(leadId);
      setEditingLeadId(null);
      showToast('✅ Lead updated');
    } else {
      // Save to offline queue
      saveToOfflineQueue(leadId, data);
      showToast(`⚠️ Offline: changes saved. Will sync when online.`);
    }

    setSyncing(false);
  };

  // Retry offline edits
  const handleRetryPending = async () => {
    setSyncing(true);
    const pendingEdits = Object.entries(offlineQueue).map(([leadId, data]) => ({
      lead_id: leadId,
      contact_status: data.contact_status,
      next_follow_up: data.next_follow_up,
    }));

    const results = await retryPendingEdits(pendingEdits);

    results.successful.forEach(leadId => {
      clearOfflineQueueItem(leadId);
      setLeads(prev =>
        prev.map(lead => {
          if (lead.lead_id === leadId) {
            const pending = offlineQueue[leadId];
            return {
              ...lead,
              contact_status: pending.contact_status,
              next_follow_up: pending.next_follow_up,
            };
          }
          return lead;
        })
      );
    });

    showToast(`✅ Synced ${results.successful.length} leads`);
    setSyncing(false);
  };

  if (!agentId) {
    return (
      <div className="hot-leads-tab">
        <div className="empty-state">
          <p>Sign in to view your assigned leads</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="hot-leads-tab">
        <div className="skeleton-loader">Loading hot leads…</div>
      </div>
    );
  }

  const hasPendingEdits = Object.keys(offlineQueue).length > 0;

  return (
    <div className="hot-leads-tab">
      <div className="hot-leads-header">
        <div className="hot-leads-info">
          <span className="lead-count">{leads.length} assigned</span>
          {lastSyncTime && (
            <span className="last-sync">
              Last sync: {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
          {hasPendingEdits && (
            <button
              className="retry-button"
              onClick={handleRetryPending}
              disabled={syncing}
            >
              ↻ Sync {Object.keys(offlineQueue).length} pending
            </button>
          )}
        </div>
        <button className="new-lead-fab" onClick={() => setShowNewLead(true)}>+ New Lead</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {leads.length === 0 ? (
        <div className="empty-state">
          <p>No leads assigned yet</p>
          <p style={{ fontSize: '0.85rem', color: '#999' }}>
            Ming will assign leads to you from desk.iresthailand.com
          </p>
        </div>
      ) : (
        <div className="hot-leads-grid">
          {leads.map(lead => (
            <div
              key={lead.lead_id}
              className={`hot-lead-card ${
                expandedLeadId === lead.lead_id ? 'expanded' : ''
              } ${offlineQueue[lead.lead_id] ? 'pending' : ''}`}
            >
              {offlineQueue[lead.lead_id] && (
                <div className="offline-badge">⚠️ Pending</div>
              )}

              <div
                className="lead-header"
                onClick={() => setExpandedLeadId(expandedLeadId === lead.lead_id ? null : lead.lead_id)}
              >
                <div className="lead-title">
                  <h3>{lead.full_name}</h3>
                  <span className={`status-badge ${lead.contact_status}`}>{statusLabel(lead.contact_status)}</span>
                </div>
                <p className="lead-meta">
                  {lead.email && <span>📧 {lead.email}</span>}
                  {(lead.phone_e164 || lead.phone_number) && <span>📞 {lead.phone_e164 || lead.phone_number}</span>}
                </p>
              </div>

              {expandedLeadId === lead.lead_id && (
                <div className="lead-details">
                  <div className="detail-field">
                    <label>Status (Call Outcome)</label>
                    <div className="status-button-group">
                      {STATUS_OPTIONS.map(
                        status => (
                          <button
                            key={status.value}
                            className={`status-button ${
                              (editData[lead.lead_id]?.contact_status || lead.contact_status) ===
                              status.value
                                ? 'active'
                                : ''
                            }`}
                            onClick={() =>
                              setEditData(prev => ({
                                ...prev,
                                [lead.lead_id]: {
                                  ...(prev[lead.lead_id] || {}),
                                  contact_status: status.value,
                                },
                              }))
                            }
                          >
                            {status.label}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="detail-field">
                    <label>Intent (What Lead Wants)</label>
                    <div className="status-button-group">
                      {INTENT_OPTIONS.map(
                        intent => (
                          <button
                            key={intent.value}
                            className={`status-button ${
                              (editData[lead.lead_id]?.intent_normalized || lead.intent_normalized) ===
                              intent.value
                                ? 'active'
                                : ''
                            }`}
                            onClick={() =>
                              setEditData(prev => ({
                                ...prev,
                                [lead.lead_id]: {
                                  ...(prev[lead.lead_id] || {}),
                                  intent_normalized: intent.value,
                                },
                              }))
                            }
                          >
                            {intent.label}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="detail-field">
                    <label>Next Follow-up</label>
                    <input
                      type="date"
                      value={
                        editData[lead.lead_id]?.next_follow_up
                          ? editData[lead.lead_id].next_follow_up.split('T')[0]
                          : lead.next_follow_up
                          ? lead.next_follow_up.split('T')[0]
                          : ''
                      }
                      onChange={e =>
                        setEditData(prev => ({
                          ...prev,
                          [lead.lead_id]: {
                            ...(prev[lead.lead_id] || {}),
                            next_follow_up: e.target.value
                              ? `${e.target.value}T10:00:00Z`
                              : null,
                          },
                        }))
                      }
                      className="date-input"
                    />
                  </div>

                  {lead.type && (
                    <div className="detail-field">
                      <label>Type</label>
                      <p>{lead.type}</p>
                    </div>
                  )}

                  {lead.area && (
                    <div className="detail-field">
                      <label>Area</label>
                      <p>{lead.area}</p>
                    </div>
                  )}

                  {lead.budget_max && (
                    <div className="detail-field">
                      <label>Budget</label>
                      <p>฿{lead.budget_max.toLocaleString()}</p>
                    </div>
                  )}


                  <div className="actions">
                    <a
                      href={`https://wa.me/${(lead.phone_e164 || lead.phone_number || '').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="call-button"
                      style={{ pointerEvents: (lead.phone_e164 || lead.phone_number) ? 'auto' : 'none', opacity: (lead.phone_e164 || lead.phone_number) ? 1 : 0.5 }}
                    >
                      💬 WhatsApp
                    </a>
                    <a
                      href={`tel:${lead.phone_e164 || lead.phone_number || ''}`}
                      className="call-button call-button--phone"
                      style={{ pointerEvents: (lead.phone_e164 || lead.phone_number) ? 'auto' : 'none', opacity: (lead.phone_e164 || lead.phone_number) ? 1 : 0.5 }}
                    >
                      📞 Call
                    </a>
                    <button
                      className="save-button"
                      onClick={() => handleSaveEdit(lead.lead_id)}
                      disabled={syncing}
                    >
                      {syncing ? '💾 Saving…' : '✓ Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toastMsg && <div className="toast-notification">{toastMsg}</div>}

      {showNewLead && (
        <NewLeadModal
          agentId={agentId}
          onClose={() => setShowNewLead(false)}
          onCreated={(lead) => {
            // Optimistically add to list and auto-expand
            const newLead = {
              lead_id:           lead.lead_id,
              full_name:         lead.full_name,
              phone_number:      null,
              email:             null,
              contact_status:    'new',
              intent_normalized: lead.intent,
              budget_max:        lead.budget_max,
              area:              lead.area,
              type:              null,
              source:            'agent_field',
              assigned_at:       new Date().toISOString(),
            };
            setLeads(prev => [newLead, ...prev]);
            setExpandedLeadId(lead.lead_id);
            setShowNewLead(false);
            showToast(`✅ Lead created: ${lead.full_name}`);
          }}
        />
      )}
    </div>
  );
}

export default HotLeadsTab;
