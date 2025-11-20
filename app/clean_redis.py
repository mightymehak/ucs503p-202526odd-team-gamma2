import os
import socket
import ssl

REDIS_HOST = os.getenv("REDIS_HOST", "redis-14696.c330.asia-south1-1.gce.redns.redis-cloud.com")
REDIS_PORT = int(os.getenv("REDIS_PORT", "14696"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "6CWoI4fVTA1WVSDZibKXuqGgeW3RfxnT")

def resp_command(*args):
    parts = [f"*{len(args)}\r\n".encode()]
    for a in args:
        val = str(a).encode()
        parts.append(f"${len(val)}\r\n".encode())
        parts.append(val + b"\r\n")
    return b"".join(parts)

def read_reply(sock):
    # Simple RESP reader for status/integer replies
    data = b""
    while True:
        chunk = sock.recv(4096)
        if not chunk:
            break
        data += chunk
        if b"\r\n" in data:
            break
    return data.decode(errors="ignore")

def flush(redis_host, redis_port, password):
    # Try TLS first, fallback to plain TCP
    for use_tls in (True, False):
        try:
            raw_sock = socket.create_connection((redis_host, redis_port), timeout=10)
            sock = ssl.create_default_context().wrap_socket(raw_sock, server_hostname=redis_host) if use_tls else raw_sock

            sock.sendall(resp_command("AUTH", password))
            auth_reply = read_reply(sock)
            if not auth_reply.startswith("+"):
                raise RuntimeError(f"AUTH failed: {auth_reply}")

            sock.sendall(resp_command("DBSIZE"))
            before = read_reply(sock)

            sock.sendall(resp_command("FLUSHALL"))
            flush_reply = read_reply(sock)
            if not flush_reply.startswith("+"):
                raise RuntimeError(f"FLUSHALL failed: {flush_reply}")

            sock.sendall(resp_command("DBSIZE"))
            after = read_reply(sock)
            try:
                before_n = int(before.strip().lstrip(":"))
            except Exception:
                before_n = -1
            try:
                after_n = int(after.strip().lstrip(":"))
            except Exception:
                after_n = -1

            print(f"Redis cleared (TLS={use_tls}). Before DB size: {before_n}, After DB size: {after_n}")
            sock.close()
            return True
        except Exception as e:
            if use_tls:
                continue
            else:
                print(f"Failed to clear Redis: {e}")
                return False

if __name__ == "__main__":
    flush(REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)