import { useState, useEffect } from 'react';
import { supabase } from '../services/notes';

const CATEGORY_ICON = { Condo: '🏢', House: '🏠', Land: '🌿', Project: '🏗️', Business: '💼' };
const DEAL_COLOR = { Sell: '#de0372', Rent: '#0369a1' };

function formatPrice(price, deal) {
  if (!price) return '—';
  const n = Number(price);
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `฿${(n / 1_000).toFixed(0)}K`;
  return `฿${n.toLocaleString()}`;
}


export default function MyPropertiesTab() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDeal, setFilterDeal] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        console.log('🔍 Fetching properties from Supabase...');
        const { data, error } = await supabase
          .from('properties')
          .select('property_id, property_name, category, deal, area, price, rent, beds, baths, sq_m, status, availability_status, shopify_id, shopify_handle, images')
          .eq('status', 'active')
          .eq('availability_status', 'available')
          .order('property_name', { ascending: true });

        if (error) {
          console.error('❌ Supabase error:', error);
          throw error;
        }
        console.log(`✓ Loaded ${data?.length || 0} active properties`);
        console.log('Sample data:', data?.[0]);
        setProperties(data || []);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError(`Failed to load properties: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const filtered = properties.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.property_name?.toLowerCase().includes(q) ||
      p.area?.toLowerCase().includes(q) ||
      p.property_id?.toLowerCase().includes(q);
    const matchDeal = !filterDeal || p.deal === filterDeal;
    const matchCat  = !filterCategory || p.category === filterCategory;
    return matchSearch && matchDeal && matchCat;
  });

  if (loading) return <div className="skeleton-loader">Loading properties…</div>;
  if (error)   return <div className="error-message">{error}</div>;

  return (
    <div className="properties-tab">
      {/* Filters */}
      <div className="props-filters">
        <input
          className="props-search"
          placeholder="Search name, area, ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="props-selects">
          <select
            className="props-select"
            value={filterDeal}
            onChange={e => setFilterDeal(e.target.value)}
          >
            <option value="">All deals</option>
            <option value="Sell">Sell</option>
            <option value="Rent">Rent</option>
          </select>
          <select
            className="props-select"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All types</option>
            <option value="Condo">Condo</option>
            <option value="House">House</option>
            <option value="Land">Land</option>
            <option value="Project">Project</option>
            <option value="Business">Business</option>
          </select>
        </div>
        <p className="props-count">{filtered.length} listings</p>
      </div>

      {/* Property cards */}
      <div className="props-list">
        {filtered.length === 0 ? (
          <div className="empty-state"><p>No properties match your filters</p></div>
        ) : (
          filtered.map(p => {
            const icon    = CATEGORY_ICON[p.category] || '🏠';
            const price   = p.deal === 'Rent' ? formatPrice(p.rent, p.deal) : formatPrice(p.price, p.deal);
            const dealClr = DEAL_COLOR[p.deal] || '#888';
            const heroImg = Array.isArray(p.images) && p.images.length > 0
              ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0]?.url || p.images[0]?.src)
              : null;
            const isOpen  = expandedId === p.property_id;

            return (
              <div
                key={p.property_id}
                className={`prop-card ${isOpen ? 'expanded' : ''}`}
                onClick={() => setExpandedId(isOpen ? null : p.property_id)}
              >
                <div className="prop-row">
                  {heroImg ? (
                    <img src={heroImg} className="prop-thumb" alt="" />
                  ) : (
                    <div className="prop-thumb-placeholder">{icon}</div>
                  )}
                  <div className="prop-info">
                    <div className="prop-title">
                      <span className="prop-name">{p.property_name}</span>
                      <span className="prop-deal" style={{ color: dealClr }}>{p.deal}</span>
                    </div>
                    <div className="prop-meta">
                      <span>{icon} {p.category}</span>
                      {p.area && <span>📍 {p.area}</span>}
                    </div>
                    <div className="prop-price">{price}</div>
                  </div>
                </div>

                {isOpen && (
                  <div className="prop-details">
                    {heroImg && (
                      <img src={heroImg} className="prop-hero" alt={p.property_name} />
                    )}
                    <div className="prop-detail-grid">
                      <div><label>ID</label><p>{p.property_id}</p></div>
                      {p.beds != null && <div><label>Beds</label><p>{p.beds === 0 ? 'Studio' : p.beds}</p></div>}
                      {p.baths != null && <div><label>Baths</label><p>{p.baths}</p></div>}
                      {p.sq_m != null && <div><label>Size</label><p>{p.sq_m} m²</p></div>}
                      {p.area && <div><label>Area</label><p>{p.area}</p></div>}
                    </div>
                    {p.shopify_handle && (
                      <a
                        href={`https://iresthailand.com/products/${p.shopify_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="view-website-btn"
                      >
                        🌐 View online
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
