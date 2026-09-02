#!/usr/bin/env python3
"""Build a CRX3 archive locally, with a stable development signing key."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXTENSION = ROOT / "extensions" / "siteblock"
KEY = EXTENSION / ".siteblock-dev.pem"
OUTPUT = EXTENSION / "siteblock.crx"


def varint(value: int) -> bytes:
    output = bytearray()
    while value > 127:
        output.append((value & 127) | 128)
        value >>= 7
    output.append(value)
    return bytes(output)


def bytes_field(field: int, value: bytes) -> bytes:
    return varint((field << 3) | 2) + varint(len(value)) + value


def call(*args: str, input_data: bytes | None = None) -> bytes:
    return subprocess.run(args, input=input_data, capture_output=True, check=True).stdout


def main() -> int:
    if not KEY.exists():
        call("openssl", "genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048", "-out", str(KEY))
        KEY.chmod(0o600)
    public_key = call("openssl", "pkey", "-in", str(KEY), "-pubout", "-outform", "DER")
    archive = OUTPUT.with_suffix(".zip")
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as package:
        for path in EXTENSION.iterdir():
            if path.name in {"manifest.json", "background.js", "blocked.html"}:
                package.write(path, path.name)
    zip_data = archive.read_bytes()
    archive.unlink()
    extension_id = "".join(
        chr(97 + (value >> 4)) + chr(97 + (value & 15))
        for value in hashlib.sha256(public_key).digest()[:16]
    )
    signed_data = bytes_field(1, hashlib.sha256(public_key).digest()[:16])
    signature = call(
        "openssl",
        "dgst",
        "-sha256",
        "-sign",
        str(KEY),
        input_data=b"CRX3 SignedData\x00" + signed_data + zip_data,
    )
    proof = bytes_field(1, public_key) + bytes_field(2, signature)
    header = bytes_field(2, proof) + bytes_field(10000, signed_data)
    OUTPUT.write_bytes(
        b"Cr24" + (3).to_bytes(4, "little") + len(header).to_bytes(4, "little") + header + zip_data
    )
    version = json.loads((EXTENSION / "manifest.json").read_text(encoding="utf-8"))["version"]
    print(json.dumps({"id": extension_id, "version": version}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
