export async function submitProperty(formData, imageUrls, agentId) {
  const webhookUrl = import.meta.env.VITE_WEBHOOK_URL || '/api/intake';

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...formData, imageUrls, agent_id: agentId }),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status} — ${response.statusText}`);
  }

  return response.json().catch(() => ({}));
}
