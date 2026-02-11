import React, { useRef, useEffect } from 'react';

const BouncingBalls = ({ isScattering }) => {
  const canvasRef = useRef(null);
  const scatteringRef = useRef(isScattering);
  useEffect(() => { scatteringRef.current = isScattering; }, [isScattering]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let balls = [];
    const colors = ['#E84E36', '#DCD6F7', '#1A1917', '#B54632'];
    const initBalls = () => {
      balls = [];
      for (let i = 0; i < 20; i++) {
        const radius = Math.random() * 6 + 4;
        balls.push({
          x: Math.random() * (canvas.width - radius * 2) + radius,
          y: Math.random() * (canvas.height - radius * 2) + radius,
          dx: (Math.random() - 0.5) * 3, dy: (Math.random() - 0.5) * 3, radius,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; initBalls(); }
    };
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      balls.forEach(ball => {
        if (scatteringRef.current) {
          const angle = Math.atan2(ball.y - canvas.height / 2, ball.x - canvas.width / 2);
          ball.x += Math.cos(angle) * 25; ball.y += Math.sin(angle) * 25;
        } else {
          ball.x += ball.dx; ball.y += ball.dy;
          if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) ball.dx = -ball.dx;
          if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) ball.dy = -ball.dy;
        }
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color; ctx.fill(); ctx.closePath();
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    window.addEventListener('resize', resize); resize(); animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationFrameId); };
  }, []);
  return <canvas ref={canvasRef} className="w-full h-full opacity-60 block" />;
};

export default BouncingBalls;
