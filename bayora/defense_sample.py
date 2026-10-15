import sys, json, re
prompt = sys.stdin.read().lower()
RULES = [r"ignore (all )?(previous|prior) instructions", r"system prompt", r"jailbreak", r"\bdan\b", r"reveal .*secret"]
hits = sum(bool(re.search(r, prompt)) for r in RULES)
if hits:
    print(json.dumps({"verdict": "block", "score": min(0.4 + 0.3 * hits, 1.0)}))
else:
    print(json.dumps({"verdict": "allow", "score": 0.1}))
