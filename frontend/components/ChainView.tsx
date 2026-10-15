import { Link2, Link2Off } from "lucide-react";
import { AuditRow, Verify } from "@/lib/types";

export default function ChainView({ rows, verify }: { rows: AuditRow[]; verify: Verify | null }) {
  const bad = verify && !verify.ok ? verify.bad_index : null;
  const shown = rows.slice(-12);
  return (
    <section className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="label">Tamper-evident audit chain (latest {shown.length})</div>
        <span className="text-[11px] text-slate-500">each block commits to the previous block&apos;s hash</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {shown.length === 0 && <p className="text-sm text-slate-500">Empty. Run a session to start the chain.</p>}
        {shown.map((r, i) => {
          const isBad = bad === r.idx;
          const after = bad !== null && r.idx > bad;
          return (
            <div key={r.idx} className="flex items-center gap-2">
              {i > 0 && (after || isBad ? <Link2Off className="h-4 w-4 shrink-0 text-red-team" /> : <Link2 className="h-4 w-4 shrink-0 text-slate-600" />)}
              <div className={`slide-in w-40 shrink-0 rounded-xl border p-3 font-mono text-[10px] transition ${isBad ? "border-red-team bg-red-team/15 shake" : after ? "border-red-team/40 bg-red-team/5 opacity-70" : "border-line bg-ink/60"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">#{r.idx}</span>
                  <span className={isBad ? "font-bold text-red-team" : "text-ok"}>{isBad ? "TAMPERED" : after ? "UNTRUSTED" : "VALID"}</span>
                </div>
                <div className="mt-1 truncate text-[11px] font-bold text-slate-200">{r.event}</div>
                <div className="mt-1 text-slate-500">data {r.payload_hash === "-" ? "—" : r.payload_hash.slice(0, 8)}</div>
                <div className="text-slate-500">prev {r.prev.slice(0, 8)}</div>
                <div className="text-slate-400">hash {r.hash.slice(0, 8)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
