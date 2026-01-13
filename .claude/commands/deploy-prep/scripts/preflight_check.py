#!/usr/bin/env python3
"""
Pre-flight Check Script
Validates environment is ready for deployment.
Used by the deploy-prep skill before version bumping.
"""

import subprocess
import json
import sys
import os
from pathlib import Path
from typing import Dict, Any, List

class PreflightCheck:
    def __init__(self):
        self.results: Dict[str, Any] = {
            "status": "ready",
            "checks": {},
            "blockers": [],
            "warnings": []
        }

    def run_command(self, cmd: List[str], timeout: int = 120) -> Dict[str, Any]:
        """Run a command and return result."""
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "timeout"}
        except FileNotFoundError:
            return {"success": False, "error": "not_found"}

    def check_git_clean(self) -> bool:
        """Check if git working directory is clean."""
        result = self.run_command(['git', 'status', '--porcelain'])

        if not result['success']:
            self.results['blockers'].append("Unable to check git status")
            return False

        is_clean = result['stdout'].strip() == ''
        self.results['checks']['git_clean'] = {
            "status": "pass" if is_clean else "fail",
            "message": "Working directory clean" if is_clean else "Uncommitted changes detected"
        }

        if not is_clean:
            self.results['blockers'].append("Uncommitted changes in working directory")
            return False

        return True

    def check_branch(self) -> bool:
        """Check if on main/master branch."""
        result = self.run_command(['git', 'branch', '--show-current'])

        if not result['success']:
            self.results['warnings'].append("Unable to determine current branch")
            return True

        branch = result['stdout'].strip()
        is_main = branch in ['main', 'master']

        self.results['checks']['branch'] = {
            "status": "pass" if is_main else "warn",
            "current": branch,
            "message": f"On {branch} branch" + ("" if is_main else " (expected main/master)")
        }

        if not is_main:
            self.results['warnings'].append(f"Not on main branch (currently on {branch})")

        return True

    def check_tests(self) -> bool:
        """Run test suite."""
        # Check if test script exists
        if not Path('package.json').exists():
            self.results['checks']['tests'] = {"status": "skip", "message": "No package.json"}
            return True

        result = self.run_command(['npm', 'test', '--if-present'], timeout=300)

        self.results['checks']['tests'] = {
            "status": "pass" if result['success'] else "fail",
            "message": "All tests passed" if result['success'] else "Tests failed"
        }

        if not result['success']:
            self.results['blockers'].append("Test suite failed")
            return False

        return True

    def check_build(self) -> bool:
        """Run build process."""
        if not Path('package.json').exists():
            self.results['checks']['build'] = {"status": "skip", "message": "No package.json"}
            return True

        result = self.run_command(['npm', 'run', 'build', '--if-present'], timeout=300)

        self.results['checks']['build'] = {
            "status": "pass" if result['success'] else "fail",
            "message": "Build succeeded" if result['success'] else "Build failed"
        }

        if not result['success']:
            self.results['blockers'].append("Build process failed")
            return False

        return True

    def check_audit(self) -> bool:
        """Check for security vulnerabilities."""
        result = self.run_command(['npm', 'audit', '--json'])

        if result.get('error') == 'not_found':
            self.results['checks']['audit'] = {"status": "skip", "message": "npm not available"}
            return True

        try:
            audit_data = json.loads(result['stdout']) if result['stdout'] else {}
            vulnerabilities = audit_data.get('metadata', {}).get('vulnerabilities', {})
            high_crit = vulnerabilities.get('high', 0) + vulnerabilities.get('critical', 0)

            self.results['checks']['audit'] = {
                "status": "pass" if high_crit == 0 else "warn",
                "vulnerabilities": vulnerabilities,
                "message": f"No critical vulnerabilities" if high_crit == 0 else f"{high_crit} high/critical vulnerabilities"
            }

            if high_crit > 0:
                self.results['warnings'].append(f"{high_crit} high/critical security vulnerabilities")

        except json.JSONDecodeError:
            self.results['checks']['audit'] = {"status": "skip", "message": "Unable to parse audit"}

        return True

    def check_version(self) -> bool:
        """Get current version from package.json."""
        try:
            with open('package.json', 'r') as f:
                pkg = json.load(f)
                version = pkg.get('version', 'unknown')

            self.results['checks']['version'] = {
                "status": "pass",
                "current": version,
                "message": f"Current version: {version}"
            }
            self.results['currentVersion'] = version
            return True
        except (FileNotFoundError, json.JSONDecodeError):
            self.results['checks']['version'] = {"status": "skip", "message": "No package.json"}
            return True

    def run_all(self) -> Dict[str, Any]:
        """Run all preflight checks."""
        self.check_git_clean()
        self.check_branch()
        self.check_version()
        self.check_tests()
        self.check_build()
        self.check_audit()

        # Determine overall status
        if self.results['blockers']:
            self.results['status'] = 'blocked'
        elif self.results['warnings']:
            self.results['status'] = 'warnings'
        else:
            self.results['status'] = 'ready'

        return self.results


def main():
    """Run preflight checks and output results."""
    print("Running pre-flight checks...", file=sys.stderr)

    checker = PreflightCheck()
    results = checker.run_all()

    print(json.dumps(results, indent=2))

    # Exit with error if blocked
    if results['status'] == 'blocked':
        sys.exit(1)


if __name__ == '__main__':
    main()
