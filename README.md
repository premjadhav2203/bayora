# Bayora Blind Arena
Red, Blue and an LLM test each other at the same time. Nobody sees anybody's raw material, and every session ends with a signed proof that the test was fair.

## Run (no Docker needed)
    pip install -r requirements.txt
    python demo.py                    # full 8-step demo with PASS/FAIL
    python -m attacks.timing_attack   # timing side-channel before/after (the leakage number)
    python verify.py audit.db audit_key_pub.pem   # verify a real audit log

## Run the real gateway over HTTP
    uvicorn bayora.app:app --port 8000      # MODEL_BACKEND=mock by default
    python red_runner.py http://localhost:8000

## Run with Docker + a real model (Ollama)
    docker run --rm -v bayora_ollama:/root/.ollama ollama/ollama pull qwen2.5:1.5b   # one-off (needs internet)
    docker compose up -d gateway model
    docker compose --profile attack run --rm red
    ./attacks/isolation_test.sh            # each line should print DENIED
(Compose project volume name may be prefixed; check `docker volume ls`, or change `ollama:` to an external volume.)
With the real model, set QUANTIZE_MS above your worst-case latency (compose uses 3000), otherwise slow responses still leak.

## Where each idea lives
| Idea | File |
|---|---|
| Sealed verdict-only Blue module | bayora/blue_runner.py |
| Commit-reveal + integrity certificate | bayora/arena.py |
| Hash-chained signed audit log | bayora/audit.py, verify.py |
| Timing quantizer + per-session cache salt | bayora/arena.py (prompt), bayora/models.py |
| Timing-leak attack + leakage number | attacks/timing_attack.py |
| Canary auditor | bayora/canary.py |

## Honest limitations (put these on the residual-risk slide)
- Blue sandbox here is subprocess + rlimits + schema-validated output. It does not block syscalls/network. Production: WASM (wasmtime, no WASI) or gVisor/Kata/Firecracker.
- Timing numbers in the demo come from a simulated prefix cache (MockModel) so they are reproducible anywhere. With Ollama you must re-measure.
- Quantizer only hides timing if the bucket exceeds the worst-case latency.
- Verdict channel still has tiny bandwidth (3 verdicts x 1-decimal score per prompt).
- Not covered: kernel/container-escape zero-days, Spectre-class hardware channels, compromised host/admin, model-weight extraction.

## Dashboard (Next.js)
Terminal 1 (repo root):   uvicorn bayora.app:app --port 8000
Terminal 2:               cd frontend && npm install && npm run dev      -> open http://localhost:3000
- "Run live session" plays a full test step by step (commit-reveal, verdicts, canary scan, signed certificate)
- "Inject leak" misconfigures /metrics so the canary auditor fires and the certificate turns FLAGGED
- "Tamper with audit log" edits one row so the chain breaks visibly; "Restore log" fixes it
- The timing-attack chart is measured live when the page loads (about 45 s)
- Set DEMO_MODE=0 to disable the dashboard API (tamper/leak buttons) outside demos
- If the gateway is not on localhost:8000: GATEWAY_URL=http://host:port npm run dev

## v4 additions
- Jitter / resource-interference check in the integrity score (cert fields: latency_cv, bucket_overflows, jitter_flag)
- Defense benchmark: 40-prompt public corpus (bayora/payloads.py), two defenses, detection / false-alarm / F1 per category
- Offline certificate verifier:  python verify_cert.py cert.json --pubkey audit_key_pub.pem --db audit.db
  (always pass --pubkey: the key inside a certificate is self-reported)
- Dashboard: noisy-neighbour toggle, defense benchmark panel, Verify / Forge certificate buttons
- "Noisy neighbour" is SIMULATED on the mock model; with Docker, use a real stress-ng container instead