export type ClinicalAlertLevel = "standard" | "urgent" | "critical";

export const CLINICAL_ALERT_REPEAT_MS = 2 * 60 * 1000;

const alertPatterns: Record<ClinicalAlertLevel, number[]> = {
  standard: [880, 1120],
  urgent: [1180, 1480, 1320],
  critical: [1320, 1680, 1320, 1880],
};

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) return null;

  return new AudioContextCtor();
}

export function playClinicalAlertSound(level: ClinicalAlertLevel = "urgent") {
  try {
    const audioContext = getAudioContext();
    if (!audioContext) return false;

    const frequencies = alertPatterns[level];
    const baseTime = audioContext.currentTime + 0.02;
    const peakVolume = level === "critical" ? 0.34 : level === "urgent" ? 0.28 : 0.18;
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

    window.setTimeout(
      () => {
        void audioContext.close();
      },
      Math.ceil((frequencies.length * pulseGap + 0.4) * 1000)
    );

    return true;
  } catch {
    return false;
  }
}
