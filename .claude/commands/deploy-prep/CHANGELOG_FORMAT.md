# Changelog Format Guide

Reference for generating consistent, readable changelogs.

## Format

Follow [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [1.2.3] - 2024-01-15

### Added
- New feature description (#123)

### Changed
- Modified behavior description (#124)

### Deprecated
- Feature that will be removed (#125)

### Removed
- Removed feature description (#126)

### Fixed
- Bug fix description (#127)

### Security
- Security fix description (#128)
```

## Commit Type Mapping

| Commit Type | Changelog Section |
|-------------|-------------------|
| `feat` | Added |
| `fix` | Fixed |
| `perf` | Changed |
| `refactor` | Changed |
| `docs` | Changed |
| `style` | Changed |
| `test` | (omit) |
| `chore` | (omit) |
| `build` | (omit) |
| `ci` | (omit) |
| `security` | Security |
| `deprecate` | Deprecated |
| `remove` | Removed |

## Entry Format

Each entry should:
1. Start with a verb (Add, Fix, Update, Remove)
2. Be concise but descriptive
3. Include PR/issue number if available
4. Mention breaking changes prominently

### Good Examples

```markdown
### Added
- Add dark mode toggle to settings page (#234)
- Add rate limiting to authentication endpoints (#235)

### Fixed
- Fix memory leak in WebSocket handler (#236)
- Fix incorrect date formatting in reports (#237)

### Changed
- **BREAKING:** Rename `getUser` to `fetchUser` for consistency (#238)
- Improve error messages for validation failures (#239)
```

### Bad Examples

```markdown
### Added
- dark mode  # Too vague, no verb, no reference
- Fixed stuff  # Wrong section
- WIP  # Not ready for release

### Fixed
- Bug fix  # Not descriptive
- Issue #123  # Missing description
```

## Breaking Changes

Always highlight breaking changes:

```markdown
## [2.0.0] - 2024-01-15

### Changed
- **BREAKING:** API endpoints now require authentication
- **BREAKING:** Minimum Node.js version is now 18

### Migration Guide
See [MIGRATION.md](./docs/MIGRATION.md) for upgrade instructions.
```

## Template

Use this template for new releases:

```markdown
## [VERSION] - YYYY-MM-DD

### Added
-

### Changed
-

### Fixed
-

### Security
-
```

## Automation

The `generate_changelog.py` script:
1. Parses conventional commits
2. Groups by type
3. Formats entries
4. Adds links to PRs/issues
5. Prepends to CHANGELOG.md
