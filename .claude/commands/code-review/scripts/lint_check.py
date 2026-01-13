#!/usr/bin/env python3
"""
Lint Check Script
Runs linting and code quality checks on changed files.
Used by the code-review skill for automated quality analysis.
"""

import subprocess
import json
import sys
from pathlib import Path
from typing import List, Dict, Any

def run_command(cmd: List[str], cwd: str = None) -> Dict[str, Any]:
    """Run a command and capture output."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=cwd,
            timeout=60
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "stdout": "",
            "stderr": "Command timed out",
            "returncode": -1
        }
    except FileNotFoundError:
        return {
            "success": True,  # Tool not installed, skip
            "stdout": "",
            "stderr": f"Command not found: {cmd[0]}",
            "returncode": 0,
            "skipped": True
        }

def check_eslint() -> Dict[str, Any]:
    """Run ESLint if available."""
    result = run_command(['npx', 'eslint', '.', '--ext', '.ts,.tsx,.js,.jsx', '--format', 'json'])

    if result.get('skipped'):
        return {"tool": "eslint", "status": "skipped", "issues": []}

    issues = []
    if result['stdout']:
        try:
            eslint_output = json.loads(result['stdout'])
            for file_result in eslint_output:
                for msg in file_result.get('messages', []):
                    issues.append({
                        "file": file_result['filePath'],
                        "line": msg.get('line', 0),
                        "severity": "warning" if msg.get('severity') == 1 else "error",
                        "message": msg.get('message', ''),
                        "rule": msg.get('ruleId', 'unknown')
                    })
        except json.JSONDecodeError:
            pass

    return {
        "tool": "eslint",
        "status": "pass" if result['success'] else "fail",
        "issues": issues
    }

def check_typescript() -> Dict[str, Any]:
    """Run TypeScript compiler check."""
    result = run_command(['npx', 'tsc', '--noEmit'])

    if result.get('skipped'):
        return {"tool": "typescript", "status": "skipped", "issues": []}

    issues = []
    if result['stderr'] or result['stdout']:
        output = result['stdout'] + result['stderr']
        # Parse TypeScript errors (format: file(line,col): error TS####: message)
        import re
        pattern = r'([^(]+)\((\d+),(\d+)\):\s*(error|warning)\s+TS(\d+):\s*(.+)'
        for match in re.finditer(pattern, output):
            issues.append({
                "file": match.group(1),
                "line": int(match.group(2)),
                "severity": "error" if match.group(4) == "error" else "warning",
                "message": match.group(6),
                "rule": f"TS{match.group(5)}"
            })

    return {
        "tool": "typescript",
        "status": "pass" if result['success'] else "fail",
        "issues": issues
    }

def check_prettier() -> Dict[str, Any]:
    """Check if files are formatted with Prettier."""
    result = run_command(['npx', 'prettier', '--check', '.'])

    if result.get('skipped'):
        return {"tool": "prettier", "status": "skipped", "issues": []}

    issues = []
    if not result['success']:
        # Parse unformatted files from output
        output = result['stdout'] + result['stderr']
        for line in output.split('\n'):
            if line.strip() and not line.startswith('Checking') and not line.startswith('['):
                issues.append({
                    "file": line.strip(),
                    "line": 0,
                    "severity": "suggestion",
                    "message": "File not formatted with Prettier",
                    "rule": "prettier"
                })

    return {
        "tool": "prettier",
        "status": "pass" if result['success'] else "fail",
        "issues": issues[:10]  # Limit to first 10
    }

def check_package_audit() -> Dict[str, Any]:
    """Run npm audit for security vulnerabilities."""
    result = run_command(['npm', 'audit', '--json'])

    if result.get('skipped'):
        return {"tool": "npm-audit", "status": "skipped", "issues": []}

    issues = []
    if result['stdout']:
        try:
            audit_output = json.loads(result['stdout'])
            vulnerabilities = audit_output.get('vulnerabilities', {})
            for name, vuln in vulnerabilities.items():
                severity_map = {"low": "suggestion", "moderate": "warning", "high": "error", "critical": "error"}
                issues.append({
                    "file": "package.json",
                    "line": 0,
                    "severity": severity_map.get(vuln.get('severity', 'low'), 'warning'),
                    "message": f"Vulnerability in {name}: {vuln.get('severity', 'unknown')} severity",
                    "rule": "npm-audit"
                })
        except json.JSONDecodeError:
            pass

    return {
        "tool": "npm-audit",
        "status": "pass" if not issues else "fail",
        "issues": issues
    }

def main():
    """Run all lint checks and output combined results."""
    print("Running code quality checks...", file=sys.stderr)

    results = {
        "checks": [],
        "total_issues": 0,
        "passed": True
    }

    # Run all checks
    checks = [
        check_eslint(),
        check_typescript(),
        check_prettier(),
        check_package_audit()
    ]

    for check in checks:
        results["checks"].append(check)
        results["total_issues"] += len(check.get("issues", []))
        if check["status"] == "fail":
            results["passed"] = False

    # Output summary
    print(json.dumps(results, indent=2))

    # Exit with error if checks failed
    if not results["passed"]:
        sys.exit(1)

if __name__ == '__main__':
    main()
