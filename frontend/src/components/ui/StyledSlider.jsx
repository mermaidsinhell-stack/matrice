import React from 'react';
import { getSliderStyle } from '../../utils/sliderStyles';

const StyledSlider = ({ min, max, step = 1, value, onChange, size = "sm" }) => {
  const thumbClass = size === "lg"
    ? "[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5"
    : "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4";
  const trackHeight = size === "lg" ? "h-3" : "h-2";

  return (
    <input
      type="range" min={min} max={max} step={step}
      value={typeof value === 'number' ? value : min}
      onChange={onChange}
      style={getSliderStyle(value, min, max)}
      className={`w-full ${trackHeight} appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none ${thumbClass} [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#E84E36] [&::-webkit-slider-thumb]:shadow-sm hover:[&::-webkit-slider-thumb]:scale-110 transition-all`}
    />
  );
};

export default StyledSlider;
