"""Configuration-driven HEXNS CRM service launcher."""

from __future__ import annotations

import hashlib
import json
import os
import re
import shlex
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
RUN_DIR = PROJECT_ROOT / ".run"
LOGS_DIR = PROJECT_ROOT / "logs"
BACKEND_PID_FILE = RUN_DIR / "backend.pid"
FRONTEND_PID_FILE = RUN_DIR / "frontend.pid"
BACKEND_LOG_FILE = LOGS_DIR / "backend.log"
FRONTEND_LOG_FILE = LOGS_DIR / "frontend.log"
BACKEND_HOST = os.environ.get("HEXNS_BACKEND_HOST", "127.0.0.1")
BACKEND_PORT = int(os.environ.get("HEXNS_BACKEND_PORT", "8000"))
FRONTEND_HOST = os.environ.get("HEXNS_FRONTEND_HOST", "127.0.0.1")
FRONTEND_PORT = int(os.environ.get("HEXNS_FRONTEND_PORT", "3000"))
BACKEND_HEALTH_URL = f"http://{BACKEND_HOST}:{BACKEND_PORT}/health"
FRONTEND_URL = f"http://localhost:{FRONTEND_PORT}"
MARKER_FILE = RUN_DIR / "dependency-fingerprints.json"


def fail(message: str) -> None:
    print(f"[ERROR] {message}")


def load_json(path: Path, default: Any = None) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def file_hashes(paths: list[Path]) -> dict[str, str]:
    result: dict[str, str] = {}
    for path in paths:
        if path.is_file():
            result[str(path.relative_to(PROJECT_ROOT))] = hashlib.sha256(
                path.read_bytes()
            ).hexdigest()
    return result


def dependency_files() -> tuple[list[Path], list[Path]]:
    backend = [
        path
        for name in ("requirements.txt", "pyproject.toml", "Pipfile", "Pipfile.lock")
        if (path := BACKEND_DIR / name).is_file()
    ]
    frontend = [
        path
        for name in ("package.json", "package-lock.json", "npm-shrinkwrap.json")
        if (path := FRONTEND_DIR / name).is_file()
    ]
    return backend, frontend


def run_command(
    command: list[str], cwd: Path, *, check: bool = True
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, cwd=cwd, text=True, check=check)


def get_backend_python() -> str:
    name = "python.exe" if sys.platform == "win32" else "python"
    venv_python = BACKEND_DIR / ".venv" / ("Scripts" if sys.platform == "win32" else "bin") / name
    return str(venv_python) if venv_python.is_file() else sys.executable


def setup_backend_dependencies() -> str | None:
    backend_files, _ = dependency_files()
    if not backend_files:
        fail("No backend dependency file was found (expected requirements.txt or pyproject.toml).")
        return None

    python = get_backend_python()
    if not Path(python).is_file():
        python = sys.executable
    environment_created = False
    if not (BACKEND_DIR / ".venv").is_dir():
        print("[SETUP] Creating backend virtual environment in backend/.venv...")
        run_command([sys.executable, "-m", "venv", str(BACKEND_DIR / ".venv")], PROJECT_ROOT)
        python = get_backend_python()
        environment_created = True

    fingerprints = load_json(MARKER_FILE, {})
    current = file_hashes(backend_files)
    if not environment_created and fingerprints.get("backend") == current:
        print("[OK] Backend dependencies are up to date.")
        return python

    print("[SETUP] Installing backend dependencies in the project virtual environment...")
    requirements = BACKEND_DIR / "requirements.txt"
    if requirements.is_file():
        run_command([python, "-m", "pip", "install", "-r", str(requirements)], PROJECT_ROOT)
    elif (BACKEND_DIR / "pyproject.toml").is_file():
        run_command([python, "-m", "pip", "install", "-e", str(BACKEND_DIR)], PROJECT_ROOT)
    else:
        fail("A backend dependency file exists but is not supported by the launcher.")
        return None
    fingerprints["backend"] = current
    MARKER_FILE.write_text(json.dumps(fingerprints, indent=2), encoding="utf-8")
    return python


def setup_frontend_dependencies() -> bool:
    _, frontend_files = dependency_files()
    package_json = FRONTEND_DIR / "package.json"
    if not package_json.is_file():
        fail("Frontend package.json was not found.")
        return False
    package_lock = FRONTEND_DIR / "package-lock.json"
    if package_lock.is_file():
        try:
            json.loads(package_lock.read_text(encoding="utf-8"))
        except ValueError:
            fail("frontend/package-lock.json is not valid JSON; repair it before starting.")
            return False

    fingerprints = load_json(MARKER_FILE, {})
    current = file_hashes(frontend_files)
    if fingerprints.get("frontend") == current and (FRONTEND_DIR / "node_modules").is_dir():
        print("[OK] Frontend dependencies are up to date.")
        return True

    npm = shutil.which("npm.cmd" if sys.platform == "win32" else "npm")
    if not npm:
        fail("npm was not found. Install Node.js 18.18+ and try again.")
        return False
    print("[SETUP] Installing frontend dependencies...")
    command = [npm, "ci"] if package_lock.is_file() else [npm, "install"]
    try:
        run_command(command, FRONTEND_DIR)
    except subprocess.CalledProcessError:
        if package_lock.is_file():
            fail("npm ci failed. Fix package.json/package-lock.json consistency and try again.")
        return False
    fingerprints["frontend"] = current
    MARKER_FILE.write_text(json.dumps(fingerprints, indent=2), encoding="utf-8")
    return True


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")
    return values


def is_placeholder(value: str) -> bool:
    lowered = value.lower()
    return not value or any(
        marker in lowered
        for marker in ("example", "replace-with", "localhost/dbname", "user:password", "******")
    )


def ensure_and_validate_environment() -> bool:
    backend_env = BACKEND_DIR / ".env"
    frontend_env = FRONTEND_DIR / ".env.local"
    for target, template in (
        (backend_env, BACKEND_DIR / ".env.example"),
        (frontend_env, FRONTEND_DIR / ".env.example"),
    ):
        if not target.is_file() and template.is_file():
            shutil.copyfile(template, target)
            print(f"[SETUP] Created {target.relative_to(PROJECT_ROOT)} from its example template.")

    backend_values = parse_env_file(backend_env)
    frontend_values = parse_env_file(frontend_env)
    missing = [
        key for key in ("DATABASE_URL", "SYNC_DATABASE_URL")
        if is_placeholder(os.environ.get(key, backend_values.get(key, "")))
    ]
    if missing:
        fail(
            "Missing required backend configuration: "
            + ", ".join(missing)
            + ". Set valid Neon PostgreSQL values in backend/.env and retry."
        )
    frontend_api = os.environ.get("NEXT_PUBLIC_API_URL", frontend_values.get("NEXT_PUBLIC_API_URL", ""))
    if is_placeholder(frontend_api):
        fail("Missing NEXT_PUBLIC_API_URL. Set it in frontend/.env.local and retry.")
        missing.append("NEXT_PUBLIC_API_URL")
    if missing:
        print("[INFO] Existing environment files were not overwritten; credentials are never printed.")
        return False
    return True


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        try:
            sock.connect((host, port))
            return True
        except OSError:
            return False


def request_ok(url: str) -> bool:
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "HEXNS-Launcher"}), timeout=1.5) as response:
            return 200 <= response.status < 400
    except (OSError, urllib.error.URLError, urllib.error.HTTPError):
        return False


def backend_healthy() -> bool:
    return request_ok(BACKEND_HEALTH_URL)


def frontend_healthy() -> bool:
    return request_ok(FRONTEND_URL)


def migration_state(python: str) -> tuple[bool, str]:
    try:
        current = subprocess.run(
            [python, "-m", "alembic", "current"], cwd=BACKEND_DIR,
            capture_output=True, text=True, check=True
        ).stdout
        heads = subprocess.run(
            [python, "-m", "alembic", "heads"], cwd=BACKEND_DIR,
            capture_output=True, text=True, check=True
        ).stdout
    except subprocess.CalledProcessError as error:
        return False, error.stderr.strip() or error.stdout.strip() or "Alembic could not inspect the database."
    revision_pattern = re.compile(r"\b[0-9a-f]{8,40}\b")
    head_ids = set(revision_pattern.findall(heads))
    current_ids = set(revision_pattern.findall(current))
    return bool(head_ids and head_ids.issubset(current_ids)), ""


def run_migrations(python: str) -> bool:
    print("[DB] Checking Alembic migrations...")
    up_to_date, error = migration_state(python)
    if error:
        fail(f"Could not inspect database migrations: {error}")
        return False
    if up_to_date:
        print("[OK] Database migrations are up to date.")
        return True
    print("[DB] Applying pending migrations with Alembic (no reset or destructive operation is used)...")
    try:
        run_command([python, "-m", "alembic", "upgrade", "head"], BACKEND_DIR)
    except subprocess.CalledProcessError:
        fail("Database migration failed. Startup stopped; existing data was not reset or deleted.")
        return False
    return True


def read_command_from_procfile(python: str) -> list[str]:
    procfile = BACKEND_DIR / "Procfile"
    if procfile.is_file():
        for line in procfile.read_text(encoding="utf-8").splitlines():
            if line.startswith("web:"):
                tokens = shlex.split(line[4:].strip())
                if tokens and Path(tokens[0]).name == "uvicorn":
                    tokens = [python, "-m", "uvicorn"] + tokens[1:]
                tokens = [token for token in tokens if not token.startswith("${PORT")]
                break
        else:
            tokens = []
    else:
        tokens = []
    if not tokens:
        tokens = [python, "-m", "uvicorn", "app.main:app"]
    normalized: list[str] = []
    skip_next = False
    for token in tokens:
        if skip_next:
            skip_next = False
            continue
        if token in {"--host", "--port"}:
            skip_next = True
            continue
        normalized.append(token)
    normalized += ["--host", BACKEND_HOST, "--port", str(BACKEND_PORT)]
    return normalized


def frontend_command() -> list[str] | None:
    package = load_json(FRONTEND_DIR / "package.json", {})
    script = package.get("scripts", {}).get(os.environ.get("HEXNS_FRONTEND_SCRIPT", "dev"))
    if not script:
        fail("No frontend startup script was found in frontend/package.json.")
        return None
    npm = shutil.which("npm.cmd" if sys.platform == "win32" else "npm")
    if not npm:
        fail("npm was not found.")
        return None
    return [npm, "run", os.environ.get("HEXNS_FRONTEND_SCRIPT", "dev"), "--", "-H", FRONTEND_HOST, "-p", str(FRONTEND_PORT)]


def write_pid(path: Path, pid: int, kind: str) -> None:
    path.write_text(json.dumps({"pid": pid, "kind": kind, "started": time.time()}), encoding="utf-8")


def read_pid(path: Path) -> tuple[int, str] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return int(value["pid"]), str(value["kind"])
    except (OSError, ValueError, KeyError, TypeError):
        try:
            return int(path.read_text(encoding="utf-8").strip()), ""
        except (OSError, ValueError):
            return None


def process_args(pid: int) -> str:
    if sys.platform == "win32":
        command = (
            "Get-CimInstance Win32_Process -Filter "
            f"'ProcessId={pid}' | Select-Object -ExpandProperty CommandLine"
        )
        result = subprocess.run(["powershell", "-NoProfile", "-Command", command], capture_output=True, text=True, timeout=4)
        return result.stdout.strip().lower()
    result = subprocess.run(["ps", "-p", str(pid), "-o", "args="], capture_output=True, text=True, timeout=4)
    return result.stdout.strip().lower()


def pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    if sys.platform == "win32":
        return bool(process_args(pid))
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def owned_process(pid: int, kind: str) -> bool:
    args = process_args(pid)
    markers = ("uvicorn", "app.main:app") if kind == "backend" else ("npm", "next", "dev")
    return bool(args) and any(marker in args for marker in markers)


def stop_owned_process(path: Path, kind: str) -> None:
    record = read_pid(path)
    if not record:
        path.unlink(missing_ok=True)
        print(f"[INFO] No valid {kind} process record found.")
        return
    pid, recorded_kind = record
    kind = recorded_kind or kind
    if not pid_alive(pid):
        print(f"[INFO] {kind.capitalize()} is already stopped.")
        path.unlink(missing_ok=True)
        return
    if not owned_process(pid, kind):
        print(f"[WARNING] Refusing to stop PID {pid}: it is not recognized as a HEXNS CRM {kind} process.")
        return
    print(f"[STOP] Stopping {kind} (PID: {pid})...")
    if sys.platform == "win32":
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True, timeout=8)
    else:
        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except OSError:
            os.kill(pid, signal.SIGTERM)
        for _ in range(10):
            if not pid_alive(pid):
                break
            time.sleep(0.5)
        if pid_alive(pid):
            try:
                os.killpg(os.getpgid(pid), signal.SIGKILL)
            except OSError:
                os.kill(pid, signal.SIGKILL)
    path.unlink(missing_ok=True)
    print(f"[OK] {kind.capitalize()} stopped.")


def launch(command: list[str], cwd: Path, log_path: Path, pid_path: Path, kind: str) -> subprocess.Popen[str]:
    log = log_path.open("a", encoding="utf-8")
    log.write(f"\n--- Started {kind} at {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
    log.flush()
    kwargs: dict[str, Any] = {"cwd": str(cwd), "stdout": log, "stderr": subprocess.STDOUT, "text": True}
    if sys.platform == "win32":
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True
    process = subprocess.Popen(command, **kwargs)
    log.close()
    write_pid(pid_path, process.pid, kind)
    return process


def stop_started(backend: subprocess.Popen[str] | None, frontend: subprocess.Popen[str] | None) -> None:
    for process, path, kind in (
        (frontend, FRONTEND_PID_FILE, "frontend"),
        (backend, BACKEND_PID_FILE, "backend"),
    ):
        if process and process.poll() is None:
            stop_owned_process(path, kind)


def wait_for(service: str, process: subprocess.Popen[str], check: Any, seconds: int) -> bool:
    for _ in range(seconds):
        if process.poll() is not None:
            fail(f"{service} exited unexpectedly with code {process.returncode}. See logs/{service}.log.")
            return False
        if check():
            return True
        time.sleep(1)
    fail(f"{service} did not become healthy within {seconds} seconds. See logs/{service}.log.")
    return False


def cmd_start() -> int:
    RUN_DIR.mkdir(exist_ok=True)
    LOGS_DIR.mkdir(exist_ok=True)
    backend_process = frontend_process = None
    python = setup_backend_dependencies()
    if not python or not setup_frontend_dependencies() or not ensure_and_validate_environment():
        return 1
    if not run_migrations(python):
        return 1

    if backend_healthy():
        print(f"[INFO] Backend is already healthy at {BACKEND_HEALTH_URL}")
    else:
        if is_port_in_use(BACKEND_PORT, BACKEND_HOST):
            fail(f"Port {BACKEND_PORT} is occupied by a process not started by HEXNS CRM.")
            return 1
        backend_process = launch(read_command_from_procfile(python), BACKEND_DIR, BACKEND_LOG_FILE, BACKEND_PID_FILE, "backend")
        if not wait_for("backend", backend_process, backend_healthy, 30):
            stop_started(backend_process, None)
            return 1
        print(f"[OK] Backend is healthy at {BACKEND_HEALTH_URL}")

    if frontend_healthy():
        print(f"[INFO] Frontend is already healthy at {FRONTEND_URL}")
    else:
        if is_port_in_use(FRONTEND_PORT, FRONTEND_HOST):
            fail(f"Port {FRONTEND_PORT} is occupied by a process not started by HEXNS CRM.")
            stop_started(backend_process, None)
            return 1
        command = frontend_command()
        if not command:
            stop_started(backend_process, None)
            return 1
        frontend_process = launch(command, FRONTEND_DIR, FRONTEND_LOG_FILE, FRONTEND_PID_FILE, "frontend")
        if not wait_for("frontend", frontend_process, frontend_healthy, 60):
            stop_started(backend_process, frontend_process)
            return 1
        print(f"[OK] Frontend is healthy at {FRONTEND_URL}")

    print("[BROWSER] Opening the CRM in your default browser...")
    webbrowser.open(FRONTEND_URL)
    print(f"[OK] HEXNS CRM is running: {FRONTEND_URL}")
    print("[INFO] Logs: logs/backend.log and logs/frontend.log")
    return 0


def cmd_stop() -> int:
    print("HEXNS CRM shutdown")
    stop_owned_process(FRONTEND_PID_FILE, "frontend")
    stop_owned_process(BACKEND_PID_FILE, "backend")
    print("[OK] Shutdown complete. Unrelated processes were not touched.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"start", "stop"}:
        print(f"Usage: {Path(sys.argv[0]).name} [start|stop]")
        sys.exit(1)
    sys.exit(cmd_start() if sys.argv[1] == "start" else cmd_stop())
