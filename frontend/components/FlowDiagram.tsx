import { ArrowRight, Boxes, Brain, Bug, FileLock2, Lock, Swords } from "lucide-react";
import type { ReactNode } from "react";

type NodeDef = { id: string; title: string; sub: string; color: string; icon: ReactNode };

const NODES: Record<string, NodeDef> = {
  red: { id: "red", title: "Red Team", sub: "Sends attacks. Sees verdicts only, never the defense.", color: "#ff4d6d", icon: <Swords className="h-5 w-5" /> },
  gateway: { id: "gateway", title: "Gateway", sub: "Sessions · commit-reveal · timing normalizer", color: "#22e6a8", icon: <Boxes className="h-5 w-5" /> },
  model: { id: "model", title: "LLM Service", sub: "Per-session cache salt · flushed after every session", color: "#a78bfa", icon: <Brain className="h-5 w-5" /> },
  audit: { id: "audit", title: "Audit Chain", sub: "Hash-chained · Ed25519-signed · hashes only", color: "#ffb020", icon: <FileLock2 className="h-5 w-5" /> },
  blue: { id: "blue", title: "Blue Sealed Module", sub: "Raw prompt in, verdict out. Nothing else escapes.", color: "#4da3ff", icon: <Lock className="h-5 w-5" /> },
  canary: { id: "canary", title: "Canary Auditor", sub: "Scans every visible surface for foreign secrets", color: "#f472b6", icon: <Bug className="h-5 w-5" /> },
};

function Node({ n, active }: { n: NodeDef; active: boolean }) {
  return (
    <div
      className={`panel relative flex-1 p-4 transition-all duration-300 ${active ? "node-active scale-[1.02]" : "opacity-80"}`}
      style={{ ["--glow" as any]: n.color + "88", borderColor: active ? n.color : undefined }}
    >
      <div className="mb-2 flex items-center gap-2" style={{ color: n.color }}>
        {n.icon}
        <span className="text-sm font-bold">{n.title}</span>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">{n.sub}</p>
    </div>
  );
}

export default function FlowDiagram({ active }: { active: string[] }) {
  const on = (id: string) => active.includes(id);
  const Arrow = () => <ArrowRight className="hidden h-5 w-5 shrink-0 text-slate-600 md:block" />;
  return (
    <section className="panel p-5">
      <div className="label mb-3">Live architecture</div>
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        <Node n={NODES.red} active={on("red")} /> <Arrow />
        <Node n={NODES.gateway} active={on("gateway")} /> <Arrow />
        <Node n={NODES.model} active={on("model")} />
      </div>
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-stretch">
        <Node n={NODES.blue} active={on("blue")} />
        <Node n={NODES.audit} active={on("audit")} />
        <Node n={NODES.canary} active={on("canary")} />
      </div>
    </section>
  );
}
