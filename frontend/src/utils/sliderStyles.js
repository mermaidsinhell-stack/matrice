export const getSliderStyle = (value, min, max) => {
  let v = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(v)) v = min;
  v = Math.max(min, Math.min(max, v));
  const percent = ((v - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(to right, #E84E36 0%, #E84E36 ${percent}%, #E5E5E5 ${percent}%, #E5E5E5 100%)`,
  };
};
