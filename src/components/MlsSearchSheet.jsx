import { useState } from 'react';
import { searchMLS, addToWishlist } from '../services/leadsService';
import './MlsSearchSheet.css';

const AREAS = ['Jomtien', 'Pratumnak', 'Na Kluea', 'Wongamat', 'Central Pattaya', 'East Pattaya', 'Bang Saray'];
const SITE_LABELS = {
  ddproperty:       'DDProperty',
  fazwaz:           'FazWaz',
  propertyscout:    'PropertyScout',
  hipflat:          'Hipflat',
  'thailand-property': 'Thailand Property',
};

function ScoreBar({ score }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 80 ? '#22c55e' : pct >= 55 ? '#f59e0b' : '#94a3b8';
  return (
    <div className="score-bar-wrap">
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="score-label" style={{ color }}>{pct}%</span>
    </div>
  );
}

export default function MlsSearchSheet({ lead, agentId, onSaved, onClose }) {
  const [criteria, setCriteria] = useState({
    area:       lead?.area       || '',
    type:       lead?.type_normalized || lead?.type || 'condo',
    deal:       lead?.intent_normalized === 'rent' ? 'rent' : 'sell',
    budget_max: lead?.budget_max || '',
    beds:       lead?.preferred_beds ?? 0,
  });
  const [results,     setResults]     = useState(null);
  const [searching,   setSearching]   = useState(false);
  const [deepSearch,  setDeepSearch]  = useState(false);
  const [saved,       setSaved]       = useState(new Set());
  const [error,       setError]       = useState(null);

  const set = (k, v) => setCriteria(prev => ({ ...prev, [k]: v }));

  const handleSearch = async () => {
    if (!criteria.area && !criteria.type) {
      setError('Enter at least area or type');
      return;
    }
    const params = { ...criteria, budget_max: criteria.budget_max ? Number(criteria.budget_max) : null };
    setSearching(true);
    setDeepSearch(false);
    setError(null);
    setResults(null);

    try {
      // Punch 1 — fast: top 2 sites only
      const fast = await searchMLS({ ...params, sites: ['ddproperty.com', 'fazwaz.com'] });
      setResults(fast.listings || []);
      setSearching(false);

      // Punch 2 — full: all 5 sites
      setDeepSearch(true);
      const full = await searchMLS(params);
      setResults(full.listings || []);
    } catch (err) {
      setError(err.message || 'Search failed');
    } finally {
      setSearching(false);
      setDeepSearch(false);
    }
  };

  const handleSave = async (listing) => {
    try {
      await addToWishlist({
        lead_id:       lead.lead_id,
        source_site:   listing.source_site,
        source_url:    listing.source_url,
        listing_title: listing.listing_title,
        price:         listing.price,
        beds:          listing.beds,
        area:          listing.area,
        agent_name:    listing.agent_name,
        agent_phone:   listing.agent_phone,
        saved_by:      agentId,
      });
      setSaved(prev => new Set([...prev, listing.source_url]));
      onSaved?.();
    } catch (err) {
      alert('Could not save: ' + err.message);
    }
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="mls-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h3>Find Properties {lead?.full_name ? `for ${lead.full_name.split(' ')[0]}` : ''}</h3>
          <button className="sheet-close" onClick={onClose}>✕</button>
        </div>

        {/* Criteria */}
        <div className="sheet-criteria">
          <div className="criteria-row">
            <select className="c-select" value={criteria.area} onChange={e => set('area', e.target.value)}>
              <option value="">Any area</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select className="c-select" value={criteria.type} onChange={e => set('type', e.target.value)}>
              {['condo','house','land','villa','townhouse'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <select className="c-select" value={criteria.deal} onChange={e => set('deal', e.target.value)}>
              <option value="sell">Buy</option>
              <option value="rent">Rent</option>
            </select>
          </div>
          <div className="criteria-row">
            <input
              className="c-input"
              type="number"
              placeholder="Max budget ฿"
              value={criteria.budget_max}
              onChange={e => set('budget_max', e.target.value)}
            />
            <div className="beds-control">
              <span className="beds-label">Beds: {criteria.beds == 0 ? 'Any' : criteria.beds}</span>
              <input type="range" min="0" max="5" value={criteria.beds}
                onChange={e => set('beds', parseInt(e.target.value))} className="beds-range" />
            </div>
          </div>
          <button
            className="search-btn"
            onClick={handleSearch}
            disabled={searching || deepSearch}
          >
            {searching ? '⏳ Searching DDProperty, FazWaz…' : deepSearch ? '⏳ Expanding to 5 sites…' : '🔍 Search'}
          </button>
          {error && <p className="sheet-error">{error}</p>}
        </div>

        {/* Results */}
        <div className="sheet-results">
          {searching && (
            <div className="search-spinner">
              <div className="spinner" />
              <p>Scanning DDProperty &amp; FazWaz…</p>
            </div>
          )}
          {deepSearch && (
            <div className="search-spinner">
              <div className="spinner" />
              <p>Expanding to 3 more sites…</p>
            </div>
          )}

          {results !== null && results.length === 0 && (
            <div className="no-results">No matches found — try wider criteria</div>
          )}

          {results?.map((listing, i) => {
            const isSaved = saved.has(listing.source_url);
            return (
              <div key={i} className={`result-card ${isSaved ? 'is-saved' : ''}`}>
                <div className="result-header">
                  <div className="result-title">{listing.listing_title || 'Property Listing'}</div>
                  <div className="result-price">
                    {listing.price ? `฿${(listing.price / 1000000).toFixed(1)}M` : '—'}
                  </div>
                </div>
                <ScoreBar score={listing.match_score || 0} />
                <div className="result-meta">
                  <span className="result-site">{SITE_LABELS[listing.source_site] || listing.source_site}</span>
                  {listing.area && <span>· {listing.area}</span>}
                  {listing.beds != null && <span>· {listing.beds == 0 ? 'Studio' : `${listing.beds}BR`}</span>}
                  {listing.sq_m && <span>· {listing.sq_m}m²</span>}
                </div>
                {(listing.agent_name || listing.agent_phone) && (
                  <div className="result-agent">
                    {listing.agent_name && <span>👤 {listing.agent_name}</span>}
                    {listing.agent_phone && (
                      <a href={`tel:${listing.agent_phone}`} className="agent-phone">
                        📞 {listing.agent_phone}
                      </a>
                    )}
                    {listing.agency_name && <span className="agency">· {listing.agency_name}</span>}
                  </div>
                )}
                <div className="result-actions">
                  <a href={listing.source_url} target="_blank" rel="noopener noreferrer" className="btn-open">
                    🔗 Open
                  </a>
                  {lead && (
                    <button
                      className={`btn-save ${isSaved ? 'saved' : ''}`}
                      onClick={() => handleSave(listing)}
                      disabled={isSaved}
                    >
                      {isSaved ? '✅ Saved' : '📌 Save for ' + (lead.full_name?.split(' ')[0] || 'Lead')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
