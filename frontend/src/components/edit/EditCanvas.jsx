import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Undo2, Trash2, Eye, EyeOff } from 'lucide-react';

const EditCanvas = ({ imageUrl, brushSize, isInpaintMode, onMaskChange }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const [history, setHistory] = useState([]);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });

  // Load image and set canvas dimensions to match
  useEffect(() => {
    if (!imageUrl || !containerRef.current) return;
    const img = new Image();
    img.onload = () => {
      const container = containerRef.current;
      if (!container) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const scale = Math.min(cw / img.width, ch / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const ox = Math.round((cw - w) / 2);
      const oy = Math.round((ch - h) / 2);
      setImgDimensions({ width: w, height: h, offsetX: ox, offsetY: oy, naturalWidth: img.width, naturalHeight: img.height });

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.left = `${ox}px`;
        canvas.style.top = `${oy}px`;
        // Clear canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
    return { x, y };
  }, []);

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-20), data]); // Keep last 20 states
  }, []);

  const startDraw = useCallback((e) => {
    if (!isInpaintMode) return;
    e.preventDefault();
    saveHistory();
    setIsDrawing(true);
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(232, 78, 54, 0.5)';
    ctx.fill();
  }, [isInpaintMode, brushSize, getPos, saveHistory]);

  const draw = useCallback((e) => {
    if (!isDrawing || !isInpaintMode) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(232, 78, 54, 0.5)';
    ctx.fill();
  }, [isDrawing, isInpaintMode, brushSize, getPos]);

  const endDraw = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    // Export mask as base64
    exportMask();
  }, [isDrawing]);

  const exportMask = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgDimensions.naturalWidth) return;
    // Create a temp canvas at natural image size with white=masked, black=unmasked
    const temp = document.createElement('canvas');
    temp.width = imgDimensions.naturalWidth;
    temp.height = imgDimensions.naturalHeight;
    const tctx = temp.getContext('2d');
    tctx.fillStyle = '#000000';
    tctx.fillRect(0, 0, temp.width, temp.height);

    // Scale mask data to natural size
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const scaleX = imgDimensions.naturalWidth / canvas.width;
    const scaleY = imgDimensions.naturalHeight / canvas.height;

    // Draw scaled white circles where mask exists
    tctx.fillStyle = '#FFFFFF';
    for (let py = 0; py < canvas.height; py++) {
      for (let px = 0; px < canvas.width; px++) {
        const idx = (py * canvas.width + px) * 4;
        if (data.data[idx + 3] > 10) { // Any non-transparent pixel
          tctx.fillRect(Math.floor(px * scaleX), Math.floor(py * scaleY), Math.ceil(scaleX), Math.ceil(scaleY));
        }
      }
    }

    const maskBase64 = temp.toDataURL('image/png');
    onMaskChange?.(maskBase64);
  }, [imgDimensions, onMaskChange]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.putImageData(prev, 0, 0);
      setHistory((h) => h.slice(0, -1));
      exportMask();
    }
  }, [history, exportMask]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveHistory();
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onMaskChange?.(null);
  }, [saveHistory, onMaskChange]);

  // Brush cursor
  const cursorStyle = isInpaintMode
    ? { cursor: 'none' }
    : {};

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {/* Source image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Edit Target"
          className="absolute max-w-full max-h-full object-contain"
          style={{ left: imgDimensions.offsetX, top: imgDimensions.offsetY, width: imgDimensions.width, height: imgDimensions.height }}
          draggable={false}
        />
      )}

      {/* Canvas overlay for mask painting */}
      {isInpaintMode && (
        <canvas
          ref={canvasRef}
          className="absolute z-10"
          style={{ ...cursorStyle, opacity: showMask ? 1 : 0, transition: 'opacity 0.2s' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      )}

      {/* Inpaint toolbar */}
      {isInpaintMode && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-[#E5E5E5] shadow-md p-1">
          <button
            onClick={() => setShowMask(!showMask)}
            className="p-2 text-[#888] hover:text-[#E84E36] transition-colors"
            title={showMask ? 'Hide Mask' : 'Show Mask'}
          >
            {showMask ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            onClick={undo}
            disabled={history.length === 0}
            className="p-2 text-[#888] hover:text-[#E84E36] transition-colors disabled:opacity-30"
            title="Undo"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={clearCanvas}
            className="p-2 text-[#888] hover:text-[#E84E36] transition-colors"
            title="Clear Mask"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Custom brush cursor */}
      {isInpaintMode && (
        <div
          className="pointer-events-none fixed z-50 border-2 border-[#E84E36] rounded-full mix-blend-difference"
          style={{
            width: brushSize,
            height: brushSize,
            transform: 'translate(-50%, -50%)',
            display: isDrawing ? 'block' : 'none',
          }}
          id="brush-cursor"
        />
      )}
    </div>
  );
};

export default EditCanvas;
