import { useState } from 'react';

/**
 * Reusable feedback hook for any app
 * Manages feedback state and submission
 *
 * Usage:
 * const feedback = useFeedback(onSubmitCallback);
 *
 * @param {Function} onSubmit - Async callback to handle feedback submission
 *                               receives { type, content, agentId, deviceFingerprint }
 * @returns {Object} Feedback state and handlers
 */
export function useFeedback(onSubmit) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ type: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (payload) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(payload);
      setFeedbackData({ type: '', content: '' });
      setIsOpen(false);
    } catch (err) {
      console.error('Feedback submission error:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    feedbackData,
    setFeedbackData,
    isSubmitting,
    error,
    handleSubmit,
  };
}
