"""Runs Blue's defense as a sealed unit: raw prompt in, VERDICT ONLY out.
Output is schema-validated, so extra fields (a leak channel) are stripped.
Fails CLOSED (block) on crash/timeout/garbage.
NOTE: subprocess+rlimits is the hackathon stand-in for WASM/gVisor (see README)."""
import json, os, resource, subprocess, sys, tempfile

VERDICTS = {"allow", "block", "rewrite"}
last_error = None   # for debugging


def _limits():
    for name, val in (("RLIMIT_CPU", (2, 2)), ("RLIMIT_AS", (512 * 2**20, 512 * 2**20)),
                      ("RLIMIT_NOFILE", (64, 64)), ("RLIMIT_FSIZE", (0, 0))):
        try:
            resource.setrlimit(getattr(resource, name), val)
        except Exception:
            pass    # some OSes (macOS) refuse some limits; keep going


def run_blue(code: str, prompt: str, timeout=2.0) -> dict:
    global last_error
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "defense.py")
        open(path, "w").write(code)
        try:
            p = subprocess.run([sys.executable, "-I", path], input=prompt.encode(),
                               capture_output=True, timeout=timeout, env={}, cwd=d,
                               preexec_fn=_limits)
            raw = json.loads(p.stdout.decode())
            v = raw["verdict"]
            if v not in VERDICTS:
                raise ValueError("bad verdict")
            out = {"verdict": v, "score": round(min(max(float(raw.get("score", 0)), 0.0), 1.0), 1)}
            if v == "rewrite":
                out["rewrite"] = str(raw.get("rewrite", ""))[:1000]
            return out                     # nothing else crosses the boundary
        except Exception as e:
            last_error = repr(e)
            return {"verdict": "block", "score": 1.0, "error": True}
