export type Hit = { surface: string; leaked: string; visible_to: string };
export type Cert = {
  session_id: string; red_commit: string; blue_commit: string;
  red_reveal_ok: boolean; blue_reveal_ok: boolean; chain_ok: boolean; chain_head: string;
  canary_hits: Hit[]; cross_session_cache_hits: number;
  latency_cv: number; bucket_overflows: number; jitter_flag: boolean;
  integrity_score: number; verdict: "TRUSTED" | "FLAGGED"; signature: string; pubkey: string;
};
export type Step = { type: string; [k: string]: any };
export type AuditRow = { idx: number; session: string; event: string; payload_hash: string; ts: string; prev: string; hash: string };
export type Verify = { ok: boolean; bad_index: number | null; rows: number };
export type TimingRow = { name: string; accuracy: number; bits: number; bits_upper: number; hit_ms: number; miss_ms: number };
export type TimingState = { status: "idle" | "running" | "done" | "error"; results: TimingRow[]; error: string | null };
export type DefenseResult = {
  name: string; detection_rate: number; false_positive_rate: number; precision: number; f1: number;
  attacks: number; benign: number; errors: number;
  per_category: Record<string, { total: number; caught: number }>;
  missed: { id: string; category: string; desc: string }[];
  false_positives: { id: string; desc: string }[];
};
export type BenchState = { status: "idle" | "done" | "error"; results: { baseline: DefenseResult; hardened: DefenseResult } | null; error: string | null };
export type CertCheck = { valid: boolean; signature_ok: boolean; key_trusted: boolean | null; chain_head_in_log: boolean | null; reasons: string[]; key_fingerprint: string };