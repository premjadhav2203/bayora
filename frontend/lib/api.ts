import { AuditRow, Step, TimingState, Verify } from "./types";
const B = "/gw";
async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(B + path, { cache: "no-store", ...init });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
export const api = {
  audit: () => j<{ rows: AuditRow[]; verify: Verify; tampered: boolean }>("/dash/audit"),
  run: (leak: boolean) => j<{ steps: Step[] }>(`/dash/run-demo?leak=${leak}`, { method: "POST" }),
  tamper: () => j<{ tampered_row: number }>("/dash/tamper", { method: "POST" }),
  restore: () => j<{ restored: boolean }>("/dash/restore", { method: "POST" }),
  timing: () => j<TimingState>("/dash/timing"),
  startTiming: () => j<TimingState>("/dash/timing/run", { method: "POST" }),
};
