import { Check, X, Fingerprint, ShieldCheck, FileX2 } from "lucide-react";
import { Cert, CertCheck } from "@/lib/types";

export type Verif = (CertCheck & { forged: boolean; note: string }) | null;

function Ring({ score, ok }: { score: number; ok: boolean }) {
  const r = 54, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36 -rotate-90">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#1c2940" strokeWidth="10" />
      <circle cx="70" cy="70" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
        stroke={ok ? "#22e6a8" : "#ffb020"} strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
        style={{ transition: "stroke-dashoffset 1s ease, stroke .4s" }} />
    </svg>
  );
}

function Check1({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${ok ? "bg-ok/20 text-ok" : "bg-red-team/20 text-red-team"}`}>
        {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </span>
      <span className={ok ? "text-slate-200" : "text-red-team"}>{label}</span>
    </li>
  );
}

export default function CertCard({ cert, verif, onVerify }: { cert: Cert | null; verif: Verif; onVerify: (forge: boolean) => void }) {
  const ok = cert?.verdict === "TRUSTED";
  return (
    <section className={`panel p-5 transition ${cert ? (ok ? "border-ok/50" : "border-warn/60") : ""}`}>
      <div className="label mb-3">Test integrity certificate</div>
      {!cert ? (
        <p className="text-sm text-slate-500">Issued at the end of each session. Every finding ships with proof the test was fair.</p>
      ) : (
        <div className="slide-in">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Ring score={cert.integrity_score} ok={ok} />
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-3xl font-extrabold">{cert.integrity_score}</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">integrity</div>
                </div>
              </div>
            </div>
            <div>
              <div className={`text-2xl font-extrabold ${ok ? "text-ok" : "text-warn"}`}>{cert.verdict}</div>
              <div className="font-mono text-[11px] text-slate-500">session {cert.session_id}</div>
              <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-slate-500">
                <Fingerprint className="h-3 w-3" /> sig {cert.signature.slice(0, 18)}…
              </div>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            <Check1 ok={cert.red_reveal_ok} label="Red reveal matches its commitment" />
            <Check1 ok={cert.blue_reveal_ok} label="Blue reveal matches its commitment" />
            <Check1 ok={cert.chain_ok} label="Audit chain verified end to end" />
            <Check1 ok={cert.canary_hits.length === 0} label={cert.canary_hits.length ? `${cert.canary_hits.length} canary leak(s) detected` : "No canary leaks"} />
            <Check1 ok={cert.cross_session_cache_hits === 0} label="No cross-session cache hits" />
            <Check1 ok={!cert.jitter_flag} label={cert.jitter_flag ? `Timing jitter detected (CV ${cert.latency_cv}, ${cert.bucket_overflows} bucket overflows)` : "Stable response timing (no interference)"} />
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => onVerify(false)} className="flex items-center gap-1.5 rounded-lg border border-ok/50 px-3 py-1.5 text-xs font-semibold text-ok hover:bg-ok/10">
              <ShieldCheck className="h-3.5 w-3.5" /> Verify signature
            </button>
            <button onClick={() => onVerify(true)} className="flex items-center gap-1.5 rounded-lg border border-red-team/50 px-3 py-1.5 text-xs font-semibold text-red-team hover:bg-red-team/10">
              <FileX2 className="h-3.5 w-3.5" /> Forge certificate
            </button>
          </div>
          {verif && (
            <div className={`slide-in mt-3 rounded-lg border px-3 py-2 text-xs ${verif.valid ? "border-ok/50 bg-ok/10 text-ok" : "border-red-team/50 bg-red-team/10 text-red-team shake"}`}>
              <b>{verif.valid ? "SIGNATURE VALID" : "CERTIFICATE REJECTED"}</b>
              {verif.forged && <span className="ml-1 text-slate-400">({verif.note})</span>}
              <div className="mt-0.5 text-[11px] opacity-90">
                {verif.valid ? `signed by the trusted gateway key ${verif.key_fingerprint}…, chain head found in the audit log` : verif.reasons.join("; ")}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}