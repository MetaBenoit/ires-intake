import { useState, useEffect } from 'react';
import { LogoLockup } from '@metabenoit/brand-kit';
import './App.css';

import { usePropertyForm } from './hooks/usePropertyForm';
import { useAgentAuth } from './hooks/useAgentAuth';
import { uploadOneImage }  from './services/cloudinary';
import { submitProperty }  from './services/webhook';
import PhotoGrid           from './components/PhotoGrid';
import GeoButton           from './components/GeoButton';
import NotesPanel          from './components/NotesPanel';
import AgentRegistration   from './components/AgentRegistration';
import { supabase }        from './services/notes';
import HotLeadsTab         from './pages/HotLeadsTab';
import MyPropertiesTab     from './pages/MyPropertiesTab';

function App() {
  const {
    formData, images, isLocating, geoError,
    handleChange, handleSlotChange, clearSlot, getGeoLocation, reset,
  } = usePropertyForm();

  const { agentId, agentName, isLoading: agentLoading, error: agentError, registerAgent, logout } = useAgentAuth();

  const [activeTab,    setActiveTab]    = useState('submit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase,  setSubmitPhase]  = useState('');
  const [result,       setResult]       = useState(null);
  const [feedbackData, setFeedbackData] = useState({ name: '', type: '', content: '' });
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [agentNames, setAgentNames] = useState([]);

  // Fetch available agents for registration dropdown
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('agent_name')
          .eq('is_active', true)
          .order('agent_name');
        if (!error && data) {
          setAgentNames(data.map(a => a.agent_name));
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
      }
    };
    fetchAgents();
  }, []);

  // Auto-fill feedback form with agent name
  useEffect(() => {
    if (agentName) {
      setFeedbackData(prev => ({ ...prev, name: agentName }));
    }
  }, [agentName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const selectedFiles = images.filter(Boolean);
      const imageUrls = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        setSubmitPhase(`Uploading photo ${i + 1}/${selectedFiles.length}…`);
        imageUrls.push(await uploadOneImage(selectedFiles[i]));
      }

      setSubmitPhase('Saving to database…');
      const json = await submitProperty(formData, imageUrls, agentId);
      setResult(json.property_id || json.propertyId || 'Processing…');
      reset();
    } catch (error) {
      console.error('Submit error:', error);
      alert(`❌ ${error.message || 'Connection error'}`);
    } finally {
      setIsSubmitting(false);
      setSubmitPhase('');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackData.type || !feedbackData.content.trim()) {
      alert('❌ Please fill in all fields');
      return;
    }

    setFeedbackSubmitting(true);
    try {
      const { error } = await supabase.from('agent_feedback').insert([
        {
          agent_id: agentId,
          feedback_type: feedbackData.type,
          message: feedbackData.content,
          device_fingerprint: localStorage.getItem('ires_device_fingerprint'),
        },
      ]);

      if (error) throw error;
      setFeedbackData({ name: agentName, type: '', content: '' });
      setShowFeedback(false);
    } catch (error) {
      console.error('Feedback error:', error);
      alert(`❌ ${error.message}`);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // Show registration modal if no agent registered
  if (!agentLoading && !agentId) {
    return (
      <AgentRegistration
        onRegister={registerAgent}
        isLoading={agentLoading}
        error={agentError}
        agentNames={agentNames}
      />
    );
  }

  if (agentLoading) {
    return (
      <div className="app-container">
        <div className="loading-screen">Loading…</div>
      </div>
    );
  }

  // agentName is uppercase (e.g. "ZAC") — lowercase to match lead_assignments writes
  const agentKey = agentName ? agentName.toLowerCase() : null;

  return (
    <div className="app-container">
      <header className="header">
        <LogoLockup height={48} className="logo" />
        <div className="header-agent">
          <span className="agent-label">{agentName}</span>
          <button
            className="feedback-btn"
            onClick={() => setShowFeedback(true)}
            title="Share feedback"
          >
            💬
          </button>
          <button className="logout-btn" onClick={logout} title="Switch agent">✕</button>
        </div>
      </header>

      <nav className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'hot-leads' ? 'active' : ''}`}
          onClick={() => setActiveTab('hot-leads')}
        >
          🔥 Leads
        </button>
        <button
          className={`tab-btn ${activeTab === 'submit' ? 'active' : ''}`}
          onClick={() => setActiveTab('submit')}
        >
          + Property
        </button>
        <button
          className={`tab-btn ${activeTab === 'my-properties' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-properties')}
        >
          🏠 Properties
        </button>
      </nav>

      <main className="tab-content">
        {activeTab === 'hot-leads' && (
          <HotLeadsTab agentId={agentKey} agentName={agentName} />
        )}

        {activeTab === 'submit' && (
          <>
            {result && (
              <div>
                <div className="success-banner">
                  ✅ Created! <strong>ID: {result}</strong>
                  <button className="dismiss-btn" onClick={() => setResult(null)}>✕</button>
                </div>
                <NotesPanel contextId={result} contextType="property_id" />
              </div>
            )}

            <form className="intake-form" onSubmit={handleSubmit}>
              <input name="property_name" placeholder="Property Name *" onChange={handleChange} value={formData.property_name} required />

              <div className="row">
                <select name="category" onChange={handleChange} value={formData.category}>
                  <option value="Condo">Condo (C)</option>
                  <option value="House">House (H)</option>
                  <option value="Land">Land (L)</option>
                  <option value="Project">Project (P)</option>
                  <option value="Business">Business (B)</option>
                </select>
                <select name="deal" onChange={handleChange} value={formData.deal}>
                  <option value="Sell">Sell</option>
                  <option value="Rent">Rent</option>
                </select>
              </div>

              <input name="price" type="number" placeholder="Price (THB)" onChange={handleChange} value={formData.price} />

              <div className="row">
                <label>Beds: {formData.beds == 0 ? 'Studio' : formData.beds}
                  <input name="beds" type="range" min="0" max="10" onChange={handleChange} value={formData.beds} />
                </label>
                <label>Baths: {formData.baths}
                  <input name="baths" type="range" min="1" max="10" onChange={handleChange} value={formData.baths} />
                </label>
              </div>

              <div className="row">
                <input name="sq_m" type="number" placeholder="Size (sq.m)"   onChange={handleChange} value={formData.sq_m} />
                <input name="sq_w" type="number" placeholder="Size (sq.wah)" onChange={handleChange} value={formData.sq_w} />
              </div>

              <GeoButton
                lat={formData.lat}
                lng={formData.lng}
                isLocating={isLocating}
                geoError={geoError}
                onLocate={getGeoLocation}
                onChange={handleChange}
              />

              <textarea name="agent_notes" placeholder="Notes (Description)" onChange={handleChange} value={formData.agent_notes} />

              <PhotoGrid
                images={images}
                onSlotChange={handleSlotChange}
                onClearSlot={clearSlot}
              />

              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? `⏳ ${submitPhase || 'Working…'}` : 'Create Property Entry'}
              </button>
            </form>
          </>
        )}

        {activeTab === 'my-properties' && (
          <MyPropertiesTab agentId={agentKey} agentName={agentName} />
        )}
      </main>

      {showFeedback && (
        <div className="feedback-drawer-overlay" onClick={() => setShowFeedback(false)}>
          <div className="feedback-drawer" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setShowFeedback(false)}>✕</button>
            <form className="feedback-form" onSubmit={handleFeedbackSubmit}>
              <label>Type *</label>
              <select
                className="feedback-select"
                value={feedbackData.type}
                onChange={(e) => setFeedbackData({ ...feedbackData, type: e.target.value })}
                required
              >
                <option value="">Select...</option>
                <option value="bug">🐛 Bug</option>
                <option value="feature">✨ Feature</option>
                <option value="improvement">💡 Idea</option>
                <option value="other">💬 Other</option>
              </select>

              <label>Message *</label>
              <textarea
                placeholder="What's on your mind?"
                className="feedback-textarea"
                value={feedbackData.content}
                onChange={(e) => setFeedbackData({ ...feedbackData, content: e.target.value })}
                required
              ></textarea>

              <button type="submit" className="feedback-submit" disabled={feedbackSubmitting}>
                {feedbackSubmitting ? '⏳' : '✓ Send'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
