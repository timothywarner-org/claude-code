"""Pre-deploy environment check for a keyless Azure OpenAI app.

Verifies that the environment variables the app reads at runtime are present
and non-empty. Exits non-zero when any value is missing, so a CI or azd
pre-provision step halts before wasting a provisioning cycle.

This check is deliberately narrow: it confirms configuration is present, not
that credentials are valid. Token validation happens at first API call.

Run with uv:
    uv run python preflight.py
"""

from __future__ import annotations

import os
import sys

# The app reads these at runtime. Endpoint and deployment are mandatory.
# No key variable is checked because the keyless client never reads one.
REQUIRED_ENV_VARS: tuple[str, ...] = (
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_DEPLOYMENT",
)


def find_missing(names: tuple[str, ...]) -> list[str]:
    """Return the subset of env var names that are unset or empty after trim.

    Args:
        names: Environment variable names to check.

    Returns:
        Names that are absent or hold only whitespace.
    """
    return [name for name in names if not os.environ.get(name, "").strip()]


def main() -> int:
    """Run the preflight check. Returns 0 when all required vars are set, 1 otherwise."""
    try:
        missing = find_missing(REQUIRED_ENV_VARS)
    except Exception as error:  # noqa: BLE001 - report any unexpected failure and fail closed
        print(f"Preflight check errored: {error}", file=sys.stderr)
        return 1

    if missing:
        print("Preflight failed. Set these environment variables:", file=sys.stderr)
        for name in missing:
            print(f"  - {name}", file=sys.stderr)
        return 1

    print("Preflight passed. Required Azure OpenAI environment variables are set.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
