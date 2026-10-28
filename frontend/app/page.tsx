"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { AuditRow, BenchState, Cert, Hit, Step, TimingState, Verify } from "@/lib/types";
import Header from "@/components/Header";
import FlowDiagram from "@/components/FlowDiagram";
import Controls from "@/components/Controls";
import Timeline from "@/components/Timeline";
import VerdictFeed from "@/components/VerdictFeed";
import CertCard, { Verif } from "@/components/CertCard";
import DefensePanel from "@/components/DefensePanel";
import TimingPanel from "@/components/TimingPanel";
import ChainView from "@/components/ChainView";
import CanaryPanel from "@/components/CanaryPanel";
import ResidualRisk from "@/components/ResidualRisk";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Page() {
  const [online, setOnline] = useState(false);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [verify, setVerify] = useState<Verify | null>(null);
  const [tampered, setTampered] = useState(false);
  const [timeline, setTimeline] = useState<Step[]>([]);
  const [verdicts, setVerdicts] = useState<Step[]>([]);
  const [cert, setCert] = useState<Cert | null>(null);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [active, setActive] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [leak, setLeak] = useState(false);
  const [noisy, setNoisy] = useState(false);
  const [verif, setVerif] = useState<Verif>(null);
  const [bench, setBench] = useState<BenchState | null>(null);
  const [benchBusy, setBenchBusy] = useState(false);
  const [timing, setTiming] = useState<TimingState | null>(null);
  const [error, setError] = useState("");
  const startedTiming = useRef(false);

  const refreshAudit = useCallback(async () => {
    try {
      const a = await api.audit();
      setRows(a.rows); setVerify(a.verify); setTampered(a.tampered); setOnline(true);
    } catch { setOnline(false); }
  }, []);

  useEffect(() => { refreshAudit(); const t = setInterval(refreshAudit, 4000); return () => clearInterval(t); }, [refreshAudit]);

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        let t = await api.timing();
        if (t.status === "idle" && !startedTiming.current) { startedTiming.current = true; t = await api.startTiming(); }
        if (!stop) setTiming(t);
      } catch { /* gateway offline; header shows it */ }
    };
    poll();
    const iv = setInterval(() => { if (!timing || timing.status !== "done") poll(); }, 2500);
    return () => { stop = true; clearInterval(iv); };
  }, [timing?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const runBench = useCallback(async () => {
    setBenchBusy(true);
    try { setBench(await api.runScore()); } catch (e: any) { setError(`Benchmark failed: ${e.message}`); }
    setBenchBusy(false);
  }, []);
  useEffect(() => { runBench(); }, [runBench]);

  const verifyCert = async (forge: boolean) => {
    if (!cert) return;
    let c: Cert = cert, note = "";
    if (forge) {
      if (cert.verdict === "FLAGGED") { c = { ...cert, integrity_score: 100, verdict: "TRUSTED", canary_hits: [], jitter_flag: false }; note = `edited: score ${cert.integrity_score} -> 100, verdict FLAGGED -> TRUSTED`; }
      else { c = { ...cert, red_commit: "0".repeat(64) }; note = "edited: Red's commitment swapped"; }
    }
    try { setVerif({ ...(await api.verifyCert(c)), forged: forge, note }); } catch (e: any) { setError(String(e.message || e)); }
  };

  const apply = (st: Step) => {
    setTimeline((t) => [...t, st]);
    switch (st.type) {
      case "create": setActive(["red", "gateway"]); break;
      case "auth_denied": setActive(["gateway"]); break;
      case "commit": setActive([st.side, "audit"]); break;
      case "open": setActive(["gateway", "audit"]); break;
      case "prompt":
        setVerdicts((v) => [...v, st]);
        setActive(st.verdict === "block" ? ["red", "gateway", "blue"] : ["red", "gateway", "blue", "model"]);
        break;
      case "blue_view": setActive(["blue"]); break;
      case "canary": setHits(st.hits); setActive(["canary"]); break;
      case "reveal": setActive(["audit"]); break;
      case "certificate": setCert(st.cert); setActive(["audit", "canary"]); break;
    }
  };

  const run = async () => {
    setError(""); setRunning(true);
    setTimeline([]); setVerdicts([]); setCert(null); setHits(null); setActive([]); setVerif(null);
    try {
      const { steps } = await api.run(leak, noisy);
      for (const st of steps) { await sleep(650); apply(st); refreshAudit(); }
      await sleep(900); setActive([]);
    } catch (e: any) { setError(`Could not run session: ${e.message}`); }
    setRunning(false); refreshAudit();
  };

  const guard = (fn: () => Promise<unknown>) => async () => {
    setError("");
    try { await fn(); } catch (e: any) { setError(String(e.message || e)); }
    refreshAudit();
  };

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-5 py-8">
      <Header online={online} verify={verify} />
      <Controls running={running} leak={leak} setLeak={setLeak} noisy={noisy} setNoisy={setNoisy} tampered={tampered} error={error}
        onRun={run} onVerify={refreshAudit}
        onTamper={guard(api.tamper)} onRestore={guard(api.restore)} />
      <FlowDiagram active={active} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1"><Timeline steps={timeline} running={running} /></div>
        <div className="space-y-5 lg:col-span-2">
          <VerdictFeed rows={verdicts} />
          <div className="grid gap-5 md:grid-cols-2"><CertCard cert={cert} verif={verif} onVerify={verifyCert} /><CanaryPanel hits={hits} /></div>
        </div>
      </div>
      <ChainView rows={rows} verify={verify} />
      <DefensePanel b={bench} onRun={runBench} busy={benchBusy} />
      <TimingPanel t={timing} onRun={guard(async () => { startedTiming.current = true; setTiming(await api.startTiming()); })} />
      <ResidualRisk />
      <footer className="pb-6 text-center text-xs text-slate-600">Bayora Blind Arena · Hack in Hills &apos;26 · Track 04</footer>
    </main>
  );
}