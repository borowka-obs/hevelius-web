import { Project, ProjectSubframe } from '../models/project';

export function subframeCapturedSeconds(sub: ProjectSubframe): number {
  const c = sub.count ?? 0;
  const exp = sub.exposure_time ?? 0;
  return Math.max(0, c * exp);
}

export function subframeGoalSeconds(sub: ProjectSubframe): number {
  const g = sub.goal_count ?? 0;
  const exp = sub.exposure_time ?? 0;
  return Math.max(0, g * exp);
}

export function projectTotalCapturedSeconds(project: Project): number {
  const subs = project.subframes ?? [];
  return subs.reduce((acc, s) => acc + subframeCapturedSeconds(s), 0);
}

export function projectTotalGoalSeconds(project: Project): number {
  const subs = project.subframes ?? [];
  return subs.reduce((acc, s) => acc + subframeGoalSeconds(s), 0);
}

/** Human-readable duration, e.g. "8h40min", "45min", "30s". */
export function formatIntegrationDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0min';
  }
  let sec = Math.round(totalSeconds);
  const h = Math.floor(sec / 3600);
  sec -= h * 3600;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const parts: string[] = [];
  if (h > 0) {
    parts.push(`${h}h`);
  }
  if (m > 0) {
    parts.push(`${m}m`);
  }
  if (s > 0 && h === 0 && m === 0) {
    parts.push(`${s}s`);
  } else if (s > 0 && (h > 0 || m > 0)) {
    parts.push(`${s}s`);
  }
  if (!parts.length) {
    return '0m';
  }
  return parts.join('');
}

/**
 * Brief per-filter captured summary, e.g. "Ha 3h20m, OIII 1h5m".
 */
export function projectFilterGoalSummary(project: Project): string {
  const subs = project.subframes ?? [];
  if (!subs.length) {
    return '';
  }
  const byFilter = new Map<string, number>();
  for (const s of subs) {
    const name = (s.filter?.short_name ?? `id${s.filter_id}`).trim() || '?';
    byFilter.set(name, (byFilter.get(name) ?? 0) + subframeCapturedSeconds(s));
  }
  const chunks: string[] = [];
  for (const [name, sec] of byFilter) {
    chunks.push(`${name} ${formatIntegrationDuration(sec)}`);
  }
  return chunks.join(', ');
}

export function subframeProgressPercent(sub: ProjectSubframe): number | null {
  const goal = sub.goal_count;
  if (goal == null || goal <= 0) {
    return null;
  }
  const c = sub.count ?? 0;
  return (c / goal) * 100;
}

export function progressBarPercent(percent: number | null): number {
  if (percent == null || !Number.isFinite(percent)) {
    return 0;
  }
  return Math.min(100, Math.max(0, percent));
}
