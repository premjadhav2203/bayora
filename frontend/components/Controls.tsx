import { Bug, Play, RotateCcw, ScanSearch, Hammer, Loader2 } from "lucide-react";

type P = {
  running: boolean; leak: boolean; setLeak: (b: boolean) => void; tampered: boolean;
  onRun: () => void; onTamper: () => void; onRestore: () => void; onVerify: () => void; error: string;
};

export default function Controls({ running, leak, setLeak, tampered, onRun, onTamper, onRestore, onVerify, error }: P) {
  const btn = "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40";
  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onRun} disabled={running} className={`${btn} border-ok/60 bg-ok/15 text-ok hover:bg-ok/25`}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Session running..." : "Run live session"}
        </button>
        <label className={`${btn} cursor-pointer select-none border-line ${leak ? "border-warn/60 bg-warn/10 text-warn" : "text-slate-300"}`}>
          <input type="checkbox" className="hidden" checked={leak} onChange={(e) => setLeak(e.target.checked)} disabled={running} />
          <Bug className="h-4 w-4" /> Inject leak (misconfigured /metrics): {leak ? "ON" : "OFF"}
        </label>
        <div className="mx-1 hidden h-8 w-px bg-line md:block" />
        {!tampered ? (
          <button onClick={onTamper} disabled={running} className={`${btn} border-red-team/50 text-red-team hover:bg-red-team/10`}>
            <Hammer className="h-4 w-4" /> Tamper with audit log
          </button>
        ) : (
          <button onClick={onRestore} className={`${btn} border-warn/60 bg-warn/10 text-warn`}>
            <RotateCcw className="h-4 w-4" /> Restore log
          </button>
        )}
        <button onClick={onVerify} className={`${btn} border-line text-slate-200 hover:bg-white/5`}>
          <ScanSearch className="h-4 w-4" /> Verify chain
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-red-team">{error}</p>}
    </section>
  );
}
