import sys
from bayora.audit import verify_chain
ok, bad, n = verify_chain(*(sys.argv[1:3] or ["audit.db", "audit_key_pub.pem"]))
print(f"\033[92mCHAIN OK ({n} rows)\033[0m" if ok else f"\033[91mCHAIN BROKEN at row {bad}\033[0m")
sys.exit(0 if ok else 1)
