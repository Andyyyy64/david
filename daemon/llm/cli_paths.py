from __future__ import annotations

import os
import shutil
from pathlib import Path


def _candidate_dirs(path_value: str | None = None) -> list[Path]:
    seen: set[str] = set()
    candidates: list[Path] = []

    def add(path: Path) -> None:
        expanded = path.expanduser()
        key = str(expanded)
        if not key or key in seen:
            return
        seen.add(key)
        candidates.append(expanded)

    for entry in (path_value or os.environ.get("PATH") or "").split(os.pathsep):
        if entry:
            add(Path(entry))

    home = Path.home()
    for extra in (
        home / ".nodebrew" / "current" / "bin",
        home / ".npm" / "bin",
        home / ".local" / "bin",
        home / "bin",
        Path("/opt/homebrew/bin"),
        Path("/opt/homebrew/sbin"),
        Path("/usr/local/bin"),
        Path("/usr/local/sbin"),
        Path("/usr/bin"),
        Path("/bin"),
        Path("/usr/sbin"),
        Path("/sbin"),
    ):
        add(extra)

    return candidates


def augmented_path(path_value: str | None = None) -> str:
    return os.pathsep.join(str(path) for path in _candidate_dirs(path_value))


def cli_env(base: dict[str, str] | None = None) -> dict[str, str]:
    env = dict(base or os.environ)
    env["PATH"] = augmented_path(env.get("PATH"))
    return env


def find_cli_binary(name: str, env: dict[str, str] | None = None) -> str | None:
    path_value = (env or os.environ).get("PATH")
    search_path = augmented_path(path_value)
    resolved = shutil.which(name, path=search_path)
    if resolved:
        return resolved

    for directory in _candidate_dirs(path_value):
        candidate = directory / name
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None
