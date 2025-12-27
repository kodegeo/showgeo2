// frontend/src/components/streaming/ScreensaverPlayer.tsx
import { useEffect, useRef } from "react";

export function ScreensaverPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Animated gradient background
    let animationFrame: number;
    let time = 0;

    const animate = () => {
      time += 0.01;
      
      // Create animated gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const hue = (time * 50) % 360;
      gradient.addColorStop(0, `hsl(${hue}, 70%, 20%)`);
      gradient.addColorStop(0.5, `hsl(${(hue + 60) % 360}, 70%, 15%)`);
      gradient.addColorStop(1, `hsl(${(hue + 120) % 360}, 70%, 20%)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add subtle pulsing circles
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 100 + Math.sin(time * 2) * 20;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + Math.sin(time) * 0.02})`;
      ctx.fill();

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      <div className="relative z-10 text-center">
        <div className="text-6xl mb-4 animate-pulse">⏸</div>
        <p className="text-gray-400 text-lg font-semibold uppercase tracking-wide">
          Stream Paused
        </p>
        <p className="text-gray-500 text-sm mt-2">
          The broadcaster will resume shortly
        </p>
      </div>
    </div>
  );
}

