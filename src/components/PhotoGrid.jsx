const MAX_IMAGES = 6;

export default function PhotoGrid({ images, onSlotChange, onClearSlot }) {
  const filledCount = images.filter(Boolean).length;

  return (
    <>
      <div className="photo-section-label">
        📷 Photos ({filledCount}/{MAX_IMAGES})
      </div>
      <div className="photo-grid">
        {images.map((file, i) => (
          <label key={i} className={`photo-slot ${file ? 'filled' : ''}`}>
            {file ? (
              <>
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Photo ${i + 1}`}
                  className="photo-thumb"
                />
                <button
                  type="button"
                  className="photo-clear"
                  onClick={(e) => { e.preventDefault(); onClearSlot(i); }}
                >✕</button>
              </>
            ) : (
              <span className="photo-slot-empty">+</span>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onSlotChange(i, e)}
              style={{ display: 'none' }}
            />
          </label>
        ))}
      </div>
    </>
  );
}
