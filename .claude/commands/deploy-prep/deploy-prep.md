---
name: deploy-prep
description: Prepare for deployment with pre-flight checks, changelog generation, and version bumping. Use before releasing to production.
allowed-tools: Read, Glob, Grep, Bash(git:*, npm:*, node:*)
argument-hint: "[patch|minor|major] [--dry-run]"
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "echo 'Executing deployment command...'"
---

# Deployment Preparation Workflow

Comprehensive pre-deployment checklist and automation.

## Arguments

- `$1` - Version bump type: `patch`, `minor`, or `major` (default: `patch`)
- `--dry-run` - Show what would happen without making changes

## Workflow Steps

### Step 1: Environment Validation

Run the pre-flight check script:
```bash
python .claude/commands/deploy-prep/scripts/preflight_check.py
```

This validates:
- Git working directory is clean
- On correct branch (main/master)
- All tests pass
- Build succeeds
- No security vulnerabilities

### Step 2: Generate Changelog

Analyze commits since last tag:
```bash
python .claude/commands/deploy-prep/scripts/generate_changelog.py
```

The script:
1. Gets commits since last release tag
2. Categorizes by conventional commit type
3. Generates markdown changelog entry
4. See [CHANGELOG_FORMAT.md](CHANGELOG_FORMAT.md) for format

### Step 3: Version Bump

Determine new version based on:
- `patch` (1.0.0 → 1.0.1): Bug fixes, minor changes
- `minor` (1.0.0 → 1.1.0): New features, backwards compatible
- `major` (1.0.0 → 2.0.0): Breaking changes

Update version in:
- `package.json`
- `package-lock.json`
- Any version constants in code

### Step 4: Create Release Artifacts

Generate:
1. **CHANGELOG entry** - Human-readable release notes
2. **Git tag** - Semantic version tag
3. **Release commit** - Version bump commit

### Step 5: Final Checklist

Before pushing, verify:

- [ ] All CI checks passing
- [ ] Changelog reviewed
- [ ] Version number correct
- [ ] Breaking changes documented
- [ ] Migration guide if needed

## Output Format

```json
{
  "status": "ready|blocked",
  "currentVersion": "1.2.3",
  "newVersion": "1.2.4",
  "versionType": "patch",
  "changelog": "## [1.2.4] - 2024-01-15\n...",
  "commits": [
    {"hash": "abc123", "type": "feat", "message": "Add new feature"}
  ],
  "checks": {
    "tests": "pass",
    "build": "pass",
    "audit": "pass",
    "git_clean": true
  },
  "commands": [
    "npm version patch",
    "git push --follow-tags"
  ]
}
```

## Dry Run Mode

With `--dry-run`, the skill will:
1. Run all checks and validation
2. Generate changelog preview
3. Show version bump preview
4. Output commands that WOULD be run
5. Make NO actual changes

## Integration

### CI/CD Pipeline

Use in GitHub Actions:
```yaml
- name: Prepare Release
  run: |
    claude -p "/project:deploy-prep minor" --output-format json > release.json
    if [ $(jq -r '.status' release.json) = "ready" ]; then
      npm version minor
      git push --follow-tags
    fi
```

### Pre-push Hook

Add to `.git/hooks/pre-push`:
```bash
#!/bin/bash
claude -p "/project:deploy-prep --dry-run" || exit 1
```

## See Also

- [CHANGELOG_FORMAT.md](CHANGELOG_FORMAT.md) - Changelog formatting rules
- [SEMVER_GUIDE.md](SEMVER_GUIDE.md) - When to use each version type
