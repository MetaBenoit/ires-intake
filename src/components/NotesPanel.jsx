import { useState, useEffect } from 'react';
import { getNotes, addNote, IRES_PWA_AGENTS } from '../services/notes';

const NOTE_TYPE_LABELS = { note: '', bug: '🐛', feature: '✨', feedback: '💬' };

function NotesPanel({ contextId, contextType = 'property_id', author = null, showTypes = false }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAuthor, setSelectedAuthor] = useState(author || '');

  // Restore author from localStorage on mount
  useEffect(() => {
    const savedAuthor = localStorage.getItem('ires-pwa-author');
    if (savedAuthor) setSelectedAuthor(savedAuthor);
  }, []);

  // Load notes on mount and when contextId changes
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getNotes(contextType, contextId);
        setNotes(data);
      } catch (err) {
        setError('Failed to load notes');
        console.error('Error loading notes:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [contextId, contextType]);

  const handleAuthorChange = (e) => {
    const author = e.target.value;
    setSelectedAuthor(author);
    localStorage.setItem('ires-pwa-author', author);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newContent.trim() || !selectedAuthor) return;

    setSubmitting(true);
    try {
      const newNote = await addNote({
        context: contextType,
        context_id: contextId,
        author: selectedAuthor,
        type: noteType,
        content: newContent.trim()
      });
      setNotes([newNote, ...notes]);
      setNewContent('');
      setError(null);
    } catch (err) {
      setError('Failed to save note');
      console.error('Error adding note:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="notes-panel">
      <div className="notes-header">
        <h3>📝 Notes</h3>
        <span className="notes-count">{notes.length}</span>
      </div>

      {error && <div className="notes-error">{error}</div>}

      {loading ? (
        <div className="notes-loading">Loading notes…</div>
      ) : notes.length === 0 ? (
        <div className="notes-empty">No notes yet</div>
      ) : (
        <div className="notes-list">
          {notes.map((note) => (
            <div key={note.id} className={`note-item${note.resolved ? ' note-resolved' : ''}`}>
              <div className="note-header">
                <span className="note-author">
                  {NOTE_TYPE_LABELS[note.type] ? `${NOTE_TYPE_LABELS[note.type]} ` : ''}{note.author}
                </span>
                <span className="note-time">
                  {new Date(note.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <p className="note-content">{note.content}</p>
            </div>
          ))}
        </div>
      )}

      <form className="notes-form" onSubmit={handleAddNote}>
        <div className="notes-form-row">
          <select
            value={selectedAuthor}
            onChange={handleAuthorChange}
            className="notes-select"
            required
          >
            <option value="">Select your name…</option>
            {IRES_PWA_AGENTS.map((agent) => (
              <option key={agent} value={agent}>{agent}</option>
            ))}
          </select>
          {showTypes && (
            <select
              value={noteType}
              onChange={e => setNoteType(e.target.value)}
              className="notes-select notes-type-select"
            >
              <option value="note">Note</option>
              <option value="bug">🐛 Bug</option>
              <option value="feature">✨ Feature</option>
              <option value="feedback">💬 Feedback</option>
            </select>
          )}
        </div>

        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Add a note…"
          className="notes-textarea"
          rows={2}
        />

        <button
          type="submit"
          disabled={!newContent.trim() || !selectedAuthor || submitting}
          className="notes-submit"
        >
          {submitting ? 'Saving…' : 'Add Note'}
        </button>
      </form>
    </div>
  );
}

export default NotesPanel;
