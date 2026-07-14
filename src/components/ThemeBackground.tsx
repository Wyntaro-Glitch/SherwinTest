"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

const CYBERPUNK_CHARS = "アカサタナハマヤラワ0123456789$%#@!&*:;<>";
const SAKURA_COLORS = ["#ffb7c5", "#ff9eb5", "#ff85a4", "#f8a4c8"];
const FOREST_COLORS = ["#2d8a4e", "#4ade80", "#16a34a", "#15803d", "#22c55e"];

interface Particle {
  x: number; y: number;
  size: number; speed: number; opacity: number;
  rotation: number; rotSpeed: number;
  sway: number; swaySpeed: number; phase: number;
  color: string;
}

interface MatrixDrop {
  x: number; y: number; speed: number;
  length: number; chars: string[];
  opacity: number;
}

function drawSakuraPetal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, color: string, opacity: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(size * 0.3, -size * 0.5, size * 0.7, -size * 0.3, size, 0);
  ctx.bezierCurveTo(size * 0.7, size * 0.3, size * 0.3, size * 0.5, 0, size * 0.1);
  ctx.bezierCurveTo(-size * 0.1, size * 0.05, -size * 0.05, -size * 0.05, 0, 0);
  ctx.fill();

  ctx.restore();
}

function drawMatrixChar(ctx: CanvasRenderingContext2D, char: string, x: number, y: number, size: number, opacity: number, isHead: boolean) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = `${size}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (isHead) {
    ctx.shadowColor = "#00ff41";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#ffffff";
  } else {
    ctx.fillStyle = "#00ff41";
  }
  ctx.fillText(char, x, y);
  ctx.restore();
}

function drawWave(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.save();

  const cx = w * 0.5;
  const baseY = h * 0.65;
  const scale = Math.min(w, h) / 600;
  const waveOffset = Math.sin(time * 0.3) * 8 * scale;

  // Mount Fuji silhouette (subtle)
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#60a5fa";
  ctx.beginPath();
  ctx.moveTo(w * 0.15, h * 0.75);
  ctx.lineTo(w * 0.25, h * 0.35 + Math.sin(time * 0.1) * 3);
  ctx.lineTo(w * 0.35, h * 0.75);
  ctx.closePath();
  ctx.fill();

  // Snow cap
  ctx.fillStyle = "#e0f2fe";
  ctx.beginPath();
  ctx.moveTo(w * 0.23, h * 0.42 + Math.sin(time * 0.1) * 3);
  ctx.lineTo(w * 0.25, h * 0.35 + Math.sin(time * 0.1) * 3);
  ctx.lineTo(w * 0.27, h * 0.42 + Math.sin(time * 0.1) * 3);
  ctx.closePath();
  ctx.fill();

  // Wave body
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, baseY + 40 * scale);
  ctx.bezierCurveTo(
    cx * 0.3, baseY - 60 * scale + waveOffset,
    cx * 0.5, baseY - 100 * scale + waveOffset * 1.5,
    cx * 0.7, baseY + waveOffset
  );
  ctx.bezierCurveTo(
    cx * 0.85, baseY + 30 * scale,
    cx * 0.95, baseY - 20 * scale,
    w, baseY - 10 * scale
  );
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Wave curl (the claw) — slightly more visible
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "#0ea5e9";
  ctx.beginPath();
  const curlX = cx * 0.65;
  const curlY = baseY - 90 * scale + waveOffset * 1.2;
  ctx.moveTo(curlX - 30 * scale, curlY + 20 * scale);
  ctx.bezierCurveTo(
    curlX - 10 * scale, curlY - 20 * scale,
    curlX + 20 * scale, curlY - 10 * scale,
    curlX + 5 * scale, curlY + 30 * scale
  );
  ctx.bezierCurveTo(
    curlX - 5 * scale, curlY + 40 * scale,
    curlX - 15 * scale, curlY + 35 * scale,
    curlX - 20 * scale, curlY + 25 * scale
  );
  ctx.fill();

  // Foam spray dots
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#bae6fd";
  for (let i = 0; i < 12; i++) {
    const fx = curlX + Math.sin(time * 0.5 + i * 1.7) * 18 * scale;
    const fy = curlY - 8 * scale + Math.cos(time * 0.7 + i * 2.3) * 12 * scale;
    const fs = Math.max(0.1, 1 + Math.sin(time + i) * 1.2);
    ctx.beginPath();
    ctx.arc(fx, fy, fs * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Second smaller wave
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = "#0284c7";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, baseY + 80 * scale);
  ctx.bezierCurveTo(
    cx * 0.4, baseY + 40 * scale + Math.sin(time * 0.4) * 5,
    cx * 0.8, baseY + 60 * scale + Math.cos(time * 0.3) * 5,
    w, baseY + 50 * scale
  );
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export default function ThemeBackground() {
  const { theme: rawTheme } = useTheme();
  const [theme, setTheme] = useState<"dark" | "light" | "cyberpunk" | "sakura" | "forest" | "ocean">("dark");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const dropsRef = useRef<MatrixDrop[]>([]);

  useEffect(() => {
    setTheme(rawTheme);
  }, [rawTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    let lastTime = 0;
    const FPS = 60;
    const interval = 1000 / FPS;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    if (theme === "sakura") {
      const count = 22;
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: 8 + Math.random() * 14,
        speed: 0.3 + Math.random() * 0.6,
        opacity: 0.2 + Math.random() * 0.25,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        sway: 20 + Math.random() * 40,
        swaySpeed: 0.005 + Math.random() * 0.01,
        phase: Math.random() * Math.PI * 2,
        color: SAKURA_COLORS[Math.floor(Math.random() * SAKURA_COLORS.length)],
      }));
    } else if (theme === "cyberpunk") {
      const cols = 18;
      const colWidth = canvas.width / cols;
      dropsRef.current = Array.from({ length: cols }, (_, i) => ({
        x: i * colWidth + colWidth / 2,
        y: Math.random() * canvas.height * -1,
        speed: 3 + Math.random() * 6,
        length: 8 + Math.floor(Math.random() * 12),
        chars: Array.from({ length: 20 }, () =>
          CYBERPUNK_CHARS[Math.floor(Math.random() * CYBERPUNK_CHARS.length)]
        ),
        opacity: 0.08 + Math.random() * 0.1,
      }));
    } else if (theme === "forest") {
      const count = 20;
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: 10 + Math.random() * 12,
        speed: 0.4 + Math.random() * 1.0,
        opacity: 0.15 + Math.random() * 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        sway: 15 + Math.random() * 30,
        swaySpeed: 0.008 + Math.random() * 0.016,
        phase: Math.random() * Math.PI * 2,
        color: FOREST_COLORS[Math.floor(Math.random() * FOREST_COLORS.length)],
      }));
    }

    const frame = (time: number) => {
      if (!running) return;
      const delta = time - lastTime;
      if (delta < interval) {
        animRef.current = requestAnimationFrame(frame);
        return;
      }
      lastTime = time - (delta % interval);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (theme === "ocean") {
        drawWave(ctx, canvas.width, canvas.height, time * 0.001);
      } else if (theme === "sakura" || theme === "forest") {
        const particles = particlesRef.current;
        for (const p of particles) {
          p.y += p.speed;
          p.x += Math.sin(time * p.swaySpeed + p.phase) * 0.5;
          p.rotation += p.rotSpeed;

          if (p.y > canvas.height + p.size) {
            p.y = -p.size;
            p.x = Math.random() * canvas.width;
          }
          if (p.x < -p.size * 2) p.x = canvas.width + p.size;
          if (p.x > canvas.width + p.size * 2) p.x = -p.size;

          drawSakuraPetal(ctx, p.x, p.y, p.size, p.rotation, p.color, p.opacity);
        }
      } else if (theme === "cyberpunk") {
        const drops = dropsRef.current;

        for (const drop of drops) {
          drop.y += drop.speed;
          if (drop.y - drop.length * 18 > canvas.height) {
            drop.y = -drop.length * 18;
            drop.x = (Math.floor(Math.random() * drops.length)) * (canvas.width / drops.length) + (canvas.width / drops.length) / 2;
          }

          for (let i = 0; i < drop.length; i++) {
            const cy = drop.y - i * 16;
            if (cy < -16 || cy > canvas.height) continue;
            const ci = Math.floor((time * 0.01 + i) % drop.chars.length);
            const char = drop.chars[ci];
            const isHead = i === 0;
            const fade = isHead ? 1 : Math.max(0.1, 1 - i / drop.length);
            drawMatrixChar(ctx, char, drop.x, cy, 12, drop.opacity * fade, isHead);
          }
        }
      }

      animRef.current = requestAnimationFrame(frame);
    };

    animRef.current = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [theme]);

  if (theme === "dark" || theme === "light") return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
