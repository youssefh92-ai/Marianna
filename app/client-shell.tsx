"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import type { Options as ConfettiOptions } from 'canvas-confetti';

type Phase = 'boot' | 'prompt' | 'memories' | 'ask' | 'accepted';

type RainItem = {
  id: string;
  src: string;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  blur: number;
  tilt: number;
  tiltAlt: number;
};

function hashSeed(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function ClientShell({ photos }: { photos: string[] }) {
  const [typedText, setTypedText] = useState('');
  const [bootReady, setBootReady] = useState(false);
  const [phase, setPhase] = useState<Phase>('boot');
  const [noMessage, setNoMessage] = useState<string | null>(null);
  const [confetti, setConfetti] =
    useState<((opts?: ConfettiOptions) => void) | null>(null);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  const bootScript = useMemo(
    () =>
      `Bare Systems initialized\n\nDetecting primary user...\nMarianna Haddad detected\n\nLoading shared history...`,
    [],
  );

  // Prepare audio + allow sound on first user interaction
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    setAudioCtx(ctx);

    const begin = () => {
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      setBootReady(true);
    };

    if (ctx.state === 'running') {
      setBootReady(true);
    }

    window.addEventListener('pointerdown', begin, { once: true });
    window.addEventListener('keydown', begin, { once: true });
    return () => {
      window.removeEventListener('pointerdown', begin);
      window.removeEventListener('keydown', begin);
      ctx.close().catch(() => undefined);
    };
  }, []);

  // Lazy-load confetti on client
  useEffect(() => {
    void import('canvas-confetti').then((module) => {
      setConfetti(() => module.default ?? (module as unknown as () => void));
    });
  }, []);

  const playClick = useCallback(() => {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = 420 + Math.random() * 140;
    gain.gain.value = 0.14;
    oscillator.connect(gain).connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.05);
  }, [audioCtx]);

  const playSuccess = useCallback(() => {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    [0, 0.08, 0.16].forEach((offset, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 480 + idx * 90;
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.5);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.55);
    });
  }, [audioCtx]);

  // Typing animation
  useEffect(() => {
    if (!bootReady) return;
    let active = true;
    let index = 0;
    setTypedText('');

    const typeNext = () => {
      if (!active) return;
      if (index <= bootScript.length) {
        const slice = bootScript.slice(0, index);
        setTypedText(slice);
        const lastChar = bootScript[index];
        if (lastChar && lastChar !== '\n') {
          playClick();
        }
        index += 1;
        const pause = lastChar === '\n' ? 220 : 48;
        setTimeout(typeNext, pause);
      } else {
        setTimeout(() => setPhase('prompt'), 950);
      }
    };

    const startTimer = setTimeout(typeNext, 180);
    return () => {
      active = false;
      clearTimeout(startTimer);
    };
  }, [bootReady, bootScript, playClick]);

  const handleContinue = useCallback(() => {
    setPhase('ask');
  }, []);

  const handleAccept = useCallback(() => {
    if (phase === 'accepted') return;
    setNoMessage(null);
    playSuccess();
    confetti?.({
      particleCount: 320,
      spread: 90,
      origin: { y: 0.6 },
      startVelocity: 45,
      ticks: 260,
      scalar: 1.1,
      colors: ['#f7c56b', '#ffd37b', '#f9d89b', '#fff2cf', '#c9a35a'],
    });
    confetti?.({
      particleCount: 200,
      spread: 120,
      origin: { y: 0.5 },
      startVelocity: 55,
      ticks: 300,
      scalar: 1.2,
      colors: ['#f7c56b', '#ffd37b', '#f9d89b', '#fff2cf', '#c9a35a'],
    });
    setPhase('accepted');
  }, [confetti, phase, playSuccess]);

  const handleNo = useCallback(() => {
    const lines = [
      'Nice try. The “no” button is decorative.',
      'System override: “no” is not an option.',
      'Access denied. Please choose “yes.”',
      'Cute. But “no” has been disabled.',
    ];
    setNoMessage(lines[Math.floor(Math.random() * lines.length)]);
  }, []);

  const rainItems = useMemo<RainItem[]>(() => {
    if (photos.length === 0) return [];
    const total = Math.min(Math.max(photos.length * 3, 12), 28);
    return Array.from({ length: total }, (_, idx) => {
      const src = photos[idx % photos.length];
      const rng = mulberry32(hashSeed(`${src}-${idx}`));
      const size = 180 + rng() * 200;
      const duration = 9 + rng() * 9;
      const delay = -rng() * duration;
      const tilt = -8 + rng() * 16;
      const tiltAlt = tilt + (rng() > 0.5 ? 1 : -1) * (6 + rng() * 6);
      return {
        id: `${src}-${idx}`,
        src,
        x: rng() * 100,
        size,
        duration,
        delay,
        opacity: 0.8 + rng() * 0.2,
        blur: rng() > 0.92 ? 0.6 : 0,
        tilt,
        tiltAlt,
      };
    });
  }, [photos]);

  return (
    <div className="page">
      <div className="hud">
        <div className="topline">
          <div className="top-left">
            <span className="led" />
            <span className="label">Marianna.exe</span>
            <span className="minor">ver 2.4 · neural sync</span>
          </div>
          <div className="top-right">
            <span className="chip">signal 99%</span>
            <span className="chip">matrix link stable</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'boot' && (
            <motion.section
              key="boot"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4 }}
              className="panel"
            >
              <p className="eyebrow">System Boot</p>
              <pre className="terminal">{typedText || ' '}</pre>
              <p className="hint hint-cta">
                tap this panel to start typing with sound
              </p>
            </motion.section>
          )}

          {phase === 'prompt' && (
            <motion.section
              key="prompt"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45 }}
              className="panel ask"
            >
              <p className="eyebrow">Shared History</p>
              <div className="proposal">
                <p>Shared history loaded.</p>
                <p>Would you like to view memories?</p>
              </div>
              <div className="actions">
                <button
                  className="btn primary"
                  onClick={() => setPhase('memories')}
                >
                  View memories
                </button>
              </div>
            </motion.section>
          )}

          {phase === 'memories' && (
            <>
              {photos.length > 0 && (
                <div className="photo-rain" aria-hidden="true">
                  {rainItems.map((item) => (
                    <div
                      key={item.id}
                      className="photo-sprite"
                      style={
                        {
                          '--x': `${item.x}%`,
                          '--size': `${item.size}px`,
                          '--duration': `${item.duration}s`,
                          '--delay': `${item.delay}s`,
                          '--opacity': `${item.opacity}`,
                          '--blur': `${item.blur}px`,
                          '--tilt': `${item.tilt}deg`,
                          '--tilt-alt': `${item.tiltAlt}deg`,
                        } as CSSProperties
                      }
                    >
                      <div className="photo-inner">
                        <Image
                          src={item.src}
                          alt="Marianna memory"
                          fill
                          sizes="160px"
                          className="photo-img"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <motion.div
                key="memories"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45 }}
                className="center-cta"
              >
                {photos.length === 0 && (
                  <div className="empty">
                    Drop photos into <code>public/photos</code> to reveal them here.
                  </div>
                )}
                <button className="btn primary" onClick={handleContinue}>
                  Continue
                </button>
              </motion.div>
            </>
          )}

          {phase === 'ask' && (
            <motion.section
              key="ask"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="panel ask"
            >
              <p className="eyebrow">Primary Query</p>
              <div className="proposal">
                <p>Marianna Haddad,</p>
                <p>You are my greatest partner.</p>
                <p>My favorite person.</p>
                <p>And the best thing I have ever built my life with.</p>
                <p className="ask-line">Will you be my Valentine?</p>
              </div>
              <div className="actions">
                <button className="btn primary" onClick={handleAccept}>
                  YES ❤️
                </button>
                <button className="btn ghost" onClick={handleAccept}>
                  ABSOLUTELY YES ❤️
                </button>
                <button className="btn ghost" onClick={handleNo}>
                  NO
                </button>
              </div>
              {noMessage && <p className="no-message">{noMessage}</p>}
            </motion.section>
          )}

          {phase === 'accepted' && (
            <motion.section
              key="accepted"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45 }}
              className="panel accepted"
            >
              <p className="eyebrow success">Valentine accepted</p>
              <div className="accept-grid">
                <div>
                  <div className="muted">Owner</div>
                  <div className="strong">Marianna Haddad</div>
                </div>
                <div>
                  <div className="muted">Duration</div>
                  <div className="strong">Forever</div>
                </div>
              </div>
              <p className="hint">Confetti broadcast sent · Success tone played</p>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
