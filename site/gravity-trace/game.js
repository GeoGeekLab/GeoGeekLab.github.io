/*
 * Gravity Trace — GeoGeek Lab
 * Copyright (c) 2026 GeoGeekLab
 * SPDX-License-Identifier: MIT
 *
 * Original browser game: no third-party runtime dependencies.
 */
(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });

  const ui = {
    score: document.getElementById('score'),
    captures: document.getElementById('captures'),
    level: document.getElementById('level'),
    energyBar: document.getElementById('energyBar'),
    energyText: document.getElementById('energyText'),
    startOverlay: document.getElementById('startOverlay'),
    pauseOverlay: document.getElementById('pauseOverlay'),
    startButton: document.getElementById('startButton'),
    resumeButton: document.getElementById('resumeButton'),
    pauseButton: document.getElementById('pauseButton'),
    resetButton: document.getElementById('resetButton'),
    soundButton: document.getElementById('soundButton'),
    reticleNote: document.getElementById('reticleNote'),
  };

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rand = (min, max) => min + Math.random() * (max - min);
  const hypot = (x, y) => Math.sqrt(x * x + y * y);

  const state = {
    started: false,
    paused: false,
    muted: false,
    score: 0,
    captures: 0,
    level: 1,
    combo: 0,
    lastCapture: -Infinity,
    energy: 100,
    width: 0,
    height: 0,
    dpr: 1,
    lastTime: performance.now(),
    accumulator: 0,
    spawnClock: 0,
    particles: [],
    wells: [],
    ripples: [],
    gate: { x: .74, y: .50, r: 34, phase: 0 },
    pointer: { x: .5, y: .5, down: false, downAt: 0, id: null },
    reticle: { x: .44, y: .52 },
    audio: null,
    highScore: 0,
  };

  try { state.highScore = Number(localStorage.getItem('gravity-trace-high-score') || 0) || 0; } catch {}

  function resize() {
    const rect = canvas.getBoundingClientRect();
    state.dpr = Math.min(devicePixelRatio || 1, 2);
    state.width = Math.max(1, rect.width);
    state.height = Math.max(1, rect.height);
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function ensureAudio() {
    if (state.muted) return null;
    if (!state.audio) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      state.audio = new AudioCtx();
    }
    if (state.audio.state === 'suspended') state.audio.resume().catch(() => {});
    return state.audio;
  }

  function tone(frequency, duration = .08, gain = .035, type = 'sine') {
    const audio = ensureAudio();
    if (!audio) return;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    amp.gain.setValueAtTime(gain, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration);
    osc.connect(amp).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  }

  function updateHud() {
    ui.score.textContent = String(Math.round(state.score)).padStart(6, '0');
    ui.captures.textContent = String(state.captures).padStart(2, '0');
    ui.level.textContent = String(state.level).padStart(2, '0');
    ui.energyText.textContent = String(Math.round(state.energy));
    ui.energyBar.style.transform = `scaleX(${clamp(state.energy / 100, 0, 1)})`;
    ui.pauseButton.firstChild.nodeValue = state.paused ? 'RESUME ' : 'PAUSE ';
  }

  function spawnParticle(force = false) {
    if (!force && state.particles.length > 20) return;
    const h = state.height;
    const levelSpeed = 1 + Math.min(1.2, (state.level - 1) * .09);
    const y = rand(h * .14, h * .86);
    const speed = rand(74, 112) * levelSpeed;
    state.particles.push({
      x: -14,
      y,
      vx: speed,
      vy: rand(-18, 18),
      radius: rand(3.1, 5.2),
      trail: [],
      gateLatch: false,
      age: 0,
      spin: rand(-2, 2),
      angle: rand(0, TAU),
    });
  }

  function placeGate() {
    const marginX = Math.max(70, state.width * .12);
    const marginY = Math.max(70, state.height * .16);
    state.gate.x = rand(state.width * .56, state.width - marginX);
    state.gate.y = rand(marginY, state.height - marginY);
    state.gate.r = clamp(42 - (state.level - 1) * 2.4, 24, 42);
    state.gate.phase = 0;
  }

  function resetGame({ preserveStart = false } = {}) {
    state.score = 0;
    state.captures = 0;
    state.level = 1;
    state.combo = 0;
    state.lastCapture = -Infinity;
    state.energy = 100;
    state.spawnClock = 0;
    state.particles.length = 0;
    state.wells.length = 0;
    state.ripples.length = 0;
    state.paused = false;
    if (!preserveStart) state.started = true;
    for (let i = 0; i < 5; i += 1) {
      spawnParticle(true);
      state.particles[state.particles.length - 1].x = rand(-state.width * .6, state.width * .25);
    }
    placeGate();
    setPaused(false);
    updateHud();
  }

  function setPaused(paused) {
    if (!state.started) return;
    state.paused = paused;
    ui.pauseOverlay.classList.toggle('hidden', !paused);
    ui.pauseOverlay.setAttribute('aria-hidden', paused ? 'false' : 'true');
    updateHud();
  }

  function startGame() {
    state.started = true;
    ui.startOverlay.classList.add('hidden');
    resetGame({ preserveStart: true });
    canvas.focus({ preventScroll: true });
    ensureAudio();
    tone(392, .09, .025, 'triangle');
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height),
    };
  }

  function beginCharge(x, y, pointerId = null) {
    if (!state.started || state.paused) return;
    state.pointer.x = x / state.width;
    state.pointer.y = y / state.height;
    state.pointer.down = true;
    state.pointer.downAt = performance.now();
    state.pointer.id = pointerId;
    ensureAudio();
  }

  function releaseCharge(x, y) {
    if (!state.pointer.down || !state.started || state.paused) return;
    const held = clamp((performance.now() - state.pointer.downAt) / 760, 0, 1);
    state.pointer.down = false;
    state.pointer.id = null;
    placeWell(x, y, .42 + held * .58);
  }

  function placeWell(x, y, charge = .65) {
    const cost = 14 + charge * 15;
    if (state.energy < cost) {
      tone(110, .06, .02, 'square');
      state.ripples.push({ x, y, age: 0, life: .28, fail: true });
      return false;
    }
    state.energy -= cost;
    state.wells.push({
      x,
      y,
      strength: 7800 + charge * 11200,
      radius: 72 + charge * 68,
      age: 0,
      life: 2.6 + charge * 1.5,
      charge,
    });
    if (state.wells.length > 6) state.wells.shift();
    state.ripples.push({ x, y, age: 0, life: .72, fail: false });
    tone(160 + charge * 90, .10, .025, 'sine');
    updateHud();
    return true;
  }

  function capture(particle, nowSeconds) {
    const recent = nowSeconds - state.lastCapture <= 5.5;
    state.combo = recent ? Math.min(8, state.combo + 1) : 1;
    state.lastCapture = nowSeconds;
    const gain = 100 * state.combo * (1 + (state.level - 1) * .08);
    state.score += gain;
    state.captures += 1;
    state.energy = clamp(state.energy + 18, 0, 100);
    particle.gateLatch = true;
    state.ripples.push({ x: state.gate.x, y: state.gate.y, age: 0, life: .9, capture: true });
    tone(440 + state.combo * 45, .11, .035, 'triangle');
    if (state.captures % 5 === 0) {
      state.level += 1;
      tone(660, .16, .025, 'sine');
    }
    placeGate();
    updateHud();
    if (state.score > state.highScore) {
      state.highScore = state.score;
      try { localStorage.setItem('gravity-trace-high-score', String(Math.round(state.highScore))); } catch {}
    }
  }

  function update(dt, nowSeconds) {
    state.energy = clamp(state.energy + dt * 8.2, 0, 100);
    state.spawnClock -= dt;
    if (state.spawnClock <= 0) {
      spawnParticle();
      state.spawnClock = clamp(1.05 - state.level * .035, .52, 1.05);
    }

    for (let i = state.wells.length - 1; i >= 0; i -= 1) {
      const well = state.wells[i];
      well.age += dt;
      if (well.age >= well.life) state.wells.splice(i, 1);
    }

    for (let i = state.ripples.length - 1; i >= 0; i -= 1) {
      state.ripples[i].age += dt;
      if (state.ripples[i].age >= state.ripples[i].life) state.ripples.splice(i, 1);
    }

    const margin = 90;
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.age += dt;
      p.angle += p.spin * dt;

      let ax = 0;
      let ay = 0;
      for (const well of state.wells) {
        const dx = well.x - p.x;
        const dy = well.y - p.y;
        const r2 = dx * dx + dy * dy + 1450;
        const r = Math.sqrt(r2);
        const decay = clamp(1 - well.age / well.life, 0, 1);
        const accel = Math.min(360, (well.strength * decay) / r2) * 95;
        ax += (dx / r) * accel;
        ay += (dy / r) * accel;
      }

      p.vx += ax * dt;
      p.vy += ay * dt;
      const speed = hypot(p.vx, p.vy);
      const maxSpeed = 360 + state.level * 10;
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        p.vx *= scale;
        p.vy *= scale;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (!reducedMotion) {
        p.trail.push({ x: p.x, y: p.y });
        const limit = 30;
        if (p.trail.length > limit) p.trail.splice(0, p.trail.length - limit);
      } else if (p.trail.length) {
        p.trail.length = 0;
      }

      const gx = p.x - state.gate.x;
      const gy = p.y - state.gate.y;
      const gateDistance = hypot(gx, gy);
      if (!p.gateLatch && gateDistance < state.gate.r - p.radius) capture(p, nowSeconds);
      if (gateDistance > state.gate.r * 1.6) p.gateLatch = false;

      if (p.x > state.width + margin || p.x < -margin * 1.5 || p.y < -margin || p.y > state.height + margin) {
        state.particles.splice(i, 1);
        if (p.x < state.width * .72) state.combo = 0;
      }
    }

    state.gate.phase += dt;
    updateHud();
  }

  function drawBackground() {
    const w = state.width;
    const h = state.height;
    ctx.fillStyle = '#d8d4c9';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(32,37,34,.075)';
    ctx.lineWidth = 1;
    const step = Math.max(34, Math.min(w, h) / 12);
    ctx.beginPath();
    for (let x = step; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = step; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = 'rgba(23,109,116,.10)';
    for (let band = 0; band < 5; band += 1) {
      ctx.beginPath();
      for (let x = -20; x <= w + 20; x += 12) {
        const y = h * (.18 + band * .16) + Math.sin(x * .012 + band * 1.7) * (14 + band * 2) + Math.sin(x * .028 - band) * 6;
        if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = 'rgba(32,37,34,.48)';
    ctx.font = '10px SFMono-Regular, Consolas, monospace';
    ctx.fillText('WEST / EMITTER', 14, 20);
    ctx.textAlign = 'right';
    ctx.fillText(`FIELD ${String(state.level).padStart(2, '0')} / RELATIVE FORCE`, w - 14, 20);
    ctx.textAlign = 'left';
  }

  function drawGate() {
    const g = state.gate;
    ctx.save();
    ctx.translate(g.x, g.y);
    const pulse = reducedMotion ? 0 : Math.sin(g.phase * 3.3) * 2.5;
    ctx.strokeStyle = '#a44f2d';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, g.r + pulse, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-g.r - 12, 0); ctx.lineTo(g.r + 12, 0);
    ctx.moveTo(0, -g.r - 12); ctx.lineTo(0, g.r + 12);
    ctx.stroke();
    ctx.fillStyle = '#a44f2d';
    ctx.font = '9px SFMono-Regular, Consolas, monospace';
    ctx.fillText('SURVEY GATE', g.r + 14, -5);
    ctx.restore();
  }

  function drawWells() {
    for (const well of state.wells) {
      const life = clamp(1 - well.age / well.life, 0, 1);
      ctx.save();
      ctx.translate(well.x, well.y);
      ctx.strokeStyle = `rgba(23,109,116,${.18 + life * .52})`;
      ctx.fillStyle = `rgba(23,109,116,${.04 + life * .08})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, well.radius * (.75 + .25 * life), 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 9 + well.charge * 7, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
      ctx.moveTo(0, -5); ctx.lineTo(0, 5);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawRipples() {
    for (const ripple of state.ripples) {
      const t = ripple.age / ripple.life;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = ripple.capture ? '#a44f2d' : ripple.fail ? '#7d3434' : '#176d74';
      ctx.lineWidth = ripple.capture ? 2 : 1;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, 8 + t * (ripple.capture ? 76 : 44), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of state.particles) {
      if (p.trail.length > 1) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(49,59,54,.22)';
        ctx.beginPath();
        p.trail.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = '#313b36';
      ctx.beginPath();
      const r = p.radius;
      ctx.moveTo(r * 1.2, 0);
      ctx.lineTo(-r * .55, r * .85);
      ctx.lineTo(-r, -r * .55);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawChargePreview(now) {
    if (!state.pointer.down || !state.started || state.paused) return;
    const charge = clamp((now - state.pointer.downAt) / 760, 0, 1);
    const x = state.pointer.x * state.width;
    const y = state.pointer.y * state.height;
    const radius = 50 + charge * 82;
    ctx.save();
    ctx.strokeStyle = `rgba(23,109,116,${.45 + charge * .4})`;
    ctx.fillStyle = 'rgba(23,109,116,.06)';
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#176d74';
    ctx.font = '9px SFMono-Regular, Consolas, monospace';
    ctx.fillText(`FIELD ${(42 + charge * 58).toFixed(0)}%`, x + 10, y - 10);
    ctx.restore();
  }

  function drawKeyboardReticle() {
    if (document.activeElement !== canvas || state.pointer.down) return;
    const x = state.reticle.x * state.width;
    const y = state.reticle.y * state.height;
    ctx.save();
    ctx.strokeStyle = 'rgba(23,109,116,.82)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, TAU);
    ctx.moveTo(x - 18, y); ctx.lineTo(x - 6, y);
    ctx.moveTo(x + 6, y); ctx.lineTo(x + 18, y);
    ctx.moveTo(x, y - 18); ctx.lineTo(x, y - 6);
    ctx.moveTo(x, y + 6); ctx.lineTo(x, y + 18);
    ctx.stroke();
    ctx.restore();
  }

  function draw(now) {
    drawBackground();
    drawGate();
    drawWells();
    drawRipples();
    drawParticles();
    drawChargePreview(now);
    drawKeyboardReticle();

    if (state.combo > 1 && performance.now() / 1000 - state.lastCapture < 3.2) {
      ctx.save();
      ctx.textAlign = 'right';
      ctx.fillStyle = '#a44f2d';
      ctx.font = '600 12px SFMono-Regular, Consolas, monospace';
      ctx.fillText(`TRACE × ${state.combo}`, state.width - 14, state.height - 16);
      ctx.restore();
    }
  }

  function frame(now) {
    const elapsed = Math.min(.05, Math.max(0, (now - state.lastTime) / 1000));
    state.lastTime = now;
    if (state.started && !state.paused && !document.hidden) {
      state.accumulator += elapsed;
      const step = 1 / 90;
      let guard = 0;
      while (state.accumulator >= step && guard < 6) {
        update(step, now / 1000);
        state.accumulator -= step;
        guard += 1;
      }
    }
    draw(now);
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('pointerdown', event => {
    if (!state.started || state.paused) return;
    const p = pointerPosition(event);
    canvas.setPointerCapture?.(event.pointerId);
    beginCharge(p.x, p.y, event.pointerId);
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', event => {
    if (!state.pointer.down || event.pointerId !== state.pointer.id) return;
    const p = pointerPosition(event);
    state.pointer.x = p.x / state.width;
    state.pointer.y = p.y / state.height;
  });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerId !== state.pointer.id) return;
    const p = pointerPosition(event);
    releaseCharge(p.x, p.y);
    event.preventDefault();
  });
  canvas.addEventListener('pointercancel', () => {
    state.pointer.down = false;
    state.pointer.id = null;
  });

  canvas.addEventListener('keydown', event => {
    const step = event.shiftKey ? .08 : .035;
    if (event.key === 'ArrowLeft') state.reticle.x -= step;
    else if (event.key === 'ArrowRight') state.reticle.x += step;
    else if (event.key === 'ArrowUp') state.reticle.y -= step;
    else if (event.key === 'ArrowDown') state.reticle.y += step;
    else if (event.key === 'Enter') {
      placeWell(state.reticle.x * state.width, state.reticle.y * state.height, .68);
      event.preventDefault();
      return;
    } else return;
    state.reticle.x = clamp(state.reticle.x, .04, .96);
    state.reticle.y = clamp(state.reticle.y, .05, .95);
    event.preventDefault();
  });

  window.addEventListener('keydown', event => {
    const tag = event.target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (event.code === 'Space') {
      if (state.started) setPaused(!state.paused);
      event.preventDefault();
    } else if (event.key.toLowerCase() === 'r') {
      if (state.started) resetGame({ preserveStart: true });
    } else if (event.key.toLowerCase() === 'm') {
      toggleSound();
    }
  });

  function toggleSound() {
    state.muted = !state.muted;
    ui.soundButton.setAttribute('aria-pressed', String(state.muted));
    ui.soundButton.querySelector('span').textContent = state.muted ? 'OFF' : 'ON';
    if (!state.muted) tone(330, .06, .02, 'triangle');
  }

  ui.startButton.addEventListener('click', startGame);
  ui.resumeButton.addEventListener('click', () => setPaused(false));
  ui.pauseButton.addEventListener('click', () => state.started && setPaused(!state.paused));
  ui.resetButton.addEventListener('click', () => state.started && resetGame({ preserveStart: true }));
  ui.soundButton.addEventListener('click', toggleSound);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.started && !state.paused) setPaused(true);
  });
  window.addEventListener('resize', resize, { passive: true });

  resize();
  state.started = false;
  placeGate();
  for (let i = 0; i < 5; i += 1) {
    spawnParticle(true);
    state.particles[state.particles.length - 1].x = rand(-state.width * .4, state.width * .4);
  }
  updateHud();
  requestAnimationFrame(frame);
})();
