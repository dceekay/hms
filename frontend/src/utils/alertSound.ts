export type ClinicalAlertLevel = "standard" | "urgent" | "critical" | "phone_ring" | "success";

export const CLINICAL_ALERT_REPEAT_MS = 2 * 60 * 1000;

const alertPatterns: Record<Exclude<ClinicalAlertLevel, "phone_ring" | "success">, number[]> = {
  standard: [880, 1120],
  urgent: [1180, 1480, 1320],
  critical: [1320, 1680, 1320, 1880],
};

let sharedAudioContext: AudioContext | null = null;
let phoneRingerIntervalId: number | null = null;
let phoneRingerAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (sharedAudioContext && sharedAudioContext.state !== "closed") {
    if (sharedAudioContext.state === "suspended") {
      void sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  }

  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) return null;

  try {
    sharedAudioContext = new AudioContextCtor();
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Ensures AudioContext is resumed upon user interaction
 */
export function unlockAudioContext() {
  if (typeof window === "undefined") return;
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

if (typeof window !== "undefined") {
  const handleInteraction = () => {
    unlockAudioContext();
  };
  window.addEventListener("click", handleInteraction, { once: true, passive: true });
  window.addEventListener("keydown", handleInteraction, { once: true, passive: true });
  window.addEventListener("touchstart", handleInteraction, { once: true, passive: true });
}

/**
 * Synthesizes an authentic loud dual-tone telephone ring burst
 */
function playPhoneRingBurst(audioContext: AudioContext, startOffset = 0.02, volume = 0.52) {
  const baseTime = audioContext.currentTime + startOffset;

  // Traditional phone ring cadence: Ring 1 (450ms) -> Silence (200ms) -> Ring 2 (450ms)
  const rings = [
    { start: baseTime, stop: baseTime + 0.45 },
    { start: baseTime + 0.65, stop: baseTime + 1.1 },
  ];

  // Loud dual carrier frequencies (440Hz standard ring + 480Hz dial tone + 880Hz presence harmonic)
  const tones = [
    { freq: 440, type: "sine" as OscillatorType, gainMul: 0.45 },
    { freq: 480, type: "sine" as OscillatorType, gainMul: 0.45 },
    { freq: 880, type: "triangle" as OscillatorType, gainMul: 0.25 },
    { freq: 960, type: "triangle" as OscillatorType, gainMul: 0.18 },
  ];

  rings.forEach(({ start, stop }) => {
    tones.forEach(({ freq, type, gainMul }) => {
      try {
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);

        // 20Hz tremolo modulation for classic bell flutter
        const tremolo = audioContext.createOscillator();
        const tremoloGain = audioContext.createGain();
        tremolo.frequency.setValueAtTime(20, start);
        tremoloGain.gain.setValueAtTime(0.2, start);
        tremolo.connect(tremoloGain);

        const peak = Math.min(0.9, volume * gainMul);
        gainNode.gain.setValueAtTime(0.0001, start);
        gainNode.gain.linearRampToValueAtTime(peak, start + 0.035);
        gainNode.gain.setValueAtTime(peak, stop - 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, stop);

        osc.connect(gainNode);
        gainNode.connect(audioContext.destination);

        osc.start(start);
        osc.stop(stop + 0.06);
      } catch {}
    });
  });
}

/**
 * Plays a single phone ring pattern (Ring... Ring...)
 */
export function playPhoneRingAlert(volume = 0.52) {
  try {
    const audioContext = getAudioContext();
    if (!audioContext) return false;
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
    playPhoneRingBurst(audioContext, 0.02, volume);
    return true;
  } catch {
    return false;
  }
}

/**
 * Starts continuous loud telephone ringing that repeats every 2.6 seconds
 * until stopped by calling stopContinuousPhoneRing().
 */
export function startContinuousPhoneRing(volume = 0.55): boolean {
  if (phoneRingerIntervalId !== null) {
    return true; // Already actively ringing
  }

  try {
    const audioContext = getAudioContext();
    if (!audioContext) return false;

    if (audioContext.state === "suspended") {
      void audioContext.resume().catch(() => {});
    }

    phoneRingerAudioContext = audioContext;

    // Play first ring burst immediately
    playPhoneRingBurst(audioContext, 0.02, volume);

    // Repeat every 2.6 seconds
    phoneRingerIntervalId = window.setInterval(() => {
      if (phoneRingerAudioContext && phoneRingerAudioContext.state !== "closed") {
        if (phoneRingerAudioContext.state === "suspended") {
          void phoneRingerAudioContext.resume().catch(() => {});
        }
        playPhoneRingBurst(phoneRingerAudioContext, 0.02, volume);
      }
    }, 2600);

    return true;
  } catch (err) {
    console.error("Failed to start continuous phone ring", err);
    return false;
  }
}

/**
 * Stops continuous or intermittent telephone ringing immediately
 */
export function stopContinuousPhoneRing() {
  if (phoneRingerIntervalId !== null) {
    window.clearInterval(phoneRingerIntervalId);
    phoneRingerIntervalId = null;
  }
}

/**
 * Starts INTERMITTENT telephone alert that sounds gently, then pauses for intervalMs (default: 60s).
 * This prevents ear fatigue and annoying non-stop ringing while keeping staff informed.
 */
export function startIntermittentPhoneAlert(intervalMs = 60000, volume = 0.38): boolean {
  if (phoneRingerIntervalId !== null) {
    return true; // Already active
  }

  try {
    const audioContext = getAudioContext();
    if (!audioContext) return false;

    if (audioContext.state === "suspended") {
      void audioContext.resume().catch(() => {});
    }

    phoneRingerAudioContext = audioContext;

    // Play initial gentle alert
    playPhoneRingBurst(audioContext, 0.02, volume);

    // Repeat intermittently every intervalMs (e.g. 60s)
    phoneRingerIntervalId = window.setInterval(() => {
      if (phoneRingerAudioContext && phoneRingerAudioContext.state !== "closed") {
        if (phoneRingerAudioContext.state === "suspended") {
          void phoneRingerAudioContext.resume().catch(() => {});
        }
        playPhoneRingBurst(phoneRingerAudioContext, 0.02, volume);
      }
    }, intervalMs);

    return true;
  } catch (err) {
    console.error("Failed to start intermittent phone alert", err);
    return false;
  }
}

/**
 * Returns true if the phone ringer is currently active
 */
export function isPhoneRinging(): boolean {
  return phoneRingerIntervalId !== null;
}

/**
 * Plays a pleasant, calming clinical success chime (C5 -> E5 -> G5 -> C6 major arpeggio).
 * Ideal for positive clinical alerts like patient assignment, triage updates, or task completions.
 */
export function playSuccessChime(volume = 0.28): boolean {
  try {
    const audioContext = getAudioContext();
    if (!audioContext) return false;
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const notes = [
      { freq: 523.25, timeOffset: 0.0, duration: 0.35 }, // C5
      { freq: 659.25, timeOffset: 0.08, duration: 0.35 }, // E5
      { freq: 783.99, timeOffset: 0.16, duration: 0.4 }, // G5
      { freq: 1046.5, timeOffset: 0.24, duration: 0.65 }, // C6
    ];

    const baseTime = audioContext.currentTime + 0.01;

    notes.forEach(({ freq, timeOffset, duration }, idx) => {
      const start = baseTime + timeOffset;
      const stop = start + duration;

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      // Sine wave with soft presence overtone
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      const noteVolume = idx === notes.length - 1 ? volume * 1.1 : volume;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(noteVolume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start(start);
      osc.stop(stop + 0.05);
    });

    return true;
  } catch {
    return false;
  }
}

export function playClinicalAlertSound(level: ClinicalAlertLevel = "urgent") {
  if (level === "phone_ring") {
    return playPhoneRingAlert(0.55);
  }

  if (level === "success") {
    return playSuccessChime();
  }

  try {
    const audioContext = getAudioContext();
    if (!audioContext) return false;
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const frequencies = alertPatterns[level];
    const baseTime = audioContext.currentTime + 0.02;
    const peakVolume = level === "critical" ? 0.38 : level === "urgent" ? 0.32 : 0.22;
    const pulseGap = level === "critical" ? 0.18 : 0.22;

    frequencies.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = baseTime + index * pulseGap;
      const stop = start + 0.16;

      oscillator.type = index % 2 === 0 ? "square" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peakVolume, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(stop + 0.02);
    });

    return true;
  } catch {
    return false;
  }
}
