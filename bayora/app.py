"""FastAPI gateway. Red talks ONLY to this service. Every call needs the caller's X-Token."""
import os
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from .arena import Arena
from .audit import AuditChain, verify_chain
from .models import MockModel, OllamaModel

model = OllamaModel(os.getenv("OLLAMA_URL", "http://model:11434"), os.getenv("OLLAMA_MODEL", "qwen2.5:1.5b")) \
    if os.getenv("MODEL_BACKEND", "mock") == "ollama" else MockModel()
arena = Arena(model, AuditChain(os.getenv("AUDIT_DB", "audit.db"), os.getenv("AUDIT_KEY", "audit_key.pem")),
              salting=os.getenv("SALTING", "1") == "1", quantize_ms=int(os.getenv("QUANTIZE_MS", "250")),
              require_auth=True)
app = FastAPI(title="Bayora Blind Arena gateway")
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])
if os.getenv("DEMO_MODE", "1") == "1":          # dashboard API (hash-only views + demo buttons)
    from .dash import make_router
    app.include_router(make_router(arena))


class Commit(BaseModel): commit: str
class BlueCommit(BaseModel): commit: str; code: str
class Prompt(BaseModel): text: str
class RedReveal(BaseModel): salt: str; payloads: list[str]
class BlueReveal(BaseModel): salt: str


def guard(fn, *a, **k):
    try:
        return fn(*a, **k)
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/session")
def create(): return arena.create()
@app.post("/session/{sid}/red-commit")
def red(sid: str, b: Commit, x_token: str = Header(None)): guard(arena.commit_red, sid, b.commit, x_token); return {"ok": True}
@app.post("/session/{sid}/blue-commit")
def blue(sid: str, b: BlueCommit, x_token: str = Header(None)): guard(arena.commit_blue, sid, b.commit, b.code, x_token); return {"ok": True}
@app.post("/session/{sid}/open")
def open_(sid: str, x_token: str = Header(None)): guard(arena.open, sid, x_token); return {"ok": True}
@app.post("/session/{sid}/prompt")
def prompt(sid: str, b: Prompt, x_token: str = Header(None)): return guard(arena.prompt, sid, b.text, x_token)
@app.get("/session/{sid}/verdicts")
def verdicts(sid: str, x_token: str = Header(None)): return guard(arena.verdicts, sid, x_token)
@app.post("/session/{sid}/reveal-red")
def reveal_red(sid: str, b: RedReveal, x_token: str = Header(None)): guard(arena.reveal_red, sid, b.salt, b.payloads, x_token); return {"ok": True}
@app.post("/session/{sid}/reveal-blue")
def reveal_blue(sid: str, b: BlueReveal, x_token: str = Header(None)): guard(arena.reveal_blue, sid, b.salt, x_token); return {"ok": True}
@app.post("/session/{sid}/end")
def end(sid: str, x_token: str = Header(None)): return guard(arena.finalize, sid, x_token)
@app.get("/metrics")
def metrics(): return arena.metrics()
@app.get("/verify")
def verify(): ok, bad, n = verify_chain(arena.audit.db_path, arena.audit.pub_path); return {"ok": ok, "bad_index": bad, "rows": n}
