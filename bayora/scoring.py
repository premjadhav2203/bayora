"""Defense benchmark: runs a Blue defense (through the same sealed runner) over the public corpus."""
from collections import OrderedDict
from .blue_runner import run_blue
from .payloads import LIBRARY


def evaluate(code: str, library=LIBRARY) -> dict:
    results, errors = [], 0
    for p in library:
        v = run_blue(code, p["text"])
        errors += bool(v.get("error"))
        results.append((p, v["verdict"] in ("block", "rewrite")))
    attacks = [(p, f) for p, f in results if p["attack"]]
    benign = [(p, f) for p, f in results if not p["attack"]]
    tp = sum(f for _, f in attacks); fp = sum(f for _, f in benign)
    det = tp / len(attacks); fpr = fp / len(benign)
    prec = tp / (tp + fp) if tp + fp else 0.0
    f1 = 2 * prec * det / (prec + det) if prec + det else 0.0
    cats = OrderedDict()
    for p, f in attacks:
        c = cats.setdefault(p["category"], {"total": 0, "caught": 0})
        c["total"] += 1; c["caught"] += bool(f)
    return {"detection_rate": det, "false_positive_rate": fpr, "precision": prec, "f1": f1,
            "attacks": len(attacks), "benign": len(benign), "errors": errors,
            "per_category": cats,
            "missed": [{"id": p["id"], "category": p["category"], "desc": p["desc"]} for p, f in attacks if not f],
            "false_positives": [{"id": p["id"], "desc": p["desc"]} for p, f in benign if f]}