import '../styles/FeedbackDrawer.css';

/**
 * Reusable Feedback Drawer Component
 *
 * A right-side drawer panel for collecting user/agent feedback
 * Integrates into any app via simple props
 *
 * Props:
 * - isOpen: Boolean - whether drawer is visible
 * - onClose: Function - callback to close drawer
 * - onSubmit: Function - callback handling form submission
 *            receives { type, content }
 * - isSubmitting: Boolean - loading state during submission
 * - error: String - error message to display
 * - feedbackData: Object - { type, content }
 * - onFeedbackChange: Function - (field, value) callback for field changes
 *
 * Example usage:
 * <FeedbackDrawer
 *   isOpen={feedback.isOpen}
 *   onClose={() => feedback.setIsOpen(false)}
 *   onSubmit={handleFeedbackSubmit}
 *   isSubmitting={feedback.isSubmitting}
 *   error={feedback.error}
 *   feedbackData={feedback.feedbackData}
 *   onFeedbackChange={(field, value) =>
 *     feedback.setFeedbackData(prev => ({ ...prev, [field]: value }))
 *   }
 * />
 */
export default function FeedbackDrawer({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  feedbackData,
  onFeedbackChange,
}) {
  if (!isOpen) return null;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!feedbackData.type || !feedbackData.content.trim()) {
      alert('❌ Please fill in all fields');
      return;
    }
    onSubmit(feedbackData);
  };

  return (
    <div className="feedback-drawer-overlay" onClick={onClose}>
      <div className="feedback-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}>✕</button>
        <form className="feedback-form" onSubmit={handleFormSubmit}>
          <label>Type *</label>
          <select
            className="feedback-select"
            value={feedbackData.type}
            onChange={(e) => onFeedbackChange('type', e.target.value)}
            disabled={isSubmitting}
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
            onChange={(e) => onFeedbackChange('content', e.target.value)}
            disabled={isSubmitting}
            required
          ></textarea>

          {error && <div className="feedback-error">❌ {error}</div>}

          <button type="submit" className="feedback-submit" disabled={isSubmitting}>
            {isSubmitting ? '⏳' : '✓ Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
