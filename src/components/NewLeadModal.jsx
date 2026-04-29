import { useState } from 'react';
import { createAgentLead } from '../services/leadsService';
import './NewLeadModal.css';

const AREAS = ['Jomtien', 'Pratumnak', 'Na Kluea', 'Wongamat', 'Central Pattaya', 'East Pattaya', 'Bang Saray', 'Other'];
const TYPES = ['condo', 'house', 'land', 'villa', 'townhouse'];
const TIMELINES = [
  { value: 'asap',     label: '🔥 ASAP' },
  { value: '1_month',  label: '1 Month' },
  { value: '3_months', label: '3 Months' },
  { value: '6_months', label: '6 Months' },
  { value: 'browsing', label: '👀 Just Looking' },
];
const PERSONALITIES = [
  { value: 'family',        label: '👨‍👩‍👧 Family' },
  { value: 'investor',      label: '📈 Investor' },
  { value: 'expat',         label: '🌍 Expat' },
  { value: 'retiree',       label: '🌴 Retiree' },
  { value: 'digital_nomad', label: '💻 Digital Nomad' },
];
const CONTACT_PREFS = [
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'call',     label: '📞 Call' },
  { value: 'line',     label: '🟢 LINE' },
  { value: 'email',    label: '📧 Email' },
];

export default function NewLeadModal({ agentId, onCreated, onClose }) {
  const [form, setForm] = useState({
    full_name: '', phone_number: '', budget_max: '',
    area: '', type: 'condo', intent: 'buy',
    preferred_beds: '0', timeline: '', personality: '', preferred_contact: 'whatsapp',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const lead = await createAgentLead({
        full_name:         form.full_name.trim(),
        phone_number:      form.phone_number.trim() || null,
        budget_max:        form.budget_max ? parseFloat(form.budget_max) : null,
        area:              form.area || null,
        type:              form.type || null,
        intent:            form.intent,
        preferred_beds:    form.preferred_beds ? parseInt(form.preferred_beds) : null,
        timeline:          form.timeline || null,
        personality:       form.personality || null,
        preferred_contact: form.preferred_contact || null,
      }, agentId);
      onCreated(lead);
    } catch (err) {
      setError(err.message || 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="new-lead-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Lead</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="new-lead-form">
          <input
            className="nl-input"
            placeholder="Full Name *"
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            autoFocus
          />
          <input
            className="nl-input"
            placeholder="Phone (WhatsApp)"
            type="tel"
            value={form.phone_number}
            onChange={e => set('phone_number', e.target.value)}
          />

          <div className="nl-row">
            <select className="nl-select" value={form.intent} onChange={e => set('intent', e.target.value)}>
              <option value="buy">🏠 Buy</option>
              <option value="rent">🔑 Rent</option>
              <option value="sell">💰 Sell</option>
              <option value="invest">📈 Invest</option>
            </select>
            <select className="nl-select" value={form.type} onChange={e => set('type', e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>

          <select className="nl-select full" value={form.area} onChange={e => set('area', e.target.value)}>
            <option value="">Area (where?)</option>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <div className="nl-row">
            <div className="nl-field">
              <label className="nl-label">Budget (฿)</label>
              <input
                className="nl-input"
                type="number"
                placeholder="Max budget THB"
                value={form.budget_max}
                onChange={e => set('budget_max', e.target.value)}
              />
            </div>
            <div className="nl-field">
              <label className="nl-label">Beds: {form.preferred_beds == 0 ? 'Studio' : form.preferred_beds}</label>
              <input
                type="range" min="0" max="5"
                value={form.preferred_beds}
                onChange={e => set('preferred_beds', e.target.value)}
                className="nl-range"
              />
            </div>
          </div>

          <div className="nl-section-label">Timeline</div>
          <div className="nl-chip-group">
            {TIMELINES.map(t => (
              <button
                key={t.value} type="button"
                className={`nl-chip ${form.timeline === t.value ? 'active' : ''}`}
                onClick={() => set('timeline', form.timeline === t.value ? '' : t.value)}
              >{t.label}</button>
            ))}
          </div>

          <div className="nl-section-label">Client Profile</div>
          <div className="nl-chip-group">
            {PERSONALITIES.map(p => (
              <button
                key={p.value} type="button"
                className={`nl-chip ${form.personality === p.value ? 'active' : ''}`}
                onClick={() => set('personality', form.personality === p.value ? '' : p.value)}
              >{p.label}</button>
            ))}
          </div>

          <div className="nl-section-label">Contact Preference</div>
          <div className="nl-chip-group">
            {CONTACT_PREFS.map(c => (
              <button
                key={c.value} type="button"
                className={`nl-chip ${form.preferred_contact === c.value ? 'active' : ''}`}
                onClick={() => set('preferred_contact', c.value)}
              >{c.label}</button>
            ))}
          </div>

          {error && <p className="nl-error">{error}</p>}

          <button type="submit" className="nl-submit" disabled={saving}>
            {saving ? '⏳ Creating…' : '✓ Create Lead'}
          </button>
        </form>
      </div>
    </div>
  );
}
