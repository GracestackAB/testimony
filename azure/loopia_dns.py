#!/usr/bin/env python3
"""Loopia DNS: testimony.se → Azure Container Apps (TXT verify + CNAME + apex A)."""
from __future__ import annotations

import os
import sys
import xmlrpc.client
from typing import Any

RPC_URL = os.environ.get("LOOPIA_RPC_URL", "https://api.loopia.se/RPCSERV")
DOMAIN = os.environ.get("LOOP_DOMAIN", "testimony.se")
TTL = int(os.environ.get("LOOPIA_DNS_TTL", "300"))


def _creds() -> tuple[str, str]:
    user = os.environ.get("LOOPIA_API_USER") or os.environ.get("LOOPIA_USER")
    pwd = (
        os.environ.get("LOOPIA_API_PASSWORD")
        or os.environ.get("LOOPIA_API_PASS")
        or os.environ.get("LOOPIA_PASS")
    )
    if not user or not pwd:
        print("Sätt LOOPIA_API_USER + LOOPIA_API_PASSWORD", file=sys.stderr)
        sys.exit(2)
    return user, pwd


def _load_env_file(path: str) -> None:
    with open(path, encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


def _proxy() -> xmlrpc.client.ServerProxy:
    return xmlrpc.client.ServerProxy(RPC_URL, encoding="utf-8", allow_none=True)


def _ensure_subdomain(
    srv: xmlrpc.client.ServerProxy, user: str, pwd: str, sub: str
) -> list[dict[str, Any]]:
    try:
        return srv.getZoneRecords(user, pwd, DOMAIN, sub)
    except xmlrpc.client.Fault as e:
        if "UNKNOWN_SUBDOMAIN" in str(e):
            st = srv.addSubdomain(user, pwd, DOMAIN, sub)
            if st != "OK":
                raise RuntimeError(f"addSubdomain {sub}: {st}") from e
            return []
        raise


def _remove_types(
    srv: xmlrpc.client.ServerProxy,
    user: str,
    pwd: str,
    sub: str,
    types: tuple[str, ...],
) -> None:
    for r in _ensure_subdomain(srv, user, pwd, sub):
        if r.get("type") in types:
            rc = srv.removeZoneRecord(user, pwd, DOMAIN, sub, r["record_id"])
            if rc != "OK":
                raise RuntimeError(f"remove {sub} {r}: {rc}")


def _set_txt(srv: xmlrpc.client.ServerProxy, user: str, pwd: str, sub: str, txt: str) -> None:
    rows = _ensure_subdomain(srv, user, pwd, sub)
    for r in rows:
        if r.get("type") == "TXT" and r.get("rdata") == txt:
            print(f"  = {sub}.{DOMAIN} TXT redan OK")
            return
        if r.get("type") == "TXT":
            srv.removeZoneRecord(user, pwd, DOMAIN, sub, r["record_id"])
    record = {"type": "TXT", "priority": 0, "ttl": TTL, "rdata": txt}
    rc = srv.addZoneRecord(user, pwd, DOMAIN, sub, record)
    if rc != "OK":
        raise RuntimeError(rc)
    print(f"  + {sub}.{DOMAIN} TXT")


def _release_apex_webhosting(
    srv: xmlrpc.client.ServerProxy, user: str, pwd: str
) -> None:
    """Ta bort Loopia Hemsida-lås på @ — utan detta publiceras inte A/CNAME på NS."""
    subs = srv.getSubdomains(user, pwd, DOMAIN)
    if "@" not in subs:
        print("  = @ webhosting redan av (saknas i getSubdomains)")
        return
    rc = srv.removeSubdomain(user, pwd, DOMAIN, "@")
    if rc != "OK":
        raise RuntimeError(f"removeSubdomain @: {rc}")
    print("  + removeSubdomain @ (Hemsida av)")


def _set_a(
    srv: xmlrpc.client.ServerProxy, user: str, pwd: str, sub: str, ip: str
) -> None:
    _ensure_subdomain(srv, user, pwd, sub)
    _remove_types(srv, user, pwd, sub, ("A", "AAAA", "CNAME"))
    record = {"type": "A", "priority": 0, "ttl": TTL, "rdata": ip}
    rc = srv.addZoneRecord(user, pwd, DOMAIN, sub, record)
    if rc != "OK":
        raise RuntimeError(f"A {sub} -> {ip}: {rc}")
    print(f"  + {sub}.{DOMAIN} A {ip} TTL {TTL}")


def _set_cname(
    srv: xmlrpc.client.ServerProxy, user: str, pwd: str, sub: str, target: str
) -> None:
    target = target.strip().rstrip(".") + "."
    _remove_types(srv, user, pwd, sub, ("A", "AAAA", "CNAME"))
    record = {"type": "CNAME", "priority": 0, "ttl": TTL, "rdata": target}
    rc = srv.addZoneRecord(user, pwd, DOMAIN, sub, record)
    if rc != "OK":
        raise RuntimeError(f"CNAME {sub} -> {target}: {rc}")
    print(f"  + {sub}.{DOMAIN} CNAME {target} TTL {TTL}")


def main() -> None:
    args = sys.argv[1:]
    if args and args[0] == "--env-file" and len(args) >= 2:
        _load_env_file(args[1])
        args = args[2:]

    if len(args) < 2:
        print(
            "Usage: loopia_dns.py [--env-file .env] <asuid-txt> <aca-fqdn>",
            file=sys.stderr,
        )
        sys.exit(2)

    txt_token, target = args[0], args[1].strip().rstrip("/").replace("https://", "")
    user, pwd = _creds()
    srv = _proxy()
    print(f"Loopia: {user} @ {DOMAIN}")

    print("1) Avaktivera Hemsida på @ (removeSubdomain)")
    _release_apex_webhosting(srv, user, pwd)

    print("2) Azure domain validation TXT (apex + www)")
    _set_txt(srv, user, pwd, "asuid", txt_token)
    _set_txt(srv, user, pwd, "asuid.www", txt_token)

    print("3) www → ACA CNAME")
    _set_cname(srv, user, pwd, "www", target)

    print("4) apex @ → ACA static IP")
    static_ip = os.environ.get("ACA_STATIC_IP", "135.225.11.56")
    _set_a(srv, user, pwd, "@", static_ip)

    print("\nKlart. Vänta DNS TTL (~5 min), binda sedan managed cert i ACA.")


if __name__ == "__main__":
    main()
