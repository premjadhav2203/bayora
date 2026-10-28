"""Offline certificate verification. Needs only the certificate and a TRUSTED public key; no server."""
import json, sqlite3
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey


def verify_cert(cert: dict, trusted_pubkey_hex: str = None, db_path: str = None) -> dict:
    cert = dict(cert)
    sig, pub = cert.pop("signature", None), cert.pop("pubkey", None)
    reasons, sig_ok = [], False
    if not sig or not pub:
        reasons.append("certificate is missing its signature or public key")
    else:
        try:
            body = json.dumps(cert, sort_keys=True).encode()
            Ed25519PublicKey.from_public_bytes(bytes.fromhex(pub)).verify(bytes.fromhex(sig), body)
            sig_ok = True
        except Exception:
            reasons.append("signature does not match the certificate contents (altered or forged)")
    key_trusted = None
    if trusted_pubkey_hex is not None:
        key_trusted = (pub == trusted_pubkey_hex)
        if not key_trusted:
            reasons.append("signed by a key that is not the trusted gateway key")
    head_in_log = None
    if db_path:
        db = sqlite3.connect(db_path)
        head_in_log = db.execute("SELECT 1 FROM log WHERE hash=?", (cert.get("chain_head"),)).fetchone() is not None
        db.close()
        if not head_in_log:
            reasons.append("chain head is not present in the audit log")
    valid = sig_ok and key_trusted is not False and head_in_log is not False
    return {"valid": valid, "signature_ok": sig_ok, "key_trusted": key_trusted,
            "chain_head_in_log": head_in_log, "reasons": reasons,
            "key_fingerprint": (pub or "")[:16]}