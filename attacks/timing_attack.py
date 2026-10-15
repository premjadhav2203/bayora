"""Red's KV/prefix-cache timing attack. A classifier tries to tell 'prefix was seen by another
session' (hit) from 'never seen' (miss) using latency only. ~50% accuracy == chance == no leakage.
Leakage is also reported in BITS per probe (binary-channel mutual information)."""
import math, random, tempfile, os, time
import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.tree import DecisionTreeClassifier
from bayora.arena import Arena, bootstrap
from bayora.audit import AuditChain
from bayora.models import MockModel

ALLOW = "import sys,json;sys.stdin.read();print(json.dumps({'verdict':'allow','score':0.1}))"
VICTIM_PROMPT = "Summarise the confidential quarterly report for the finance team in detail please"
BUCKET_MS = 250


def _h2(p):
    return 0.0 if p <= 0 or p >= 1 else -p * math.log2(p) - (1 - p) * math.log2(1 - p)


def leak_bits(acc):
    """Bits learned per probe if the attacker is right with prob `acc` (1 - H(acc)); chance -> 0."""
    return 1 - _h2(max(acc, 0.5))


def leak_bits_upper(acc, n_probes):
    """Conservative: use the 95% upper confidence bound on accuracy."""
    hi = min(acc + 1.96 * math.sqrt(max(acc * (1 - acc), 1e-9) / n_probes), 1.0)
    return leak_bits(hi)


def measure(salting, quantize_ms, n=60):
    d = tempfile.mkdtemp()
    arena = Arena(MockModel(), AuditChain(os.path.join(d, "a.db"), os.path.join(d, "k.pem")),
                  salting=salting, quantize_ms=quantize_ms)
    victim, vctx = bootstrap(arena, [VICTIM_PROMPT], ALLOW)
    arena.prompt(victim, vctx["payloads"][0])                       # victim primes the cache
    attacker, _ = bootstrap(arena, ["attacker"], ALLOW)
    X, y = [], []
    trials = [(1, VICTIM_PROMPT)] * n + [(0, f"unseen {i} {random.random()}") for i in range(n)]
    random.shuffle(trials)
    for label, p in trials:
        t = time.perf_counter()
        arena.prompt(attacker, p)
        X.append([(time.perf_counter() - t) * 1000]); y.append(label)
    acc = cross_val_score(DecisionTreeClassifier(max_depth=3), np.array(X), np.array(y), cv=5).mean()
    hit = float(np.mean([x[0] for x, l in zip(X, y) if l]))
    miss = float(np.mean([x[0] for x, l in zip(X, y) if not l]))
    return acc, hit, miss, 2 * n


if __name__ == "__main__":
    for name, salt, q in [("baseline (shared cache, no defense)", False, 0),
                          ("quantizer only", False, BUCKET_MS),
                          ("per-session salt + quantizer", True, BUCKET_MS)]:
        acc, hit, miss, N = measure(salt, q)
        print(f"{name:38s} acc={acc:5.1%}  leak={leak_bits(acc):.2f} bits/probe "
              f"(95% upper bound {leak_bits_upper(acc, N):.2f})  hit {hit:.0f}ms / miss {miss:.0f}ms")
