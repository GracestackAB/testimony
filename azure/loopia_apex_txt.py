#!/usr/bin/env python3
"""Uppdaterar endast asuid TXT för apex-cert (rör inte www CNAME/TXT)."""
from __future__ import annotations

import os
import sys

# Delad Loopia-logik
sys.path.insert(0, os.path.dirname(__file__))
from loopia_dns import _creds, _load_env_file, _proxy, _set_txt  # noqa: E402


def main() -> None:
    args = sys.argv[1:]
    if args and args[0] == "--env-file" and len(args) >= 2:
        _load_env_file(args[1])
        args = args[2:]
    if len(args) < 1:
        print("Usage: loopia_apex_txt.py [--env-file .env] <asuid-txt>", file=sys.stderr)
        sys.exit(2)
    token = args[0]
    user, pwd = _creds()
    srv = _proxy()
    print(f"Uppdaterar asuid.testimony.se TXT …")
    _set_txt(srv, user, pwd, "asuid", token)
    print("Klart.")


if __name__ == "__main__":
    main()
