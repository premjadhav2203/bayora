import { CheckCircle2, KeyRound, Lock, PlayCircle, ShieldX, Unlock, Eye, Bug, BadgeCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Step } from "@/lib/types";

const short = (s: string) => (s ? s.slice(0, 14) + "…" : "");

function describe(s: Step): { icon: ReactNode; title: string; detail: string; tone: string } {
  switch (s.type) {
    case "create": return { icon: <PlayCircle className="h-4 w-4" />, title: "Session created", detail: `id ${s.session_id} · separate tokens issued to Red and Blue`, tone: "text-slate-300" };
    case "auth_denied": return { icon: <ShieldX className="h-4 w-4" />, title: s.denied ? "Auth test: DENIED" : "Auth test: PROBLEM", detail: s.detail, tone: s.denied ? "text-ok" : "text-red-team" };
    case "commit": return { icon: <Lock className="h-4 w-4" />, title: `${s.side === "red" ? "Red" : "Blue"} committed`, detail: `sha256 ${short(s.commit)} (payloads/defense locked before the test)`, tone: s.side === "red" ? "text-red-team" : "text-blue-team" };
    case "open": return { icon: <Unlock className="h-4 w-4" />, title: "Session opened", detail: "both commitments are in the audit chain", tone: "text-slate-300" };
    case "prompt": return { icon: <KeyRound className="h-4 w-4" />, title: `Attack #${s.n} processed`, detail: `${s.tag} · ${s.verdict} · padded to ${s.latency_ms} ms`, tone: s.verdict === "block" ? "text-blue-team" : "text-slate-300" };
    case "blue_view": return { icon: <Eye className="h-4 w-4" />, title: "Blue's view: verdicts only", detail: `${s.verdicts.length} verdicts, 0 raw payloads`, tone: "text-blue-team" };
    case "canary": return { icon: <Bug className="h-4 w-4" />, title: s.hits.length ? "CANARY ALERT" : "Canary scan clean", detail: s.hits.length ? s.hits.map((h: any) => `${h.leaked} secret seen on ${h.surface}`).join("; ") : "no foreign secret on any visible surface", tone: s.hits.length ? "text-warn" : "text-ok" };
    case "reveal": return { icon: <CheckCircle2 className="h-4 w-4" />, title: `${s.side === "red" ? "Red" : "Blue"} reveal ${s.ok ? "verified" : "FAILED"}`, detail: s.ok ? "revealed material matches the earlier commitment" : "commitment mismatch", tone: s.ok ? "text-ok" : "text-red-team" };
    case "certificate": return { icon: <BadgeCheck className="h-4 w-4" />, title: "Signed integrity certificate issued", detail: `${s.cert.verdict} · score ${s.cert.integrity_score}`, tone: s.cert.verdict === "TRUSTED" ? "text-ok" : "text-warn" };
    default: return { icon: null, title: s.type, detail: "", tone: "text-slate-300" };
  }
}

export default function Timeline({ steps, running }: { steps: Step[]; running: boolean }) {
  return (
    <section className="panel flex flex-col p-5">
      <div className="label mb-3">Session timeline</div>
      {steps.length === 0 && !running && <p className="text-sm text-slate-500">Press <b>Run live session</b> to watch a full test, step by step.</p>}
      <ol className="space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: 420 }}>
        {steps.map((s, i) => {
          const d = describe(s);
          return (
            <li key={i} className="slide-in flex gap-3">
              <span className={`mt-0.5 ${d.tone}`}>{d.icon}</span>
              <div>
                <div className={`text-sm font-semibold ${d.tone}`}>{d.title}</div>
                <div className="font-mono text-[11px] text-slate-500">{d.detail}</div>
              </div>
            </li>
          );
        })}
        {running && <li className="shimmer h-3 w-40 rounded" />}
      </ol>
    </section>
  );
}
