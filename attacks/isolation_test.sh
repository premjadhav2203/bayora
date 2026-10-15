#!/usr/bin/env bash
# Run AFTER `docker compose up -d gateway model`. Each line should print DENIED.
t() { if docker compose run --rm --no-deps red "$@" >/dev/null 2>&1; then echo "FAIL (reachable): $*"; else echo "DENIED: $*"; fi; }
t python -c "import urllib.request;urllib.request.urlopen('http://model:11434',timeout=3)"     # model not reachable
t python -c "import urllib.request;urllib.request.urlopen('https://example.com',timeout=3)"   # no internet
t python -c "open('/etc/blue_secret','w')"                                                    # read-only fs
