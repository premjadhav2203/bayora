"""Tamper-evident audit log: SQLite + SHA-256 hash chain + Ed25519 signatures.
Stores HASHES of payloads only, never raw payloads."""
import hashlib, os, sqlite3, threading, time
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

GENESIS = "0" * 64


def sha(*parts) -> str:
    return hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()


class AuditChain:
    def __init__(self, db_path="audit.db", key_path="audit_key.pem"):
        self.db_path = db_path
        self.pub_path = key_path.replace(".pem", "_pub.pem")
        self.lock = threading.Lock()
        self.db = sqlite3.connect(db_path, check_same_thread=False)
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS log(idx INTEGER PRIMARY KEY AUTOINCREMENT,"
            "session TEXT, event TEXT, payload_hash TEXT, ts TEXT, prev TEXT, hash TEXT, sig TEXT)")
        self.db.commit()
        if os.path.exists(key_path):
            self.key = serialization.load_pem_private_key(open(key_path, "rb").read(), None)
        else:
            self.key = Ed25519PrivateKey.generate()
            open(key_path, "wb").write(self.key.private_bytes(
                serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption()))
        open(self.pub_path, "wb").write(self.key.public_key().public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))

    def head(self) -> str:
        r = self.db.execute("SELECT hash FROM log ORDER BY idx DESC LIMIT 1").fetchone()
        return r[0] if r else GENESIS

    def append(self, session, event, payload_hash="-") -> str:
        with self.lock:
            prev, ts = self.head(), f"{time.time():.6f}"
            h = sha(prev, session, event, payload_hash, ts)
            sig = self.key.sign(bytes.fromhex(h)).hex()
            self.db.execute("INSERT INTO log(session,event,payload_hash,ts,prev,hash,sig) VALUES(?,?,?,?,?,?,?)",
                            (session, event, payload_hash, ts, prev, h, sig))
            self.db.commit()
            return h

    def dump(self) -> str:
        rows = self.db.execute("SELECT idx,session,event,payload_hash,hash FROM log").fetchall()
        return "\n".join(" ".join(map(str, r)) for r in rows)

    def public_key_hex(self) -> str:
        return self.key.public_key().public_bytes(
            serialization.Encoding.Raw, serialization.PublicFormat.Raw).hex()

    def sign(self, data: bytes) -> str:
        return self.key.sign(data).hex()


def verify_chain(db_path="audit.db", pub_path="audit_key_pub.pem"):
    """Re-walk the chain. Returns (ok, first_bad_idx_or_None, n_rows)."""
    pub = serialization.load_pem_public_key(open(pub_path, "rb").read())
    db = sqlite3.connect(db_path)
    prev, n = GENESIS, 0
    for idx, session, event, ph, ts, p, h, sig in db.execute(
            "SELECT idx,session,event,payload_hash,ts,prev,hash,sig FROM log ORDER BY idx"):
        n += 1
        if p != prev or sha(p, session, event, ph, ts) != h:
            return False, idx, n
        try:
            pub.verify(bytes.fromhex(sig), bytes.fromhex(h))
        except Exception:
            return False, idx, n
        prev = h
    return True, None, n
