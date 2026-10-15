import { Step } from "@/lib/types";

export default function VerdictFeed({ rows }: { rows: Step[] }) {
  return (
    <section className="panel p-5">
      <div className="mb-1 flex items-center justify-between">
        <div className="label">What Red sees: verdicts, not defenses</div>
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-slate-400">payloads shown as hashes</span>
      </div>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-[11px] uppercase text-slate-500">
          <tr><th className="pb-2">#</th><th>Payload</th><th>Type</th><th>Verdict</th><th className="text-right">Risk</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="py-4 text-slate-500">No attacks yet.</td></tr>}
          {rows.map((r) => (
            <tr key={r.n} className="slide-in border-t border-line/70">
              <td className="py-2 text-slate-500">{r.n}</td>
              <td className="font-mono text-xs text-slate-300">#{r.payload_hash}</td>
              <td className="text-xs text-slate-400">{r.tag}</td>
              <td>
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${r.verdict === "block" ? "bg-red-team/15 text-red-team" : r.verdict === "allow" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>
                  {String(r.verdict).toUpperCase()}
                </span>
              </td>
              <td className="text-right font-mono text-xs">
                <span className="mr-2 inline-block h-1.5 w-14 overflow-hidden rounded bg-line align-middle">
                  <span className="block h-full" style={{ width: `${r.score * 100}%`, background: r.score > 0.5 ? "#ff4d6d" : "#22e6a8" }} />
                </span>
                {r.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
