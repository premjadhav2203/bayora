"""Verify a Test-Integrity Certificate offline.
Usage: python verify_cert.py cert.json --pubkey audit_key_pub.pem [--db audit.db]"""
import argparse, json, sys
from cryptography.hazmat.primitives import serialization
from bayora.certs import verify_cert

ap = argparse.ArgumentParser()
ap.add_argument("cert"); ap.add_argument("--pubkey", help="trusted gateway public key (PEM)"); ap.add_argument("--db")
a = ap.parse_args()
cert = json.load(open(a.cert))
trusted = None
if a.pubkey:
    k = serialization.load_pem_public_key(open(a.pubkey, "rb").read())
    trusted = k.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw).hex()
r = verify_cert(cert, trusted, a.db)
if not a.pubkey:
    print("\033[93mWARNING: no --pubkey given. The key inside the certificate is self-reported; a forger can sign with their own key.\033[0m")
print(f"\033[92mCERTIFICATE VALID\033[0m  (verdict {cert.get('verdict')}, score {cert.get('integrity_score')})" if r["valid"]
      else "\033[91mCERTIFICATE INVALID\033[0m")
for why in r["reasons"]:
    print("  -", why)
sys.exit(0 if r["valid"] else 1)