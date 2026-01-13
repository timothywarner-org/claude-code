# Release Template

Use this template when creating GitHub releases.

---

## Release Title
`v{{VERSION}} - {{TITLE}}`

## Release Body

```markdown
## What's Changed

{{CHANGELOG}}

## Highlights

- 🎯 **Key Feature 1**: Brief description
- 🐛 **Key Fix 1**: Brief description
- ⚡ **Performance**: Brief description

## Breaking Changes

{{BREAKING_CHANGES}}

## Migration Guide

If upgrading from v{{PREVIOUS_VERSION}}:

1. Step one
2. Step two
3. Step three

## Installation

```bash
npm install package@{{VERSION}}
```

## Full Changelog

{{COMPARE_LINK}}

---

**Thank you to all contributors!** 🙏
```

## Variable Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `{{VERSION}}` | New version number | `1.2.3` |
| `{{PREVIOUS_VERSION}}` | Previous version | `1.2.2` |
| `{{TITLE}}` | Release title/codename | `January Update` |
| `{{CHANGELOG}}` | Generated changelog | From `generate_changelog.py` |
| `{{BREAKING_CHANGES}}` | List of breaking changes | `- Changed X to Y` |
| `{{COMPARE_LINK}}` | GitHub compare URL | `https://github.com/org/repo/compare/v1.2.2...v1.2.3` |

## Release Checklist

Before publishing:

- [ ] Version number is correct
- [ ] Changelog is complete and accurate
- [ ] Breaking changes are documented
- [ ] Migration guide is included (if needed)
- [ ] All CI checks pass
- [ ] Documentation is updated
- [ ] Release notes reviewed by team
