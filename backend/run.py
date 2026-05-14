"""
Uvicorn launcher with SO_REUSEADDR to avoid Windows ghost-socket conflicts.
Run from the backend/ directory:
    python run.py
or with a custom port:
    python run.py --port 8000
"""
import argparse
import asyncio
import socket
import sys

import uvicorn


def create_socket(host: str, port: int) -> socket.socket:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind((host, port))
    except OSError as e:
        print(f"ERROR: Cannot bind to {host}:{port} — {e}", file=sys.stderr)
        sys.exit(1)
    sock.set_inheritable(True)
    return sock


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--log-level", default="info")
    args = parser.parse_args()

    sock = create_socket(args.host, args.port)

    config = uvicorn.Config(
        "app.main:app",
        host=args.host,
        port=args.port,
        log_level=args.log_level,
        reload=False,
    )
    server = uvicorn.Server(config)

    print(f"Starting on http://{args.host}:{args.port}")
    asyncio.run(server.serve(sockets=[sock]))


if __name__ == "__main__":
    main()
