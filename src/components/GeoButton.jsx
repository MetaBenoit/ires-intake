export default function GeoButton({ lat, lng, isLocating, geoError, onLocate, onChange }) {
  return (
    <>
      <button
        type="button"
        className={`geo-btn ${lat ? 'active' : ''}`}
        onClick={onLocate}
        disabled={isLocating}
      >
        {isLocating ? '⌛ Locating...' : lat ? '📍 Location Updated' : '📍 Add Location'}
      </button>

      {geoError && <p className="geo-error">{geoError}</p>}

      {lat && (
        <div className="row geo-inputs">
          <input name="lat" placeholder="Latitude"  onChange={onChange} value={lat} />
          <input name="lng" placeholder="Longitude" onChange={onChange} value={lng} />
        </div>
      )}
    </>
  );
}
