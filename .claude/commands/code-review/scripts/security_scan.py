#!/usr/bin/env python3
"""
Security Scanner Script
Scans staged/changed files for common security vulnerabilities.
Used by the code-review skill for automated security checks.
"""

import re
import sys
import subprocess
from pathlib import Path
from typing import List, Dict, Any
import json

# Security patterns to detect
SECURITY_PATTERNS = {
    "hardcoded_secret": {
        "pattern": r'(api[_-]?key|secret|password|token|credential)\s*[:=]\s*[\'"][^\'"]{8,}[\'"]',
        "severity": "critical",
        "message": "Possible hardcoded secret detected"
    },
    "sql_injection": {
        "pattern": r'(query|execute)\s*\(\s*[`\'"].*\$\{',
        "severity": "critical",
        "message": "Possible SQL injection vulnerability (string interpolation in query)"
    },
    "eval_usage": {
        "pattern": r'\beval\s*\(',
        "severity": "critical",
        "message": "eval() usage detected - potential code injection risk"
    },
    "inner_html": {
        "pattern": r'\.innerHTML\s*=',
        "severity": "warning",
        "message": "innerHTML assignment detected - potential XSS risk"
    },
    "dangerously_set": {
        "pattern": r'dangerouslySetInnerHTML',
        "severity": "warning",
        "message": "dangerouslySetInnerHTML detected - ensure input is sanitized"
    },
    "console_log": {
        "pattern": r'console\.(log|debug|info)\s*\([^)]*password',
        "severity": "warning",
        "message": "Possible sensitive data in console output"
    },
    "http_url": {
        "pattern": r'[\'"]http://(?!localhost)',
        "severity": "warning",
        "message": "Non-HTTPS URL detected"
    },
    "weak_crypto": {
        "pattern": r'(md5|sha1)\s*\(',
        "severity": "warning",
        "message": "Weak cryptographic algorithm detected"
    },
    "cors_wildcard": {
        "pattern": r'Access-Control-Allow-Origin[\'"]?\s*:\s*[\'"]?\*',
        "severity": "warning",
        "message": "CORS wildcard detected - consider restricting origins"
    },
    "debug_true": {
        "pattern": r'debug\s*[:=]\s*[Tt]rue',
        "severity": "suggestion",
        "message": "Debug mode enabled - ensure disabled in production"
    }
}

def get_changed_files() -> List[str]:
    """Get list of changed files from git."""
    try:
        # Try staged files first
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only'],
            capture_output=True, text=True, check=True
        )
        files = result.stdout.strip().split('\n')

        if not files or files == ['']:
            # Fall back to diff against main
            result = subprocess.run(
                ['git', 'diff', '--name-only', 'main...HEAD'],
                capture_output=True, text=True, check=True
            )
            files = result.stdout.strip().split('\n')

        # Filter for code files
        code_extensions = {'.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rb'}
        return [f for f in files if f and Path(f).suffix in code_extensions]
    except subprocess.CalledProcessError:
        return []

def scan_file(filepath: str) -> List[Dict[str, Any]]:
    """Scan a single file for security issues."""
    issues = []

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
    except (FileNotFoundError, UnicodeDecodeError):
        return issues

    for name, check in SECURITY_PATTERNS.items():
        pattern = re.compile(check['pattern'], re.IGNORECASE)

        for line_num, line in enumerate(lines, 1):
            if pattern.search(line):
                issues.append({
                    "type": name,
                    "severity": check['severity'],
                    "file": filepath,
                    "line": line_num,
                    "message": check['message'],
                    "content": line.strip()[:100]  # Truncate for display
                })

    return issues

def main():
    """Run security scan and output results."""
    files = get_changed_files()

    if not files:
        print(json.dumps({
            "status": "ok",
            "message": "No files to scan",
            "issues": []
        }))
        return

    all_issues = []
    for filepath in files:
        issues = scan_file(filepath)
        all_issues.extend(issues)

    # Sort by severity
    severity_order = {"critical": 0, "warning": 1, "suggestion": 2}
    all_issues.sort(key=lambda x: severity_order.get(x['severity'], 99))

    result = {
        "status": "issues_found" if all_issues else "ok",
        "files_scanned": len(files),
        "issues_count": len(all_issues),
        "critical_count": sum(1 for i in all_issues if i['severity'] == 'critical'),
        "warning_count": sum(1 for i in all_issues if i['severity'] == 'warning'),
        "issues": all_issues
    }

    print(json.dumps(result, indent=2))

    # Exit with error code if critical issues found
    if result['critical_count'] > 0:
        sys.exit(1)

if __name__ == '__main__':
    main()
