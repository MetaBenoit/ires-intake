import { useState, useEffect } from 'react';
import { supabase } from '../services/notes';

const AGENT_STORAGE_KEY = 'ires_agent_id';
const DEVICE_FINGERPRINT_KEY = 'ires_device_fingerprint';
const APP_CONTEXT = 'pwa';

function generateDeviceFingerprint() {
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userAgent = navigator.userAgent;
  return `${screenResolution}|${timezone}|${userAgent}`.substring(0, 255);
}

/**
 * Hook for agent authentication with password + device lock
 * - First load: shows login modal with name selector + password
 * - Verifies password server-side via ires_verify_agent RPC
 * - Stores agent_id + device fingerprint in localStorage
 * - Subsequent loads: auto-login via ires_check_device_session RPC
 * - Returns { agentId, agentName, isLoading, error, registerAgent, logout, deviceFingerprint }
 */
export function useAgentAuth() {
  const [agentId, setAgentId] = useState(null);
  const [agentName, setAgentName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceFingerprint] = useState(() => generateDeviceFingerprint());

  // Boot: check for existing device session
  useEffect(() => {
    const initAgent = async () => {
      try {
        const storedAgentId = localStorage.getItem(AGENT_STORAGE_KEY);
        const storedFingerprint = localStorage.getItem(DEVICE_FINGERPRINT_KEY);

        // Only attempt auto-login if localStorage has matching fingerprint
        if (storedAgentId && storedFingerprint === deviceFingerprint) {
          const { data, error: rpcErr } = await supabase.rpc('ires_check_device_session', {
            p_agent_id:    parseInt(storedAgentId),
            p_fingerprint: deviceFingerprint,
            p_app_context: APP_CONTEXT,
          });

          if (!rpcErr && data) {
            setAgentId(storedAgentId);
            setAgentName(data.agent_name);
            setIsLoading(false);
            return;
          }

          // Session not found in DB — clear stale localStorage
          localStorage.removeItem(AGENT_STORAGE_KEY);
          localStorage.removeItem(DEVICE_FINGERPRINT_KEY);
        }

        // No valid session — show login modal
        setIsLoading(false);
      } catch (err) {
        console.error('Agent init error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initAgent();
  }, [deviceFingerprint]);

  /**
   * Authenticate agent with password
   * @param {string} name - Agent name
   * @param {string} password - Agent password
   */
  const registerAgent = async (name, password) => {
    setError(null);
    setIsLoading(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('ires_verify_agent', {
        p_name:        name.trim(),
        p_password:    password,
        p_fingerprint: deviceFingerprint,
        p_app_context: APP_CONTEXT,
      });

      if (rpcErr) throw new Error(rpcErr.message);
      if (!data) throw new Error('Invalid name or password');

      localStorage.setItem(AGENT_STORAGE_KEY, data.id.toString());
      localStorage.setItem(DEVICE_FINGERPRINT_KEY, deviceFingerprint);

      setAgentId(data.id.toString());
      setAgentName(data.agent_name);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout: delete device session from DB and clear localStorage
   */
  const logout = async () => {
    const storedAgentId = localStorage.getItem(AGENT_STORAGE_KEY);
    if (storedAgentId) {
      // Fire-and-forget: delete device session from DB
      await supabase.rpc('ires_logout_device', {
        p_agent_id:    parseInt(storedAgentId),
        p_fingerprint: deviceFingerprint,
        p_app_context: APP_CONTEXT,
      }).catch(err => console.error('Logout RPC error (non-fatal):', err));
    }
    localStorage.removeItem(AGENT_STORAGE_KEY);
    localStorage.removeItem(DEVICE_FINGERPRINT_KEY);
    setAgentId(null);
    setAgentName(null);
  };

  return {
    agentId,
    agentName,
    isLoading,
    error,
    registerAgent,
    logout,
    deviceFingerprint,
  };
}
