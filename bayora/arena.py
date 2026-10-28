"""Core logic: sessions, auth, commit-reveal, sealed Blue, timing normalizer, canaries, certificate."""
import hashlib, json, secrets, statistics, time
from dataclasses import dataclass, field
from .audit import AuditChain, verify_chain
from .blue_runner import run_blue
from .canary import new_canary, scan


def H(x) -> str:
    return hashlib.sha256(x if isinstance(x, bytes) else x.encode()).hexdigest()


def make_commit(salt: str, data: str) -> str:
    return H(salt + "|" + data)


@dataclass
class Session:
    sid: str
    salt: str
    canaries: dict
    tokens: dict
    red_commit: str = None
    blue_commit: str = None
    blue_code: str = None
    red_reveal: dict = None
    blue_reveal: dict = None
    state: str = "created"
    prompts: list = field(default_factory=list)       # hashes only
    responses: list = field(default_factory=list)     # what Red could see
    verdicts: list = field(default_factory=list)      # what Blue could see
    cross_hits: int = 0
    obs_ms: list = field(default_factory=list)        # latency Red actually observed (after padding)
    overflows: int = 0                                # responses slower than the timing bucket


class Arena:
    def __init__(self, model, audit: AuditChain, salting=True, quantize_ms=250, leaky_debug=False,
                 require_auth=False, max_prompts=500, max_len=4000):
        self.model, self.audit = model, audit
        self.salting, self.quantize_ms, self.leaky_debug = salting, quantize_ms, leaky_debug
        self.require_auth, self.max_prompts, self.max_len = require_auth, max_prompts, max_len
        self.sessions, self._last_prompt_raw = {}, ""

    # ---- auth ------------------------------------------------------
    def _auth(self, s, role, token):
        """role: 'red' | 'blue' | 'any'. Enforced only when require_auth=True (the HTTP gateway)."""
        if not self.require_auth:
            return
        roles = ("red", "blue") if role == "any" else (role,)
        if any(secrets.compare_digest(token or "", s.tokens[r]) for r in roles):
            return
        self.audit.append(s.sid, "AUTH_DENIED", H(role))
        raise PermissionError(f"token not valid for role '{role}'")

    # ---- lifecycle -------------------------------------------------
    def create(self):
        sid = secrets.token_hex(4)
        s = Session(sid, secrets.token_hex(8),
                    {"red": new_canary("red"), "blue": new_canary("blue")},
                    {"red": secrets.token_urlsafe(16), "blue": secrets.token_urlsafe(16)})
        self.sessions[sid] = s
        self.audit.append(sid, "SESSION_CREATE")
        return {"session_id": sid, "red_canary": s.canaries["red"], "blue_canary": s.canaries["blue"],
                "red_token": s.tokens["red"], "blue_token": s.tokens["blue"]}

    def commit_red(self, sid, commit, token=None):
        s = self._s(sid); self._auth(s, "red", token)
        s.red_commit = commit
        self.audit.append(sid, "RED_COMMIT", commit)

    def commit_blue(self, sid, commit, code, token=None):
        s = self._s(sid); self._auth(s, "blue", token)
        s.blue_commit, s.blue_code = commit, code     # code stays server-side, never shown to Red
        self.audit.append(sid, "BLUE_COMMIT", commit)

    def open(self, sid, token=None):
        s = self._s(sid); self._auth(s, "any", token)
        if not (s.red_commit and s.blue_commit):
            raise ValueError("both sides must commit before the session opens")
        s.state = "open"
        self.audit.append(sid, "SESSION_OPEN")

    # ---- the hot path ----------------------------------------------
    def prompt(self, sid, text, token=None):
        t0 = time.perf_counter()
        s = self._s(sid, "open"); self._auth(s, "red", token)
        if len(text) > self.max_len:
            raise ValueError("prompt too long")
        if len(s.prompts) >= self.max_prompts:
            raise ValueError("per-session prompt limit reached")
        ph = H(text)
        s.prompts.append(ph)
        self._last_prompt_raw = text
        self.audit.append(sid, "PROMPT", ph)                     # hash only
        v = run_blue(s.blue_code, text)                          # verdict only
        s.verdicts.append(json.dumps(v, sort_keys=True))
        self.audit.append(sid, "VERDICT", H(s.verdicts[-1]))
        if v["verdict"] == "block":
            resp = "[blocked by defense]"
        else:
            sent = v.get("rewrite", text) if v["verdict"] == "rewrite" else text
            resp, meta = self.model.generate(sid, s.salt, sent, self.salting)
            s.cross_hits += bool(meta.get("cross_session_hit"))
        # timing normalizer: pad total handling time up to the next fixed bucket
        if self.quantize_ms:
            el = (time.perf_counter() - t0) * 1000
            s.overflows += el >= self.quantize_ms      # bucket too small: padding can no longer hide this
            target = (int(el // self.quantize_ms) + 1) * self.quantize_ms
            time.sleep(max(target - el, 0) / 1000)
        s.obs_ms.append((time.perf_counter() - t0) * 1000)
        s.responses.append(resp)
        return {"verdict": v["verdict"], "score": v["score"], "response": resp}

    def verdicts(self, sid, token=None):
        """Blue's view: verdicts only, never raw payloads."""
        s = self._s(sid); self._auth(s, "blue", token)
        return [json.loads(v) for v in s.verdicts]

    # ---- what each side can see (for the canary scanner) -----------
    def metrics(self):
        m = {"sessions": len(self.sessions), "prompts": sum(len(s.prompts) for s in self.sessions.values())}
        if self.leaky_debug:                       # deliberate misconfiguration for the demo
            m["debug_last_prompt"] = self._last_prompt_raw
        return m

    def surfaces(self, sid):
        s = self._s(sid)
        return {"api_responses": ("red", "\n".join(s.responses)),
                "metrics_endpoint": ("both", json.dumps(self.metrics())),
                "audit_dump": ("both", self.audit.dump()),
                "blue_verdict_feed": ("blue", "\n".join(s.verdicts))}

    # ---- reveal, verify, certify -----------------------------------
    def reveal_red(self, sid, salt, payloads, token=None):
        s = self._s(sid, "open"); self._auth(s, "red", token)
        s.red_reveal = {"salt": salt, "payloads": payloads}

    def reveal_blue(self, sid, salt, token=None):
        s = self._s(sid, "open"); self._auth(s, "blue", token)
        s.blue_reveal = {"salt": salt}

    def finalize(self, sid, token=None):
        s = self._s(sid, "open"); self._auth(s, "any", token)
        if not (s.red_reveal and s.blue_reveal):
            raise ValueError("both sides must reveal before the session can be certified")
        return self._finish(s)

    def end(self, sid, red_salt, payloads, blue_salt):
        """In-process shortcut (demo/tests): both reveals at once."""
        s = self._s(sid, "open")
        s.red_reveal, s.blue_reveal = {"salt": red_salt, "payloads": payloads}, {"salt": blue_salt}
        return self._finish(s)

    def _finish(self, s):
        sid = s.sid
        payloads = s.red_reveal["payloads"]
        red_ok = (make_commit(s.red_reveal["salt"], json.dumps(payloads)) == s.red_commit
                  and set(s.prompts) <= {H(p) for p in payloads})   # nothing sent outside the committed set
        blue_ok = make_commit(s.blue_reveal["salt"], s.blue_code) == s.blue_commit
        self.audit.append(sid, "REVEAL_RED_" + ("OK" if red_ok else "FAIL"))
        self.audit.append(sid, "REVEAL_BLUE_" + ("OK" if blue_ok else "FAIL"))
        hits = scan(self.surfaces(sid), s.canaries)
        self.model.flush(sid)
        self.audit.append(sid, "SESSION_END")
        chain_ok, bad, n = verify_chain(self.audit.db_path, self.audit.pub_path)
        cv = (statistics.pstdev(s.obs_ms) / statistics.mean(s.obs_ms)) if len(s.obs_ms) >= 3 else 0.0
        jitter_flag = s.overflows > 0 or cv > 0.15          # resource interference leaked into timing
        score = max(0, 100 - 50 * len(hits) - 40 * (not chain_ok) - 40 * (not red_ok)
                    - 40 * (not blue_ok) - 30 * min(s.cross_hits, 1) - 15 * jitter_flag)
        cert = {"session_id": sid, "red_commit": s.red_commit, "blue_commit": s.blue_commit,
                "red_reveal_ok": red_ok, "blue_reveal_ok": blue_ok, "chain_ok": chain_ok,
                "chain_head": self.audit.head(), "canary_hits": hits,
                "cross_session_cache_hits": s.cross_hits, "latency_cv": round(cv, 3),
                "bucket_overflows": s.overflows, "jitter_flag": jitter_flag, "integrity_score": score,
                "verdict": "TRUSTED" if score >= 90 else "FLAGGED"}
        body = json.dumps(cert, sort_keys=True)
        cert["signature"], cert["pubkey"] = self.audit.sign(body.encode()), self.audit.public_key_hex()
        s.state = "ended"
        return cert

    def _s(self, sid, state=None):
        s = self.sessions.get(sid)
        if not s:
            raise ValueError("unknown session")
        if state and s.state != state:
            raise ValueError(f"session is {s.state}, expected {state}")
        return s


def bootstrap(arena, payloads, blue_code):
    """Test helper (auth OFF): runs both parties' commit steps and opens the session."""
    c = arena.create()
    red_salt, blue_salt = secrets.token_hex(8), secrets.token_hex(8)
    code = blue_code + f"\n# {c['blue_canary']}\n"
    pl = [p + f" {c['red_canary']}" if i == 0 else p for i, p in enumerate(payloads)]
    arena.commit_red(c["session_id"], make_commit(red_salt, json.dumps(pl)))
    arena.commit_blue(c["session_id"], make_commit(blue_salt, code), code)
    arena.open(c["session_id"])
    return c["session_id"], {"red_salt": red_salt, "blue_salt": blue_salt, "payloads": pl, "code": code}