export function darkenColor(color, factor) {
  const r = Math.floor(((color >> 16) & 0xFF) * factor);
  const g = Math.floor(((color >> 8) & 0xFF) * factor);
  const b = Math.floor((color & 0xFF) * factor);
  return (r << 16) | (g << 8) | b;
}
