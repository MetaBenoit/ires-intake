import { useState } from 'react';

const INITIAL_FORM = {
  property_name: '',
  category: 'Condo',
  deal: 'Sell',
  price: '',
  beds: 0,
  baths: 1,
  sq_m: '',
  sq_w: '',
  agent_notes: '',
  lat: '',
  lng: '',
};

const EMPTY_IMAGES = [null, null, null, null, null, null];

export function usePropertyForm() {
  const [formData, setFormData]     = useState(INITIAL_FORM);
  const [images, setImages]         = useState(EMPTY_IMAGES);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError]     = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSlotChange = (index, e) => {
    const file = e.target.files[0] || null;
    setImages(prev => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  };

  const clearSlot = (index) => {
    setImages(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const getGeoLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation not supported.');
      return;
    }
    setIsLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        }));
        setIsLocating(false);
      },
      (error) => {
        console.error('Location access error:', error);
        setIsLocating(false);
        setGeoError('Could not get location — check permissions or enter manually.');
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  };

  const reset = () => {
    setFormData(INITIAL_FORM);
    setImages(EMPTY_IMAGES);
  };

  return {
    formData,
    images,
    isLocating,
    geoError,
    handleChange,
    handleSlotChange,
    clearSlot,
    getGeoLocation,
    reset,
  };
}
