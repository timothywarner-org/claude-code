# Exercise 1: Set Up CI/CD with Claude Code

## Learning Objectives

By the end of this exercise, you will be able to:

1. Configure GitHub Actions workflows for Claude Code integration
2. Implement automated code review with Claude
3. Set up PR commenting and suggestions
4. Create secure secret management for API keys
5. Build conditional workflows based on file changes

## Prerequisites

- GitHub repository with admin access
- Anthropic API key
- Basic understanding of GitHub Actions syntax
- Familiarity with YAML configuration

## Background

Integrating Claude Code into CI/CD pipelines enables:

- Automated code review on every PR
- Documentation generation
- Test case suggestions
- Security vulnerability scanning
- Commit message validation

This exercise walks you through setting up a production-ready GitHub Actions workflow.

## Step-by-Step Instructions

### Step 1: Set Up Repository Secrets

Add your Anthropic API key to GitHub Secrets:

1. Go to your repository Settings
2. Navigate to Secrets and variables > Actions
3. Click "New repository secret"
4. Name: `ANTHROPIC_API_KEY`
5. Value: Your API key (sk-ant-...)

### Step 2: Create Basic Workflow Structure

Create `.github/workflows/claude-review.yml`:

```yaml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
```

### Step 3: Install Claude Code CLI

Add the installation step:

```yaml
- name: Install Claude Code
  run: |
    npm install -g @anthropic-ai/claude-code
    claude --version

- name: Configure Claude
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    echo "API key configured"
```

### Step 4: Get Changed Files

Identify files modified in the PR:

```yaml
- name: Get changed files
  id: changed-files
  uses: tj-actions/changed-files@v44
  with:
    files: |
      **/*.ts
      **/*.js
      **/*.py
      **/*.go

- name: List changes
  run: |
    echo "Changed files:"
    echo "${{ steps.changed-files.outputs.all_changed_files }}"
```

### Step 5: Run Claude Review

Execute Claude Code for review:

```yaml
- name: Run Claude Code Review
  id: claude-review
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    # Create review prompt
    CHANGED_FILES="${{ steps.changed-files.outputs.all_changed_files }}"

    if [ -z "$CHANGED_FILES" ]; then
      echo "No code files changed"
      echo "review=No code files to review" >> $GITHUB_OUTPUT
      exit 0
    fi

    # Run Claude review
    REVIEW=$(claude -p "Review these code changes for:
    1. Potential bugs or errors
    2. Security vulnerabilities
    3. Performance issues
    4. Code style improvements

    Files: $CHANGED_FILES

    Provide specific, actionable feedback." --print)

    # Save review to output
    echo "review<<EOF" >> $GITHUB_OUTPUT
    echo "$REVIEW" >> $GITHUB_OUTPUT
    echo "EOF" >> $GITHUB_OUTPUT
```

### Step 6: Post Review Comment

Add the review as a PR comment:

```yaml
- name: Post Review Comment
  uses: actions/github-script@v7
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    script: |
      const review = `${{ steps.claude-review.outputs.review }}`;

      if (review && review !== 'No code files to review') {
        await github.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: context.issue.number,
          body: `## Claude Code Review\n\n${review}\n\n---\n*Automated review by Claude Code*`
        });
      }
```

### Step 7: Add Conditional Checks

Implement checks based on review severity:

```yaml
- name: Check for blocking issues
  id: check-blocking
  run: |
    REVIEW="${{ steps.claude-review.outputs.review }}"

    # Check for critical issues
    if echo "$REVIEW" | grep -qi "security vulnerability\|critical bug\|data leak"; then
      echo "blocking=true" >> $GITHUB_OUTPUT
      echo "::error::Critical issues found in code review"
    else
      echo "blocking=false" >> $GITHUB_OUTPUT
    fi

- name: Fail on blocking issues
  if: steps.check-blocking.outputs.blocking == 'true'
  run: exit 1
```

### Step 8: Add Review Caching

Implement caching to reduce API costs:

```yaml
- name: Cache review results
  uses: actions/cache@v4
  with:
    path: .claude-cache
    key: claude-review-${{ hashFiles('**/*.ts', '**/*.js') }}
    restore-keys: |
      claude-review-
```

### Step 9: Test Your Workflow

1. Create a new branch
2. Make code changes
3. Open a PR
4. Verify the workflow runs
5. Check the PR comment

## Expected Outcomes

After completing this exercise:

1. PR opens trigger Claude review
2. Review comments appear on PRs
3. Critical issues block merging
4. API costs are optimized via caching
5. Secrets are properly protected

## Verification Checklist

- [ ] Workflow triggers on PR events
- [ ] Claude CLI installs successfully
- [ ] Changed files are detected correctly
- [ ] Review content is meaningful
- [ ] Comments post to PR
- [ ] Blocking issues fail the workflow
- [ ] No API key exposure in logs

## Bonus Challenges

### Challenge 1: Targeted Reviews

Create different review modes based on file types:

- Security review for auth files
- Performance review for database queries
- Accessibility review for frontend components

### Challenge 2: Incremental Reviews

Only review new commits, not entire PR:

```yaml
- name: Get new commits
  run: |
    git log --oneline ${{ github.event.before }}..${{ github.sha }}
```

### Challenge 3: Review Metrics

Track review statistics:

- Issues found per PR
- Time to review
- False positive rate
- Developer feedback

### Challenge 4: Auto-Fix Suggestions

Generate fix commits for simple issues:

```yaml
- name: Generate fixes
  run: |
    claude -p "Generate git patch for fixing: $ISSUE" > fix.patch
    git apply fix.patch
    git commit -m "fix: Apply Claude suggestion"
```

## Security Considerations

### Secret Protection

- Never echo secrets in logs
- Use environment masking
- Rotate keys regularly

### Input Validation

- Sanitize PR content before passing to Claude
- Limit review scope to prevent abuse
- Rate limit workflow runs

### Audit Trail

- Log all Claude interactions
- Track API usage per repository
- Monitor for unusual patterns

## Cost Optimization

### Token Management

1. Limit context to changed files only
2. Summarize large diffs
3. Use caching aggressively
4. Set max token limits

### Workflow Efficiency

1. Skip review for documentation-only changes
2. Batch multiple small PRs
3. Use path filters to limit triggers

## Common Issues and Solutions

### Issue: Workflow fails with "API key not found"

Verify secret configuration:

1. Check secret name matches exactly
2. Ensure secret is set at repository level
3. Verify workflow has secrets permission

### Issue: Review comment is truncated

GitHub comments have a 65536 character limit:

```yaml
- name: Truncate review if needed
  run: |
    REVIEW="${{ steps.claude-review.outputs.review }}"
    if [ ${#REVIEW} -gt 60000 ]; then
      REVIEW="${REVIEW:0:60000}... (truncated)"
    fi
```

### Issue: Workflow times out

Claude responses can be slow for large reviews:

```yaml
- name: Run Claude Review
  timeout-minutes: 10
  run: |
    # ... review command
```

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Claude Code CLI Reference](https://docs.anthropic.com/claude-code/cli)
- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides)
