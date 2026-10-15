import { Loader2, Timer } from "lucide-react";
import { TimingState } from "@/lib/types";

export default function TimingPanel({ t, onRun }: { t: TimingState | null; onRun: () => void }) {
  const running = t?.status === "running";
  return (
    <section className="panel p-5">
      <div className="mb-1 flex items-center justify-between">
        <div className="label flex items-center gap-2"><Timer className="h-3.5 w-3.5" /> LLM-native side channel: cache-timing attack</div>
        <button onClick={onRun} disabled={running} className="rounded-lg border border-line px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-40">
          {running ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> measuring…</span> : "Re-run attack"}
        </button>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        A classifier tries to tell, from latency alone, whether another session already sent a prompt. 50% = pure chance = no leakage.
      </p>
      {t?.status === "error" && <p className="text-xs text-red-team">Error: {t.error}</p>}
      {(!t || t.results.length === 0) && <div className="shimmer h-24 rounded-xl" />}
      <div className="space-y-4">
        {t?.results.map((r, i) => {
          const leaked = r.accuracy > 0.65;
          return (
            <div key={r.name} className="slide-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="mb-1 flex items-end justify-between text-sm">
                <span className="font-semibold">{r.name}</span>
                <span className={`font-mono text-xs ${leaked ? "text-red-team" : "text-ok"}`}>
                  {(r.accuracy * 100).toFixed(1)}% attacker accuracy · {r.bits.toFixed(2)} bits/probe
                </span>
              </div>
              <div className="relative h-4 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${r.accuracy * 100}%`, background: leaked ? "linear-gradient(90deg,#ff4d6d,#ff8aa0)" : "linear-gradient(90deg,#22e6a8,#6af0c8)" }} />
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/70" title="chance" />
              </div>
              <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
                <span>cache hit {r.hit_ms.toFixed(0)} ms · miss {r.miss_ms.toFixed(0)} ms</span>
                <span>95% upper bound: {r.bits_upper.toFixed(2)} bits</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-[11px] text-warn/90">
        Honest note: timings come from a simulated prefix cache (about 80 probes per row, so ±10% noise). The method applies to a real model backend.
      </p>
    </section>
  );
}
