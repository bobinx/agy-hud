export type ProgressBarStyle = "line" | "rectangle" | "block";

export function progressBar(pct: number, width: number, color: boolean, style: string = "block"): string {
  return progressBarWithColor(pct, pct, width, color, style);
}

export function progressBarWithColor(
  fillPct: number,
  colorPct: number,
  width: number,
  color: boolean,
  style: string = "block"
): string {
  fillPct = clampInt(fillPct);
  colorPct = clampInt(colorPct);
  let filled = Math.trunc((fillPct / 100) * width + 0.5);
  if (filled < 0) filled = 0;
  if (filled > width) filled = width;

  let fChar = "\u2588"; // █
  let eChar = "\u2591"; // ░

  if (style === "line") {
    fChar = "\u2501"; // ━
    eChar = "\u2500"; // ─
  } else if (style === "rectangle") {
    fChar = "\u25AC"; // ▬
    eChar = "\u25AC"; // ▬
  }

  const filledStr = fChar.repeat(filled);
  const emptyStr = eChar.repeat(width - filled);

  if (!color) {
    if (style === "rectangle") {
      return `${filledStr}${" ".repeat(width - filled)}`;
    }
    return `${filledStr}${emptyStr}`;
  }

  const colorReset = "\x1b[0m";
  if (style === "block") {
    const bar = `${filledStr}${emptyStr}`;
    return `${percentageColor(colorPct)}${bar}${colorReset}`;
  }

  const colorMuted = "\x1b[90m";
  const fColored = filledStr ? `${percentageColor(colorPct)}${filledStr}${colorReset}` : "";
  const eColored = emptyStr ? `${colorMuted}${emptyStr}${colorReset}` : "";
  return `${fColored}${eColored}`;
}

function clampInt(n: number): number {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.trunc(n);
}

function percentageColor(pct: number): string {
  if (pct >= 90) return "\x1b[31m"; // red
  if (pct >= 75) return "\x1b[38;5;208m"; // orange
  if (pct >= 50) return "\x1b[33m"; // yellow
  return "\x1b[32m"; // green
}
