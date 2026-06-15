import { useRef, useCallback } from 'react';

function createReverb(ctx, duration = 2.5, decay = 2.0) {
  const length = ctx.sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = impulse.getChannelData(c);
    for (let i = 0; i < length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}

function playNote(ctx, reverb, masterGain, freq, startTime, duration, gainPeak = 0.18, pan = 0) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const envGain = ctx.createGain();
  const panner = ctx.createStereoPanner();

  osc1.type = 'sine';
  osc1.frequency.value = freq;
  osc2.type = 'sine';
  osc2.frequency.value = freq * 2.005; // slight detune for shimmer

  const mix2 = ctx.createGain();
  mix2.gain.value = 0.08;

  osc1.connect(envGain);
  osc2.connect(mix2);
  mix2.connect(envGain);
  envGain.connect(panner);
  panner.connect(masterGain);
  panner.pan.value = pan;

  const attackTime = 0.008;
  const decayTime = duration * 0.3;
  const releaseTime = duration * 0.6;

  envGain.gain.setValueAtTime(0, startTime);
  envGain.gain.linearRampToValueAtTime(gainPeak, startTime + attackTime);
  envGain.gain.exponentialRampToValueAtTime(gainPeak * 0.5, startTime + attackTime + decayTime);
  envGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc1.start(startTime);
  osc2.start(startTime);
  osc1.stop(startTime + duration + 0.05);
  osc2.stop(startTime + duration + 0.05);
}

export function useChime() {
  const ctxRef = useRef(null);

  const playReveal = useCallback(() => {
    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.value = 0.55;

      const reverb = createReverb(ctx);
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.45;
      master.connect(reverb);
      reverb.connect(reverbGain);
      reverbGain.connect(ctx.destination);
      master.connect(ctx.destination);

      // A major pentatonic chord: A4, C#5, E5, A5, C#6, E6 (shimmer)
      const notes = [
        { freq: 440.0,  delay: 0,    dur: 3.0, gain: 0.18, pan: -0.1 }, // A4
        { freq: 554.37, delay: 0.07, dur: 2.8, gain: 0.15, pan:  0.2 }, // C#5
        { freq: 659.25, delay: 0.14, dur: 2.6, gain: 0.13, pan: -0.2 }, // E5
        { freq: 880.0,  delay: 0.22, dur: 2.4, gain: 0.11, pan:  0.1 }, // A5
        { freq: 1108.7, delay: 0.32, dur: 2.2, gain: 0.09, pan: -0.3 }, // C#6
        { freq: 1318.5, delay: 0.45, dur: 1.8, gain: 0.07, pan:  0.3 }, // E6 shimmer
        { freq: 1760.0, delay: 0.60, dur: 1.4, gain: 0.05, pan:  0.0 }, // A6 high shimmer
      ];

      notes.forEach(n => playNote(ctx, reverb, master, n.freq, now + n.delay, n.dur, n.gain, n.pan));
    } catch (e) {
      // Audio not available in this context
    }
  }, []);

  const unlock = useCallback(() => {
    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    } catch (e) {}
  }, []);

  return { playReveal, unlock };
}
