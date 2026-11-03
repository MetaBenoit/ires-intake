const CLOUDINARY_CLOUD  = 'dgzf3jipr';
// Photos are stored clean; the IRES logo is a per-listing choice (form tick
// box), applied as the t_ires_wm delivery transformation. Same as Desk.
const CLOUDINARY_PRESET = 'ires_clean';

export async function uploadOneImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body: fd }
  );
  if (!res.ok) throw new Error(`Cloudinary upload failed (${res.status})`);
  const data = await res.json();
  return data.secure_url;
}
