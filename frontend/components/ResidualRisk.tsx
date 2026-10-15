import { AlertTriangle, ArrowUpRight } from "lucide-react";

const NOT_COVERED = [
  "Kernel / container-escape zero-days",
  "Hardware side channels (Spectre-class)",
  "Compromised host or admin",
  "Model-weight extraction",
  "Small leftover timing leakage (measured above, not zero)",
  "Blue sandbox is subprocess-based here (production: WASM / gVisor)",
];
const UPGRADES = ["Kata / Firecracker microVMs", "Confidential computing (SEV-SNP / TDX)", "TPM-anchored log signing", "Wasmtime sealed Blue modules"];

export default function ResidualRisk() {
  return (
    <section className="panel p-5">
      <div className="label mb-3 flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-warn" /> Residual risk (what we do not claim)</div>
      <div className="grid gap-5 md:grid-cols-2">
        <ul className="space-y-1.5 text-sm text-slate-300">{NOT_COVERED.map((t) => <li key={t} className="flex gap-2"><span className="text-warn">•</span>{t}</li>)}</ul>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Upgrade path</div>
          <ul className="space-y-1.5 text-sm text-slate-300">{UPGRADES.map((t) => <li key={t} className="flex items-center gap-2"><ArrowUpRight className="h-3.5 w-3.5 text-ok" />{t}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}
