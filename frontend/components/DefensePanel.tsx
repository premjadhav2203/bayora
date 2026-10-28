import { Loader2, Target } from "lucide-react";
import { BenchState, DefenseResult } from "@/lib/types";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function Card({ r, tone }: { r: DefenseResult; tone: string }) {
  return (
    <div className="rounded-xl border border-line p-4" style={{ borderColor: tone + "55" }}>
      <div className="mb-3 text-sm font-bold" style={{ color: tone }}>{r.name}</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><div className="text-2xl font-extrabold">{pct(r.detection_rate)}</div><div className="text-[10px] uppercase tracking-wider text-slate-500">attacks caught</div></div>
        <div><div className={`text-2xl font-extrabold ${r.false_positive_rate > 0.1 ? "text-red-team" : "text-ok"}`}>{pct(r.false_positive_rate)}</div><div className="text-[10px] uppercase tracking-wider text-slate-500">false alarms</div></div>
        <div><div className="text-2xl font-extrabold">{r.f1.toFixed(2)}</div><div className="text-[10px] uppercase tracking-wider text-slate-500">F1 score</div></div>
      </div>
      <div className="mt-4 space-y-2">
        {Object.entries(r.per_category).map(([c, v]) => (
          <div key={c}>
            <div className="mb-0.5 flex justify-between font-mono text-[11px] text-slate-400"><span>{c.replace("_", " ")}</span><span>{v.caught}/{v.total}</span></div>
            <div className="h-2 overflow-hidden rounded bg-line">
              <div className="h-full rounded transition-all duration-1000" style={{ width: `${(v.caught / v.total) * 100}%`, background: tone }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-400">Missed ({r.missed.length}):</span>{" "}
        {r.missed.length === 0 ? "none" : r.missed.map((m) => (
          <span key={m.id} title={`${m.category}: ${m.desc}`} className="mr-1 inline-block rounded bg-red-team/10 px-1.5 py-0.5 font-mono text-red-team">{m.id}</span>
        ))}
      </div>
      <div className="mt-1 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-400">False alarms ({r.false_positives.length}):</span>{" "}
        {r.false_positives.length === 0 ? "none" : r.false_positives.map((m) => (
          <span key={m.id} title={m.desc} className="mr-1 inline-block rounded bg-warn/10 px-1.5 py-0.5 font-mono text-warn">{m.id}</span>
        ))}
      </div>
    </div>
  );
}

export default function DefensePanel({ b, onRun, busy }: { b: BenchState | null; onRun: () => void; busy: boolean }) {
  return (
    <section className="panel p-5">
      <div className="mb-1 flex items-center justify-between">
        <div className="label flex items-center gap-2"><Target className="h-3.5 w-3.5" /> Defense benchmark: how good is Blue?</div>
        <button onClick={onRun} disabled={busy} className="rounded-lg border border-line px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-40">
          {busy ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> scoring…</span> : "Re-run benchmark"}
        </button>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Fair testing is only half the job. Each defense runs through the same sealed module over a 40-prompt corpus (28 attacks in 4 categories, 12 benign prompts incl. tricky ones). Hover a chip to see what it was.
      </p>
      {b?.status === "error" && <p className="text-xs text-red-team">Error: {b.error}</p>}
      {!b?.results ? <div className="shimmer h-40 rounded-xl" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card r={b.results.baseline} tone="#ff4d6d" />
          <Card r={b.results.hardened} tone="#22e6a8" />
        </div>
      )}
      <p className="mt-4 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-[11px] text-warn/90">
        Honest note: the hardened filter was written with this public corpus in view, so its score is optimistic. Real claims need a held-out set.
      </p>
    </section>
  );
}