import { Bug, Eye } from "lucide-react";
import { Hit } from "@/lib/types";

const SURFACES = [
  { id: "api_responses", label: "API responses", who: "Red" },
  { id: "metrics_endpoint", label: "/metrics endpoint", who: "Red + Blue" },
  { id: "audit_dump", label: "Audit log / dashboard", who: "Red + Blue" },
  { id: "blue_verdict_feed", label: "Blue verdict feed", who: "Blue" },
];

export default function CanaryPanel({ hits }: { hits: Hit[] | null }) {
  return (
    <section className="panel p-5">
      <div className="label mb-1 flex items-center gap-2"><Bug className="h-3.5 w-3.5" /> Chaos canary auditor</div>
      <p className="mb-3 text-xs text-slate-500">Unique secret tokens are planted in Red&apos;s payloads and Blue&apos;s policy. Any foreign token on a surface the other side can see raises an alert.</p>
      <ul className="space-y-2">
        {SURFACES.map((s) => {
          const h = hits?.filter((x) => x.surface === s.id) ?? [];
          const leaked = h.length > 0;
          return (
            <li key={s.id} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${leaked ? "border-warn/60 bg-warn/10 shake" : "border-line"}`}>
              <span className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-slate-500" /> {s.label} <span className="text-[10px] text-slate-500">({s.who})</span></span>
              <span className={`text-xs font-bold ${hits === null ? "text-slate-600" : leaked ? "text-warn" : "text-ok"}`}>
                {hits === null ? "not scanned" : leaked ? `LEAK: ${h[0].leaked.toUpperCase()} secret exposed` : "clean"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
