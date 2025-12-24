
import React, { useRef, useEffect } from 'react';
import { GameState, Obstacle } from '../types';

interface GameCanvasProps {
  gameState: GameState;
  targetLane: number;
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  targetLane, 
  onGameOver, 
  onScoreUpdate 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  
  // Internal Game State
  const gameRef = useRef({
    score: 0,
    playerX: 1,
    actualPlayerX: 1,
    speed: 0.055,
    obstacles: [] as Obstacle[],
    lastSpawn: 0,
    frameCount: 0,
    tilt: 0,
    particles: [] as { x: number, y: number, speed: number, length: number }[]
  });

  // --- AUDIO SYNTHESIS ---
  const initAudio = () => {
    if (audioCtxRef.current) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;
    (window as any).audioContext = ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    engineOscRef.current = osc;
    
    return { osc, gain, filter };
  };

  const playLaneShiftSound = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  };

  const playCollisionSound = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const noise = ctx.createBufferSource();
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  };

  const resetGame = () => {
    gameRef.current = {
      score: 0,
      playerX: 1,
      actualPlayerX: 1,
      speed: 0.055,
      obstacles: [],
      lastSpawn: 0,
      frameCount: 0,
      tilt: 0,
      particles: Array.from({ length: 40 }, () => ({
        x: Math.random(),
        y: Math.random(),
        speed: 0.01 + Math.random() * 0.02,
        length: 5 + Math.random() * 15
      }))
    };
    initAudio();
  };

  const animate = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const g = gameRef.current;

    // --- LOGIC ---
    if (gameState === GameState.PLAYING) {
      g.frameCount++;
      g.score += g.speed * 2;
      onScoreUpdate(g.score);

      g.speed += 0.000005;

      // Check for lane switch sound
      if (Math.abs(g.playerX - targetLane) > 0.1) {
         if (targetLane !== g.playerX) playLaneShiftSound();
      }
      g.playerX = targetLane;

      const prevX = g.actualPlayerX;
      g.actualPlayerX += (g.playerX - g.actualPlayerX) * 0.12;
      g.tilt = (g.actualPlayerX - prevX) * 15;

      // Update Engine Audio
      if (engineOscRef.current && audioCtxRef.current) {
        const freq = 40 + (g.speed * 1000);
        engineOscRef.current.frequency.setTargetAtTime(freq, audioCtxRef.current.currentTime, 0.1);
      }

      g.obstacles.forEach(obs => { obs.z -= g.speed; });
      g.obstacles = g.obstacles.filter(obs => obs.z > -0.2);

      if (time - g.lastSpawn > Math.max(700, 1800 - g.speed * 12000)) {
        g.obstacles.push({
          id: Date.now(),
          lane: Math.floor(Math.random() * 3),
          z: 1.6,
          color: ['#f87171', '#fbbf24', '#c084fc', '#22d3ee'][Math.floor(Math.random() * 4)]
        });
        g.lastSpawn = time;
      }

      // Collisions
      g.obstacles.forEach(obs => {
        const laneDist = Math.abs(obs.lane - g.actualPlayerX);
        if (obs.z < 0.12 && obs.z > -0.05 && laneDist < 0.55) {
          playCollisionSound();
          onGameOver(g.score);
        }
      });

      // Update Particles
      g.particles.forEach(p => {
        p.y += p.speed + g.speed;
        if (p.y > 1) { p.y = 0; p.x = Math.random(); }
      });
    }

    // --- RENDERING ---
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const horizonY = height * 0.38;
    const roadBottomY = height * 0.95;
    const roadWidthBottom = width * 0.95;
    const roadWidthTop = width * 0.05;

    // Background Stars/Particles
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    g.particles.forEach(p => {
      const px = p.x * width;
      const py = p.y * height;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + p.length);
      ctx.stroke();
    });

    // Draw Road
    const grd = ctx.createLinearGradient(0, horizonY, 0, roadBottomY);
    grd.addColorStop(0, '#0f172a');
    grd.addColorStop(1, '#020617');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(centerX - roadWidthTop/2, horizonY);
    ctx.lineTo(centerX + roadWidthTop/2, horizonY);
    ctx.lineTo(centerX + roadWidthBottom/2, roadBottomY);
    ctx.lineTo(centerX - roadWidthBottom/2, roadBottomY);
    ctx.fill();

    // Side Rails (Glowing)
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - roadWidthTop/2, horizonY);
    ctx.lineTo(centerX - roadWidthBottom/2, roadBottomY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX + roadWidthTop/2, horizonY);
    ctx.lineTo(centerX + roadWidthBottom/2, roadBottomY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Lane Lines
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.setLineDash([30, 40]);
    ctx.lineDashOffset = -g.frameCount * g.speed * 400;
    for(let i = -1; i <= 1; i += 2) {
      const xTop = centerX + (i * roadWidthTop/6);
      const xBot = centerX + (i * roadWidthBottom/6);
      ctx.beginPath();
      ctx.moveTo(xTop, horizonY);
      ctx.lineTo(xBot, roadBottomY);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Obstacles
    g.obstacles.forEach(obs => {
      const scale = Math.pow(1 - obs.z / 1.6, 2.5);
      const y = horizonY + (roadBottomY - horizonY) * scale;
      const currentRoadWidth = roadWidthTop + (roadWidthBottom - roadWidthTop) * scale;
      const x = centerX + (obs.lane - 1) * (currentRoadWidth / 3);
      const boxW = (currentRoadWidth / 4) * 0.9;
      const boxH = boxW * 1.2;

      ctx.shadowBlur = 20;
      ctx.shadowColor = obs.color;
      ctx.fillStyle = obs.color;
      ctx.fillRect(x - boxW/2, y - boxH, boxW, boxH);
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(x - boxW/2, y - boxH, boxW, 4);
    });

    // Player Ship
    const pScale = 0.9;
    const pY = horizonY + (roadBottomY - horizonY) * pScale;
    const pRoadWidth = roadWidthTop + (roadWidthBottom - roadWidthTop) * pScale;
    const pX = centerX + (g.actualPlayerX - 1) * (pRoadWidth / 3);
    const pW = 80;
    const pH = 50;

    ctx.save();
    ctx.translate(pX, pY);
    ctx.rotate(g.tilt * Math.PI / 180);

    // Thruster Glow
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#06b6d4';
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(-pW/3, 0, pW/6, 10);
    ctx.fillRect(pW/3 - pW/6, 0, pW/6, 10);

    // Body
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#3b82f6';
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(-pW/2, 0);
    ctx.lineTo(0, -pH);
    ctx.lineTo(pW/2, 0);
    ctx.lineTo(0, -pH * 0.2);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-pW/5, -pH * 0.3);
    ctx.lineTo(0, -pH * 0.8);
    ctx.lineTo(pW/5, -pH * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (gameState === GameState.PLAYING) resetGame();
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  return <canvas ref={canvasRef} className="w-full h-full block" width={800} height={600} />;
};

export default GameCanvas;
