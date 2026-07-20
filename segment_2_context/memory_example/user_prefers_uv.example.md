---
name: user-prefers-uv
description: Default to uv for all Python work; use pip only as a fallback when uv is unavailable.
metadata:
  type: feedback
---

The user prefers **uv** for all Python dependency and environment work: `pyproject.toml` plus `uv.lock`, `uv add` for dependencies, and `uv run` to execute inside the managed venv. Fall back to pip with `requirements.txt` only on a box where uv is not installed.

**Why:** uv resolves and installs far faster than pip and produces a committed lockfile, so a fresh clone reproduces the exact environment. It also removes the manual venv-activate step, which matters when the user is running commands live during a recording.

**How to apply:** When scaffolding a Python project or adding a dependency, reach for uv commands first. Only suggest pip if uv is absent. See [[project-conventions]] for the repo-wide statement of this.
