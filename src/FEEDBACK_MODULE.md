---
title: "Reusable Feedback Module Component Library"
project: IRES
status: active
tags: [feedback, component, ires, ui]
updated: 2026-04-23
---
# Feedback Module — Reusable Component Library

**Status:** Production-ready | **Version:** 1.0 | **Added:** 2026-03-06

Reusable feedback collection system for any app. Right-side drawer UI with form validation and error handling. Integrates agent tracking via optional `agentId` parameter.

## Files

- `hooks/useFeedback.js` — State & submission logic
- `components/FeedbackDrawer.jsx` — UI component
- `styles/FeedbackDrawer.css` — Drawer styling (animations, responsive)

## Quick Start

### 1. Import the hook and component

```jsx
import { useFeedback } from './hooks/useFeedback';
import FeedbackDrawer from './components/FeedbackDrawer';
```

### 2. Initialize in your app

```jsx
const feedback = useFeedback(handleFeedbackSubmit);

const handleFeedbackSubmit = async (feedbackData) => {
  // feedbackData = { type, content }
  // Do something with feedback (send to API, Supabase, etc)
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...feedbackData,
      agent_id: agentId,  // optional
      timestamp: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error('Feedback submission failed');
};
```

### 3. Add button to header/UI

```jsx
<button
  className="feedback-btn"
  onClick={() => feedback.setIsOpen(true)}
>
  💬 Feedback
</button>
```

### 4. Render the drawer

```jsx
<FeedbackDrawer
  isOpen={feedback.isOpen}
  onClose={() => feedback.setIsOpen(false)}
  onSubmit={(data) => feedback.handleSubmit(data)}
  isSubmitting={feedback.isSubmitting}
  error={feedback.error}
  feedbackData={feedback.feedbackData}
  onFeedbackChange={(field, value) =>
    feedback.setFeedbackData(prev => ({ ...prev, [field]: value }))
  }
/>
```

## IRES Implementation Example

See `src/App.jsx` for full implementation with agent tracking:

```jsx
const feedback = useFeedback(async (feedbackData) => {
  const { error } = await supabase.from('agent_feedback').insert([
    {
      agent_id: agentId,
      feedback_type: feedbackData.type,
      message: feedbackData.content,
      device_fingerprint: localStorage.getItem('ires_device_fingerprint'),
    },
  ]);
  if (error) throw error;
});
```

## Customization

### Change drawer width

Edit `FeedbackDrawer.css`:
```css
.feedback-drawer {
  max-width: 500px;  /* default: 360px */
}
```

### Change primary color

Replace `#de0372` (pink) with your brand color in:
- `FeedbackDrawer.css` (button background, focus outline)
- Or override via CSS variable in parent app

### Add agent name display

Pass as prop to FeedbackDrawer:
```jsx
<FeedbackDrawer
  ...
  agentName={agentName}  // add this
/>
```

Then in component:
```jsx
{agentName && (
  <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '8px' }}>
    Agent: <strong>{agentName}</strong>
  </div>
)}
```

## Feedback Data Structure

When submitting, ensure your backend table has these columns:

```sql
CREATE TABLE app_feedback (
  id BIGSERIAL PRIMARY KEY,
  agent_id TEXT,  -- optional, links to agents table
  feedback_type TEXT,  -- 'bug' | 'feature' | 'improvement' | 'other'
  message TEXT,
  device_fingerprint TEXT,  -- optional, for device tracking
  created_at TIMESTAMP DEFAULT now()
);
```

## API Binding

This module is transport-agnostic. Bind it to:
- **Supabase:** Direct insert (like IRES example)
- **REST API:** POST to `/api/feedback` endpoint
- **GraphQL:** Submit via mutation
- **Event Bus:** Emit feedback event
- **File System:** Log to file (dev/testing)

## Next Apps to Integrate

Mark feedback module implementation status:

- [ ] **FRIEND** — Phase 2 (Knowledge Forge done, n8n deploy next)
- [ ] **FIN** — Phase 2 (PWA live, needs feedback)
- [ ] **RETRO** — Phase 1 (pending scope)
- [ ] **MANGO** — Phase TBD
- [ ] **PROF** (Kevin Dashboard) — Phase TBD

## Notes

- Drawer slides from right, full-height, responsive (max 360px)
- Close via overlay click, close button, or programmatic `setIsOpen(false)`
- Form validates before submit (both fields required)
- Error handling built-in (displays error message in drawer)
- No "return" to main — just closes silently after success
- Feedback type options are hardcoded; customize in FeedbackDrawer.jsx as needed
