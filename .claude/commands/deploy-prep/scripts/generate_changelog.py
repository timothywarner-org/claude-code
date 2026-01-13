#!/usr/bin/env python3
"""
Changelog Generator Script
Generates changelog entries from conventional commits.
Used by the deploy-prep skill for release preparation.
"""

import subprocess
import re
import json
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional
from collections import defaultdict

# Mapping of conventional commit types to changelog sections
COMMIT_TYPE_MAP = {
    'feat': 'Added',
    'fix': 'Fixed',
    'perf': 'Changed',
    'refactor': 'Changed',
    'docs': 'Changed',
    'style': 'Changed',
    'security': 'Security',
    'deprecate': 'Deprecated',
    'remove': 'Removed'
}

# Types to exclude from changelog
EXCLUDED_TYPES = {'test', 'chore', 'build', 'ci'}

class ChangelogGenerator:
    def __init__(self):
        self.commits: List[Dict[str, Any]] = []
        self.sections: Dict[str, List[str]] = defaultdict(list)

    def get_last_tag(self) -> Optional[str]:
        """Get the most recent git tag."""
        try:
            result = subprocess.run(
                ['git', 'describe', '--tags', '--abbrev=0'],
                capture_output=True, text=True
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception:
            pass
        return None

    def get_commits_since_tag(self, tag: Optional[str]) -> List[Dict[str, Any]]:
        """Get all commits since the specified tag."""
        if tag:
            range_spec = f'{tag}..HEAD'
        else:
            range_spec = 'HEAD'

        try:
            result = subprocess.run(
                ['git', 'log', range_spec, '--pretty=format:%H|%s|%an|%ae'],
                capture_output=True, text=True
            )

            commits = []
            for line in result.stdout.strip().split('\n'):
                if not line:
                    continue
                parts = line.split('|', 3)
                if len(parts) >= 2:
                    commits.append({
                        'hash': parts[0][:7],
                        'message': parts[1],
                        'author': parts[2] if len(parts) > 2 else 'Unknown',
                        'email': parts[3] if len(parts) > 3 else ''
                    })
            return commits
        except Exception:
            return []

    def parse_conventional_commit(self, message: str) -> Dict[str, Any]:
        """Parse a conventional commit message."""
        # Pattern: type(scope)!: description or type!: description
        pattern = r'^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$'
        match = re.match(pattern, message)

        if match:
            return {
                'type': match.group(1).lower(),
                'scope': match.group(2),
                'breaking': match.group(3) == '!',
                'description': match.group(4)
            }
        return {
            'type': 'other',
            'scope': None,
            'breaking': False,
            'description': message
        }

    def extract_references(self, message: str) -> List[str]:
        """Extract PR/issue references from commit message."""
        refs = []
        # Match #123 or gh-123 patterns
        for match in re.finditer(r'(?:#|gh-)(\d+)', message, re.IGNORECASE):
            refs.append(f'#{match.group(1)}')
        return refs

    def categorize_commits(self) -> None:
        """Categorize commits into changelog sections."""
        for commit in self.commits:
            parsed = self.parse_conventional_commit(commit['message'])
            commit_type = parsed['type']

            # Skip excluded types
            if commit_type in EXCLUDED_TYPES:
                continue

            # Get section name
            section = COMMIT_TYPE_MAP.get(commit_type, 'Changed')

            # Handle breaking changes
            if parsed['breaking']:
                section = 'Changed'
                prefix = '**BREAKING:** '
            else:
                prefix = ''

            # Format entry
            description = parsed['description']
            refs = self.extract_references(commit['message'])
            ref_str = ' '.join(refs)

            entry = f"- {prefix}{description}"
            if ref_str:
                entry += f" ({ref_str})"

            self.sections[section].append(entry)

    def generate_markdown(self, version: str) -> str:
        """Generate markdown changelog entry."""
        date = datetime.now().strftime('%Y-%m-%d')
        lines = [f"## [{version}] - {date}", ""]

        # Order sections
        section_order = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security']

        for section in section_order:
            if section in self.sections and self.sections[section]:
                lines.append(f"### {section}")
                for entry in self.sections[section]:
                    lines.append(entry)
                lines.append("")

        return '\n'.join(lines)

    def generate(self, new_version: str) -> Dict[str, Any]:
        """Generate changelog and return results."""
        last_tag = self.get_last_tag()
        self.commits = self.get_commits_since_tag(last_tag)
        self.categorize_commits()

        changelog = self.generate_markdown(new_version)

        return {
            "lastTag": last_tag,
            "commitCount": len(self.commits),
            "commits": self.commits[:20],  # First 20 for reference
            "sections": dict(self.sections),
            "changelog": changelog
        }


def main():
    """Generate changelog and output results."""
    # Get version from argument or default
    version = sys.argv[1] if len(sys.argv) > 1 else "UNRELEASED"

    generator = ChangelogGenerator()
    results = generator.generate(version)

    print(json.dumps(results, indent=2))


if __name__ == '__main__':
    main()
