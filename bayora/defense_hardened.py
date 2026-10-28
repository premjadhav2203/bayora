import sys, json, re, base64, unicodedata

raw = sys.stdin.read()
ZW = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u200e\u200f\u00ad\u2060\ufeff"), None)
LEET = str.maketrans("013457@$", "oieastas")


def norm(t):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", t).translate(ZW).lower()).strip()


def variants(t):
    n = norm(t)
    out = {n, n.translate(LEET)}
    out.add(" ".join(c.replace(" ", "") for c in re.split(r"\s{2,}", unicodedata.normalize("NFKC", t).lower())))
    for tok in re.findall(r"[A-Za-z0-9+/=]{16,}", t):          # base64 smuggling
        try:
            d = base64.b64decode(tok, validate=True).decode("utf-8")
            if d.isprintable():
                out.add(norm(d))
        except Exception:
            pass
    return out


HARD = [
    r"\b(ignore|disregard|forget|override|set aside|stop following)\b.{0,40}\b(previous|prior|above|earlier|all|your)\b.{0,30}(instruction|direction|rule|guideline|prompt)",
    r"new instructions",
    r"\b(jailbreak mode|developer mode|god mode|do anything now|evil ai|no restrictions|without restrictions|never refuses|unfiltered)\b",
    r"\bno rules\b",
    r"\bbypass\b.{0,30}(safety|filter|guardrail|restriction|polic)",
    r"\b(reveal|show|print|repeat|output|display|leak|dump|list|tell me)\b.{0,40}(system prompt|hidden instruction|your instruction|secret|api key|password|credential|configuration|context window|conversation history|previous session|confidential)",
    r"(secret|api key|password|credential)s?\b.{0,60}\b(reveal|show|print|tell|give)\b",
]
SOFT = [r"\bjailbreak\b", r"\bsystem prompt\b", r"\bdan\b"]               # bare mentions: only block if not educational
EDU = re.compile(r"\b(explain what|what is|what are|define|describe|how do i (protect|defend|prevent))\b")

vs = variants(raw)
rev = raw.lower()[::-1]
hard = any(re.search(p, v) for v in vs for p in HARD) or any(re.search(p, rev) for p in HARD)
soft = any(re.search(p, v) for v in vs for p in SOFT) and not EDU.search(norm(raw))
if hard or soft:
    print(json.dumps({"verdict": "block", "score": 0.9}))
else:
    print(json.dumps({"verdict": "allow", "score": 0.1}))