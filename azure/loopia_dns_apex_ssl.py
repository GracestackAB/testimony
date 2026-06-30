#!/usr/bin/env python3
"""Loopia DNS för apex SSL: A @, asuid TXT, CAA digicert.com."""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from loopia_dns import (  # noqa: E402
    DOMAIN,
    TTL,
    _creds,
    _ensure_subdomain,
    _load_env_file,
    _proxy,
    _remove_types,
    _set_txt,
)


def _set_a(srv, user: str, pwd: str, sub: str, ip: str) -> None:
    _ensure_subdomain(srv, user, pwd, sub)
    _remove_types(srv, user, pwd, sub, ("A", "AAAA", "CNAME"))
    record = {"type": "A", "priority": 0, "ttl": TTL, "rdata": ip}
    rc = srv.addZoneRecord(user, pwd, DOMAIN, sub, record)
    if rc != "OK":
        raise RuntimeError(f"A {sub} -> {ip}: {rc}")
    print(f"  + {sub}.{DOMAIN} A {ip}")


def _set_caa_digicert(srv, user: str, pwd: str) -> None:
    """Tillåt DigiCert (ACA managed certs)."""
    sub = "@"
    _ensure_subdomain(srv, user, pwd, sub)
    caa_rdata = '0 issue "digicert.com"'
    rows = _ensure_subdomain(srv, user, pwd, sub)
    for r in rows:
        if r.get("type") == "CAA" and "digicert" in (r.get("rdata") or ""):
            print("  = CAA digicert.com redan OK")
            return
    for r in rows:
        if r.get("type") == "CAA":
            srv.removeZoneRecord(user, pwd, DOMAIN, sub, r["record_id"])
    record = {"type": "CAA", "priority": 0, "ttl": TTL, "rdata": caa_rdata}
    rc = srv.addZoneRecord(user, pwd, DOMAIN, sub, record)
    if rc != "OK":
        print(f"  ⚠️  CAA kunde inte sättas ({rc}) — fortsätter ändå")
        return
    print(f"  + @.{DOMAIN} CAA digicert.com")


def main() -> None:
    args = sys.argv[1:]
    if args and args[0] == "--env-file" and len(args) >= 2:
        _load_env_file(args[1])
        args = args[2:]
    if len(args) < 1:
        print("Usage: loopia_dns_apex_ssl.py [--env-file .env] <aca-static-ip>", file=sys.stderr)
        sys.exit(2)

    static_ip = args[0].strip()
    user, pwd = _creds()
    srv = _proxy()
    print(f"Loopia: {user} @ {DOMAIN}")

    print("1) A @ → ACA static IP")
    _set_a(srv, user, pwd, "@", static_ip)

    print("2) CAA digicert.com (managed cert)")
    _set_caa_digicert(srv, user, pwd)

    print("3) asuid TXT (domänägarskap för bind)")
    verify_id = os.environ.get("ACA_DOMAIN_VERIFICATION_ID", "C3343BC3966E95778ADEDD6AC5134DFFB48C5284B43248FAB8DC2301F4398C12")
    _set_txt(srv, user, pwd, "asuid", verify_id)


if __name__ == "__main__":
    main()
