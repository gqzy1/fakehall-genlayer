#!/usr/bin/env python3
"""Verify deployed FakeHall bytecode parity against the local source.

Reads the deployed contract source via the Stable Studionet RPC
(gen_getContractCode, base64) and compares it byte-for-byte with
contracts/fakehall.py, printing BYTE_PARITY_MATCH: TRUE/FALSE plus the
local source SHA-256.

Usage:
    python3 scripts/verify_byte_parity.py [--address 0x...]
        [--contract contracts/fakehall.py]
        [--deployment evidence/deployment.json]
        [--rpc https://studio.genlayer.com/api]
"""
import argparse
import base64
import hashlib
import json
import os
import sys
import time

RPC_URL = "https://studio.genlayer.com/api"
CHAIN_ID = 61999


def rpc_get_contract_code(rpc, address):
    import requests
    payload = {"jsonrpc": "2.0", "id": 1,
               "method": "gen_getContractCode", "params": [address]}
    last = None
    for attempt in range(5):
        try:
            resp = requests.post(rpc, json=payload, timeout=60,
                                 headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"})
            resp.raise_for_status()
            data = resp.json()
            break
        except Exception as e:  # transient truncation / reset: retry
            last = e
            time.sleep(2)
    else:
        raise RuntimeError("RPC request failed after retries: %s" % last)
    if "error" in data:
        raise RuntimeError("RPC error: %s" % data["error"])
    return base64.b64decode(data["result"]).decode("utf-8")


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.dirname(here)
    ap = argparse.ArgumentParser()
    ap.add_argument("--address", default=None)
    ap.add_argument("--contract", default=os.path.join(repo, "contracts", "fakehall.py"))
    ap.add_argument("--deployment", default=os.path.join(repo, "evidence", "deployment.json"))
    ap.add_argument("--rpc", default=RPC_URL)
    ns = ap.parse_args()

    address = ns.address
    if not address and os.path.exists(ns.deployment):
        with open(ns.deployment, encoding="utf-8") as f:
            address = json.load(f)["contract_address"]
    if not address:
        print("no contract address: pass --address or deploy first", file=sys.stderr)
        return 2

    with open(ns.contract, encoding="utf-8") as f:
        local = f.read()
    local_sha = hashlib.sha256(local.encode()).hexdigest()
    on_chain = rpc_get_contract_code(ns.rpc, address)
    on_chain_sha = hashlib.sha256(on_chain.encode()).hexdigest()
    match = on_chain == local
    print("contract:", address)
    print("local source sha256:   ", local_sha, "(%d bytes)" % len(local.encode()))
    print("on-chain source sha256:", on_chain_sha, "(%d bytes)" % len(on_chain.encode()))
    print("BYTE_PARITY_MATCH:", "TRUE" if match else "FALSE")
    return 0 if match else 1


if __name__ == "__main__":
    sys.exit(main())
