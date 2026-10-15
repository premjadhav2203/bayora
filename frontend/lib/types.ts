export type Hit = { surface: string; leaked: string; visible_to: string };
export type Cert = {
  session_id: string; red_commit: string; blue_commit: string;
  red_reveal_ok: boolean; blue_reveal_ok: boolean; chain_ok: boolean; chain_head: string;
  canary_hits: Hit[]; cross_session_cache_hits: number; integrity_score: number;
  verdict: "TRUSTED" | "FLAGGED"; signature: string; pubkey: string;
};
export type Step = { type: string; [k: string]: any };
export type AuditRow = { idx: number; session: string; event: string; payload_hash: string; ts: string; prev: string; hash: string };
export type Verify = { ok: boolean; bad_index: number | null; rows: number };
export type TimingRow = { name: string; accuracy: number; bits: number; bits_upper: number; hit_ms: number; miss_ms: number };
export type TimingState = { status: "idle" | "running" | "done" | "error"; results: TimingRow[]; error: string | null };
