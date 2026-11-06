"""
HEXNS CRM - Cross-Platform Service Launcher & Process Manager
Handles starting, health checking, browser launching, and graceful shutdown
for both Windows and macOS/Linux.
"""

import os
import sys
import time
import socket
import signal
import subprocess
import webbrowser
import urllib.request
import urllib.error
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
RUN_DIR = PROJECT_ROOT / ".run"
LOGS_DIR = PROJECT_ROOT / "logs"

BACKEND_PID_FILE = RUN_DIR / "backend.pid"
FRONTEND_PID_FILE = RUN_DIR / "frontend.pid"
BACKEND_LOG_FILE = LOGS_DIR / "backend.log"
FRONTEND_LOG_FILE = LOGS_DIR / "frontend.log"

BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = 8000
FRONTEND_PORT = 3000
BACKEND_HEALTH_URL = f"http://{BACKEND_HOST}:{BACKEND_PORT}/health"
FRONTEND_URL = f"http://localhost:{FRONTEND_PORT}"


def get_backend_python() -> str:
    """Returns path to the virtual environment python binary."""
    if sys.platform == "win32":
        py_path = BACKEND_DIR / ".venv" / "Scripts" / "python.exe"
    else:
        py_path = BACKEND_DIR / ".venv" / "bin" / "python"

    if py_path.exists():
        return str(py_path)
    return sys.executable


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Checks whether a local TCP port is already open/in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.8)
        try:
            s.connect((host, port))
            return True
        except (socket.timeout, ConnectionRefusedError, OSError):
            return False


def is_backend_healthy() -> bool:
    """Queries FastAPI /health endpoint."""
    try:
        req = urllib.request.Request(BACKEND_HEALTH_URL, headers={"User-Agent": "HEXNS-Launcher"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                body = resp.read().decode("utf-8", errors="ignore")
                return "healthy" in body
    except Exception:
        pass
    return False


def is_frontend_healthy() -> bool:
    """Queries Next.js frontend root URL."""
    try:
        req = urllib.request.Request(FRONTEND_URL, headers={"User-Agent": "HEXNS-Launcher"})
        with urllib.request.urlopen(req, timeout=2.0) as resp:
            return 200 <= resp.status < 400
    except urllib.error.HTTPError as e:
        return 200 <= e.code < 400
    except Exception:
        return False


def is_pid_alive(pid: int) -> bool:
    """Checks whether a process with the given PID is running."""
    if pid <= 0:
        return False
    if sys.platform == "win32":
        try:
            cmd = ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
            return f'"{pid}"' in res.stdout
        except Exception:
            return False
    else:
        try:
            os.kill(pid, 0)
            return True
        except (OSError, ProcessLookupError):
            return False


def stop_process_tree(pid: int, name: str) -> bool:
    """Gracefully terminates a process and all its child processes."""
    if pid <= 4:
        return False

    if not is_pid_alive(pid):
        print(f"[INFO] {name} (PID: {pid}) is already stopped.")
        return True

    # Safety check on process name before killing
    if sys.platform == "win32":
        try:
            cmd = ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
            proc_line = res.stdout.lower()
            allowed = any(k in proc_line for k in ["python", "uvicorn", "node", "npm", "cmd"])
            if not allowed:
                print(f"[SECURITY] PID {pid} is not recognized as a project process ({proc_line.strip()}). Skipping termination.")
                return False
        except Exception:
            pass

    print(f"[STOP] Stopping {name} (PID: {pid})...")
    if sys.platform == "win32":
        try:
            subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True, timeout=5)
            print(f"[OK] {name} stopped successfully.")
            return True
        except Exception as e:
            print(f"[WARNING] Error stopping {name}: {e}")
            return False
    else:
        # macOS / Linux graceful termination
        try:
            # Check command name
            try:
                res = subprocess.run(["ps", "-p", str(pid), "-o", "comm="], capture_output=True, text=True, timeout=3)
                comm = res.stdout.strip().lower()
                allowed = any(k in comm for k in ["python", "uvicorn", "node", "npm", "sh", "bash"])
                if not allowed:
                    print(f"[SECURITY] PID {pid} ({comm}) is not recognized as a project process. Skipping.")
                    return False
            except Exception:
                pass

            try:
                pgid = os.getpgid(pid)
                os.killpg(pgid, signal.SIGTERM)
            except Exception:
                os.kill(pid, signal.SIGTERM)

            for _ in range(5):
                time.sleep(1)
                if not is_pid_alive(pid):
                    print(f"[OK] {name} stopped successfully.")
                    return True

            try:
                pgid = os.getpgid(pid)
                os.killpg(pgid, signal.SIGKILL)
            except Exception:
                os.kill(pid, signal.SIGKILL)
            print(f"[OK] {name} force stopped.")
            return True
        except Exception as e:
            print(f"[WARNING] Error stopping {name}: {e}")
            return False


def tail_file(filepath: Path, n: int = 15) -> str:
    """Reads the last n lines of a file."""
    if not filepath.exists():
        return "(no log file found)"
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
            return "".join(lines[-n:])
    except Exception as e:
        return f"(unable to read log: {e})"


def get_pids_listening_on_port(port: int) -> list[int]:
    """Finds PIDs listening on a given port."""
    pids = []
    if sys.platform == "win32":
        try:
            res = subprocess.run(["netstat", "-ano", "-p", "tcp"], capture_output=True, text=True, timeout=3)
            for line in res.stdout.splitlines():
                if f":{port} " in line and "LISTENING" in line:
                    parts = line.strip().split()
                    if parts:
                        pid_str = parts[-1]
                        if pid_str.isdigit() and int(pid_str) > 4:
                            pids.append(int(pid_str))
        except Exception:
            pass
    else:
        try:
            res = subprocess.run(["lsof", f"-i:{port}", "-sTCP:LISTEN", "-t"], capture_output=True, text=True, timeout=3)
            for line in res.stdout.splitlines():
                line = line.strip()
                if line.isdigit():
                    pids.append(int(line))
        except Exception:
            pass
    return list(set(pids))


def cmd_stop() -> None:
    """Stops all running HEXNS CRM services."""
    print("=" * 70)
    print("             HEXNS CRM - Graceful Shutdown System")
    print("=" * 70)
    print()

    # 1. Stop Frontend
    if FRONTEND_PID_FILE.exists():
        try:
            pid = int(FRONTEND_PID_FILE.read_text().strip())
            stop_process_tree(pid, "Frontend Next.js service")
        except Exception as e:
            print(f"[WARNING] Could not read frontend PID: {e}")
        try:
            FRONTEND_PID_FILE.unlink(missing_ok=True)
        except Exception:
            pass
    else:
        print("[INFO] Frontend PID file not found.")

    # Check for lingering process on frontend port
    for lingering_pid in get_pids_listening_on_port(FRONTEND_PORT):
        print(f"[INFO] Found lingering process on port {FRONTEND_PORT} (PID: {lingering_pid}). Stopping...")
        stop_process_tree(lingering_pid, f"Port {FRONTEND_PORT} listener")

    # 2. Stop Backend
    if BACKEND_PID_FILE.exists():
        try:
            pid = int(BACKEND_PID_FILE.read_text().strip())
            stop_process_tree(pid, "Backend FastAPI service")
        except Exception as e:
            print(f"[WARNING] Could not read backend PID: {e}")
        try:
            BACKEND_PID_FILE.unlink(missing_ok=True)
        except Exception:
            pass
    else:
        print("[INFO] Backend PID file not found.")

    # Check for lingering process on backend port
    for lingering_pid in get_pids_listening_on_port(BACKEND_PORT):
        print(f"[INFO] Found lingering process on port {BACKEND_PORT} (PID: {lingering_pid}). Stopping...")
        stop_process_tree(lingering_pid, f"Port {BACKEND_PORT} listener")

    # Verify ports
    time.sleep(1)
    if is_port_in_use(FRONTEND_PORT):
        print(f"[NOTICE] Port {FRONTEND_PORT} is still in use by an external process.")
    else:
        print(f"[OK] Port {FRONTEND_PORT} is clean.")

    if is_port_in_use(BACKEND_PORT):
        print(f"[NOTICE] Port {BACKEND_PORT} is still in use by an external process.")
    else:
        print(f"[OK] Port {BACKEND_PORT} is clean.")

    print()
    print("=" * 70)
    print("          HEXNS CRM Services are STOPPED Successfully")
    print("=" * 70)
    print()


def cmd_start() -> int:
    """Starts backend and frontend services and launches browser."""
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    backend_was_already_running = False
    frontend_was_already_running = False
    started_backend_proc = None
    started_frontend_proc = None

    python_bin = get_backend_python()

    # ---------------------------------------------------------
    # 1. Start Backend Service
    # ---------------------------------------------------------
    print("[1/2] Checking Backend FastAPI service...")
    if is_backend_healthy():
        print(f"[INFO] Backend is already running and healthy on {BACKEND_HEALTH_URL}")
        backend_was_already_running = True
    else:
        if is_port_in_use(BACKEND_PORT):
            print(f"[ERROR] Port {BACKEND_PORT} is occupied by another process that is not HEXNS CRM.")
            print("        Please stop the conflicting application before starting HEXNS CRM.")
            return 1

        print(f"[START] Launching FastAPI backend on http://{BACKEND_HOST}:{BACKEND_PORT}...")
        log_out = open(BACKEND_LOG_FILE, "a", encoding="utf-8")
        log_out.write(f"\n--- Started backend at {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
        log_out.flush()

        backend_cmd = [
            python_bin,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            BACKEND_HOST,
            "--port",
            str(BACKEND_PORT),
        ]

        kwargs = {
            "cwd": str(BACKEND_DIR),
            "stdout": log_out,
            "stderr": subprocess.STDOUT,
        }
        if sys.platform == "win32":
            kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
        else:
            kwargs["start_new_session"] = True

        started_backend_proc = subprocess.Popen(backend_cmd, **kwargs)
        BACKEND_PID_FILE.write_text(str(started_backend_proc.pid))
        print(f"[WAIT] Waiting for backend health check (PID: {started_backend_proc.pid})...")

        # Poll health endpoint
        backend_ready = False
        for _ in range(30):
            time.sleep(1)
            if started_backend_proc.poll() is not None:
                print(f"[ERROR] Backend process terminated unexpectedly (exit code: {started_backend_proc.returncode}).")
                print("Recent backend log output:")
                print(tail_file(BACKEND_LOG_FILE, 20))
                try:
                    BACKEND_PID_FILE.unlink(missing_ok=True)
                except Exception:
                    pass
                return 1

            if is_backend_healthy():
                backend_ready = True
                break

        if not backend_ready:
            print("[ERROR] Backend failed to respond to health check within 30 seconds.")
            print("Recent backend log output:")
            print(tail_file(BACKEND_LOG_FILE, 20))
            if started_backend_proc:
                stop_process_tree(started_backend_proc.pid, "Backend")
                BACKEND_PID_FILE.unlink(missing_ok=True)
            return 1

        print(f"[OK] Backend is healthy and ready on http://{BACKEND_HOST}:{BACKEND_PORT}")

    # ---------------------------------------------------------
    # 2. Start Frontend Service
    # ---------------------------------------------------------
    print("[2/2] Checking Frontend Next.js service...")
    if is_frontend_healthy():
        print(f"[INFO] Frontend is already running and responding on {FRONTEND_URL}")
        frontend_was_already_running = True
    else:
        if is_port_in_use(FRONTEND_PORT):
            print(f"[ERROR] Port {FRONTEND_PORT} is occupied by another process that is not HEXNS CRM.")
            print("        Please stop the conflicting application before starting HEXNS CRM.")
            if started_backend_proc:
                print("Stopping backend started during this session...")
                stop_process_tree(started_backend_proc.pid, "Backend")
                BACKEND_PID_FILE.unlink(missing_ok=True)
            return 1

        print(f"[START] Launching Next.js frontend on {FRONTEND_URL}...")
        log_out_fe = open(FRONTEND_LOG_FILE, "a", encoding="utf-8")
        log_out_fe.write(f"\n--- Started frontend at {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
        log_out_fe.flush()

        # Command to start frontend dev server bound to port 3000
        fe_cmd = "npm run dev -- -p 3000"

        kwargs_fe = {
            "cwd": str(FRONTEND_DIR),
            "stdout": log_out_fe,
            "stderr": subprocess.STDOUT,
            "shell": True,
        }
        if sys.platform == "win32":
            kwargs_fe["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
        else:
            kwargs_fe["start_new_session"] = True

        started_frontend_proc = subprocess.Popen(fe_cmd, **kwargs_fe)
        FRONTEND_PID_FILE.write_text(str(started_frontend_proc.pid))
        print(f"[WAIT] Waiting for frontend to compile and respond (PID: {started_frontend_proc.pid}, up to 60s)...")

        frontend_ready = False
        for _ in range(30):
            time.sleep(2)
            if started_frontend_proc.poll() is not None:
                print(f"[ERROR] Frontend process terminated unexpectedly (exit code: {started_frontend_proc.returncode}).")
                print("Recent frontend log output:")
                print(tail_file(FRONTEND_LOG_FILE, 20))
                try:
                    FRONTEND_PID_FILE.unlink(missing_ok=True)
                except Exception:
                    pass
                if started_backend_proc:
                    stop_process_tree(started_backend_proc.pid, "Backend")
                    BACKEND_PID_FILE.unlink(missing_ok=True)
                return 1

            if is_frontend_healthy():
                frontend_ready = True
                break

        if not frontend_ready:
            print("[ERROR] Frontend failed to respond within 60 seconds.")
            print("Recent frontend log output:")
            print(tail_file(FRONTEND_LOG_FILE, 20))
            if started_frontend_proc:
                stop_process_tree(started_frontend_proc.pid, "Frontend")
                FRONTEND_PID_FILE.unlink(missing_ok=True)
            if started_backend_proc:
                stop_process_tree(started_backend_proc.pid, "Backend")
                BACKEND_PID_FILE.unlink(missing_ok=True)
            return 1

        print(f"[OK] Frontend is healthy and ready on {FRONTEND_URL}")

    # ---------------------------------------------------------
    # 3. Open Browser
    # ---------------------------------------------------------
    if backend_was_already_running and frontend_was_already_running:
        print("[INFO] Both services were already active. Browser tab was not duplicated.")
    else:
        print(f"[BROWSER] Opening {FRONTEND_URL} in your default browser...")
        try:
            webbrowser.open(FRONTEND_URL)
        except Exception as e:
            print(f"[NOTICE] Could not automatically open browser: {e}")

    # ---------------------------------------------------------
    # 4. Summary Banner
    # ---------------------------------------------------------
    print()
    print("=" * 70)
    print("              HEXNS CRM is UP and RUNNING SUCCESSFULLY!")
    print("=" * 70)
    print()
    print(f"  Frontend Web App:      {FRONTEND_URL}")
    print(f"  Backend API:           http://{BACKEND_HOST}:{BACKEND_PORT}/api/v1")
    print(f"  Interactive API Docs:  http://{BACKEND_HOST}:{BACKEND_PORT}/docs")
    print()
    print(f"  Backend Logs:          logs/backend.log")
    print(f"  Frontend Logs:         logs/frontend.log")
    print()
    print("=" * 70)
    print("  To STOP all services gracefully, double-click:")
    if sys.platform == "win32":
        print("  stop.bat")
    else:
        print("  stop.command")
    print("=" * 70)
    print()
    return 0


def main():
    if len(sys.argv) < 2 or sys.argv[1] == "start":
        sys.exit(cmd_start())
    elif sys.argv[1] == "stop":
        cmd_stop()
        sys.exit(0)
    else:
        print(f"Usage: {sys.argv[0]} [start|stop]")
        sys.exit(1)


if __name__ == "__main__":
    main()
