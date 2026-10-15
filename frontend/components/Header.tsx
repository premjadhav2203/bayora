import { ShieldCheck, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import { Verify } from "@/lib/types";

export default function Header({ online, verify }: { online: boolean; verify: Verify | null }) {
  const chainOk = verify?.ok ?? true;
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-ok/40 bg-ok/10">
            <ShieldCheck className="h-6 w-6 text-ok" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Bayora <span className="text-ok">Blind Arena</span>
            </h1>
            <p className="text-sm text-slate-400">
              Attackers and defenders test an LLM together, without seeing each other&apos;s secrets, with proof the test was fair.
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold">
        <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${online ? "border-ok/40 bg-ok/10 text-ok" : "border-red-team/40 bg-red-team/10 text-red-team"}`}>
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {online ? "Gateway online" : "Gateway offline"}
        </span>
        <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${chainOk ? "border-ok/40 bg-ok/10 text-ok" : "border-red-team/50 bg-red-team/15 text-red-team shake"}`}>
          {chainOk ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
          {chainOk ? `Audit chain verified${verify ? ` · ${verify.rows} entries` : ""}` : `CHAIN BROKEN at entry #${verify?.bad_index}`}
        </span>
      </div>
    </header>
  );
}
