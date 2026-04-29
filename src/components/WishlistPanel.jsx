import { useState, useEffect } from 'react';
import { getLeadWishlist, removeFromWishlist } from '../services/leadsService';
import MlsSearchSheet from './MlsSearchSheet';
import './WishlistPanel.css';

const SITE_LABELS = {
  ddproperty:          'DDProperty',
  fazwaz:              'FazWaz',
  propertyscout:       'PropertyScout',
  hipflat:             'Hipflat',
  'thailand-property': 'Thailand Property',
};

export default function WishlistPanel({ lead, agentId }) {
  const [wishlist,    setWishlist]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showSearch,  setShowSearch]  = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getLeadWishlist(lead.lead_id);
      setWishlist(data);
    } catch (err) {
      console.error('Wishlist load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [lead.lead_id]);

  const handleRemove = async (id) => {
    try {
      await removeFromWishlist(id);
      setWishlist(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      alert('Remove failed: ' + err.message);
    }
  };

  const handleSaved = () => {
    load(); // refresh list
  };

  return (
    <div className="wishlist-panel">
      <div className="wishlist-header">
        <span className="wishlist-title">
          🏠 Wishlist {wishlist.length > 0 && <span className="wishlist-count">{wishlist.length}</span>}
        </span>
        <button className="find-btn" onClick={() => setShowSearch(true)}>
          + Find Properties
        </button>
      </div>

      {loading && <p className="wishlist-loading">Loading…</p>}

      {!loading && wishlist.length === 0 && (
        <p className="wishlist-empty">No saved properties yet — tap Find Properties to search</p>
      )}

      {wishlist.map(item => (
        <div key={item.id} className="wishlist-card">
          <div className="wc-header">
            <span className="wc-title">{item.listing_title || 'Property'}</span>
            <span className="wc-price">
              {item.price ? `฿${(item.price / 1000000).toFixed(1)}M` : '—'}
            </span>
          </div>
          <div className="wc-meta">
            <span className="wc-site">{SITE_LABELS[item.source_site] || item.source_site}</span>
            {item.area && <span>· {item.area}</span>}
            {item.beds != null && <span>· {item.beds == 0 ? 'Studio' : `${item.beds}BR`}</span>}
          </div>
          {item.agent_phone && (
            <div className="wc-agent">
              {item.agent_name && <span>👤 {item.agent_name}</span>}
              <a href={`tel:${item.agent_phone}`} className="wc-phone">📞 {item.agent_phone}</a>
            </div>
          )}
          {item.agent_note && <p className="wc-note">"{item.agent_note}"</p>}
          <div className="wc-actions">
            <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="wc-open">
              🔗 Open
            </a>
            <button className="wc-remove" onClick={() => handleRemove(item.id)}>🗑</button>
          </div>
        </div>
      ))}

      {showSearch && (
        <MlsSearchSheet
          lead={lead}
          agentId={agentId}
          onSaved={handleSaved}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}
