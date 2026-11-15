export interface VitalsScoreInput {
  systolicBp?: number | string | null;
  diastolicBp?: number | string | null;
  temperatureCelsius?: number | string | null;
  spo2?: number | string | null;
  pulse?: number | string | null;
  respiratoryRate?: number | string | null;
}

export interface News2Evaluation {
  score: number;
  level: "normal" | "watch" | "urgent";
  label: string;
  guidance: string;
  color: string;
  background: string;
  reasons: string[];
}

export function calculateNews2(vitals: VitalsScoreInput): News2Evaluation {
  const sbp = Number(vitals.systolicBp || 0);
  const temp = Number(vitals.temperatureCelsius || 0);
  const spo2 = Number(vitals.spo2 || 0);
  const pulse = Number(vitals.pulse || 0);
  const rr = Number(vitals.respiratoryRate || 0);

  let score = 0;
  const reasons: string[] = [];

  if (rr > 0) {
    if (rr <= 8 || rr >= 25) {
      score += 3;
      reasons.push(`Breathing ${rr}/min`);
    } else if (rr >= 21) {
      score += 2;
      reasons.push(`Fast breathing ${rr}/min`);
    } else if (rr <= 11) {
      score += 1;
    }
  }

  if (spo2 > 0) {
    if (spo2 <= 91) {
      score += 3;
      reasons.push(`Low SpO2 (${spo2}%)`);
    } else if (spo2 <= 93) {
      score += 2;
      reasons.push(`Borderline SpO2 (${spo2}%)`);
    } else if (spo2 <= 95) {
      score += 1;
    }
  }

  if (sbp > 0) {
    if (sbp <= 90 || sbp >= 220) {
      score += 3;
      reasons.push(`Critical BP (${sbp} sys)`);
    } else if (sbp <= 100) {
      score += 2;
      reasons.push(`Low BP (${sbp} sys)`);
    } else if (sbp <= 110) {
      score += 1;
    } else if (sbp >= 180) {
      score += 2;
      reasons.push(`Very high BP (${sbp} sys)`);
    }
  }

  if (pulse > 0) {
    if (pulse <= 40 || pulse >= 131) {
      score += 3;
      reasons.push(`Critical pulse (${pulse} bpm)`);
    } else if (pulse >= 111) {
      score += 2;
      reasons.push(`Fast pulse (${pulse} bpm)`);
    } else if (pulse <= 50 || pulse >= 91) {
      score += 1;
    }
  }

  if (temp > 0) {
    if (temp <= 35.0) {
      score += 3;
      reasons.push(`Hypothermia (${temp}°C)`);
    } else if (temp >= 39.1) {
      score += 2;
      reasons.push(`High fever (${temp}°C)`);
    } else if (temp <= 36.0 || temp >= 38.1) {
      score += 1;
      if (temp >= 38.1) reasons.push(`Fever (${temp}°C)`);
    }
  }

  if (score >= 5) {
    return {
      score,
      level: "urgent",
      label: `Urgent Alert (NEWS2: ${score})`,
      guidance: "See doctor immediately and repeat vitals within 15–30 mins.",
      color: "#ef4444",
      background: "rgba(239, 68, 68, 0.14)",
      reasons,
    };
  }

  if (score >= 2) {
    return {
      score,
      level: "watch",
      label: `Watch Closely (NEWS2: ${score})`,
      guidance: "Monitor closely and inform attending doctor.",
      color: "#f59e0b",
      background: "rgba(245, 158, 11, 0.15)",
      reasons,
    };
  }

  return {
    score,
    level: "normal",
    label: `Stable (NEWS2: ${score})`,
    guidance: "Routine observation.",
    color: "#10b981",
    background: "rgba(16, 185, 129, 0.14)",
    reasons,
  };
}
