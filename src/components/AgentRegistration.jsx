import { useState } from 'react';
import '../styles/AgentRegistration.css';

export default function AgentRegistration({ onRegister, isLoading, error, agentNames }) {
  const [selectedName, setSelectedName] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedName.trim() && password.trim()) {
      onRegister(selectedName.trim(), password);
    }
  };

  const handleNameClick = (name) => {
    setSelectedName(name);
    // Focus password field automatically
    setTimeout(() => document.getElementById('ires-password-input')?.focus(), 0);
  };

  return (
    <div className="agent-registration-overlay">
      <div className="agent-registration-modal">
        <div className="registration-header">
          <h2>Agent Login</h2>
          <p>Select your name and enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="registration-form">
          <label>Agent Name *</label>

          {agentNames.length > 0 && (
            <div className="agent-suggestions">
              <div className="suggestions-list">
                {agentNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`suggestion-btn ${selectedName === name ? 'selected' : ''}`}
                    onClick={() => handleNameClick(name)}
                    disabled={isLoading}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label>Password *</label>
          <input
            id="ires-password-input"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoFocus
            required
          />

          {error && <div className="registration-error">❌ {error}</div>}

          <button
            type="submit"
            disabled={isLoading || !selectedName.trim() || !password.trim()}
            className="registration-submit"
          >
            {isLoading ? '⏳ Verifying...' : 'Login'}
          </button>
        </form>

        <p className="registration-note">
          This device will be remembered after login.
        </p>
      </div>
    </div>
  );
}
