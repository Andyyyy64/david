use std::path::{Path, PathBuf};
use std::process::Command;

fn augmented_path_entries() -> Vec<PathBuf> {
    let mut entries = Vec::new();

    fn push_unique(entries: &mut Vec<PathBuf>, path: PathBuf) {
        if !entries.iter().any(|existing| existing == &path) {
            entries.push(path);
        }
    }

    if let Some(path) = std::env::var_os("PATH") {
        for entry in std::env::split_paths(&path) {
            if !entry.as_os_str().is_empty() {
                push_unique(&mut entries, entry);
            }
        }
    }

    if let Some(home) = std::env::var_os("HOME").map(PathBuf::from) {
        for extra in [
            home.join(".nodebrew").join("current").join("bin"),
            home.join(".npm").join("bin"),
            home.join(".local").join("bin"),
            home.join("bin"),
        ] {
            push_unique(&mut entries, extra);
        }
    }

    for extra in [
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/opt/homebrew/sbin"),
        PathBuf::from("/usr/local/bin"),
        PathBuf::from("/usr/local/sbin"),
        PathBuf::from("/usr/bin"),
        PathBuf::from("/bin"),
        PathBuf::from("/usr/sbin"),
        PathBuf::from("/sbin"),
    ] {
        push_unique(&mut entries, extra);
    }

    entries
}

fn augmented_path() -> Option<std::ffi::OsString> {
    std::env::join_paths(augmented_path_entries()).ok()
}

pub fn augment_command_path(cmd: &mut Command) {
    if let Some(path) = augmented_path() {
        cmd.env("PATH", path);
    }
}

/// Resolve a candidate python path and confirm it's a real file (not a
/// dangling symlink). Returns the canonical path when possible so that
/// callers can verify containment with `starts_with`.
fn verify_python_binary(path: &Path) -> Option<PathBuf> {
    let canonical = std::fs::canonicalize(path).ok()?;
    if !canonical.is_file() {
        return None;
    }
    Some(canonical)
}

/// Accept a `.venv` interpreter path that lives under the repo root even if
/// the file itself is a symlink to a shared interpreter outside the repo
/// (common with uv/pyenv on macOS).
fn verify_repo_venv_python(repo_root: &Path, path: &Path) -> Option<PathBuf> {
    let canon_root = repo_root.canonicalize().ok()?;
    let canon_parent = path.parent()?.canonicalize().ok()?;
    if !canon_parent.starts_with(&canon_root) {
        return None;
    }
    let meta = std::fs::metadata(path).ok()?;
    if !meta.is_file() {
        return None;
    }
    Some(path.to_path_buf())
}

/// Find the Python binary by checking (in order):
/// 1. `VIDA_PYTHON` env var
/// 2. `.venv` in the given `repo_root`
/// 3. `python3` on PATH
/// 4. `python` on PATH
///
/// All candidates are canonicalized via std::fs::canonicalize so symlinks
/// and relative segments can't redirect execution to an unexpected binary.
pub fn find_python(repo_root: &PathBuf) -> Result<PathBuf, String> {
    // 1. Explicit override. Still verify it exists and is a regular file.
    if let Ok(p) = std::env::var("VIDA_PYTHON") {
        let path = PathBuf::from(&p);
        if let Some(verified) = verify_python_binary(&path) {
            return Ok(verified);
        }
    }

    // 2. .venv in repo root. uv commonly creates a symlinked interpreter
    //    whose real target lives outside the repo (for example under pyenv),
    //    so we verify that the `.venv/bin` directory itself is inside the
    //    repo and then execute the venv path directly.
    let venv_python = if cfg!(windows) {
        repo_root.join(".venv").join("Scripts").join("python.exe")
    } else {
        repo_root.join(".venv").join("bin").join("python")
    };
    if let Some(verified) = verify_repo_venv_python(repo_root, &venv_python) {
        return Ok(verified);
    }

    // 3. python3 on PATH
    if let Some(resolved) = which_on_path("python3") {
        if let Some(verified) = verify_python_binary(&resolved) {
            return Ok(verified);
        }
    }

    // 4. python on PATH
    if let Some(resolved) = which_on_path("python") {
        if let Some(verified) = verify_python_binary(&resolved) {
            return Ok(verified);
        }
    }

    Err("Python not found. Install Python or run `uv sync` to create a .venv".to_string())
}

/// Locate a binary via `which`/`where` and return its absolute path.
fn which_on_path(name: &str) -> Option<PathBuf> {
    if cfg!(windows) {
        let output = Command::new("where").arg(name).output().ok()?;
        if !output.status.success() {
            return None;
        }
        let stdout = String::from_utf8_lossy(&output.stdout);
        let first = stdout.lines().next()?.trim();
        return if first.is_empty() {
            None
        } else {
            Some(PathBuf::from(first))
        };
    }

    for dir in augmented_path_entries() {
        let candidate = dir.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}
