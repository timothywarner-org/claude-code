# Exercise 2: Using Claude Code for PR Review Workflows

## Learning Objectives

By the end of this exercise, you will be able to:

1. Use Claude Code CLI to review pull requests systematically
2. Identify security vulnerabilities in code changes
3. Assess code quality and suggest improvements
4. Write constructive review comments
5. Integrate Claude Code into your team's review workflow

## Prerequisites

- Claude Code CLI installed and authenticated
- Git and GitHub CLI (`gh`) installed
- Access to a GitHub repository
- Understanding of common security vulnerabilities
- Familiarity with code review best practices

## Background

Code reviews are essential for:

- **Quality assurance**: Catching bugs before they reach production
- **Knowledge sharing**: Spreading understanding across the team
- **Security**: Identifying vulnerabilities early
- **Consistency**: Maintaining coding standards

Claude Code can augment human reviewers by:

- Quickly scanning for common patterns and anti-patterns
- Identifying security issues systematically
- Suggesting alternative implementations
- Explaining complex code changes

## The Review Workflow

This exercise simulates reviewing a pull request that adds authentication to an API.
You will use Claude Code to analyze the changes from multiple perspectives.

## Step-by-Step Instructions

### Step 1: Set Up the Exercise

Open `exercise_2_starter.ts` and examine the authentication code that needs review.
This represents a typical PR adding JWT-based authentication.

### Step 2: Security Review

Use Claude Code to perform a security-focused review:

```bash
claude "Perform a security review of this authentication implementation.
Focus on:
1. JWT handling and validation
2. Password storage and comparison
3. Session management
4. Input validation
5. Error message information leakage

$(cat exercise_2_starter.ts)"
```

Document all security concerns Claude identifies.

### Step 3: Code Quality Review

Assess the code quality:

```bash
claude "Review this code for quality issues:
1. Error handling completeness
2. Type safety
3. Code organization
4. Naming conventions
5. Documentation

Suggest specific improvements for each issue found.

$(cat exercise_2_starter.ts)"
```

### Step 4: Performance Review

Check for performance concerns:

```bash
claude "Analyze this authentication code for performance issues:
1. Database query efficiency
2. Cryptographic operation costs
3. Memory usage
4. Potential bottlenecks under load

$(cat exercise_2_starter.ts)"
```

### Step 5: Test Coverage Analysis

Identify testing gaps:

```bash
claude "What test cases should exist for this authentication code?
List:
1. Happy path tests
2. Error condition tests
3. Security-focused tests
4. Edge cases

$(cat exercise_2_starter.ts)"
```

### Step 6: Write Review Comments

Based on your analysis, use Claude Code to help write review comments:

```bash
claude "Write constructive PR review comments for these issues:
1. [Issue 1 from your security review]
2. [Issue 2 from your quality review]
3. [Issue 3 from your performance review]

Format each comment with:
- Location in code
- The issue
- Why it matters
- Suggested fix"
```

### Step 7: Implement Improvements

Open `exercise_2_solution.ts` to see the improved version, then compare:

```bash
claude "Compare these two implementations and explain the improvements:

ORIGINAL:
$(cat exercise_2_starter.ts)

IMPROVED:
$(cat exercise_2_solution.ts)"
```

### Step 8: Create a Review Checklist

Build a reusable checklist for authentication PRs:

```bash
claude "Based on this review, create a checklist for reviewing
authentication-related pull requests. Include:
1. Security checks
2. Quality checks
3. Performance checks
4. Testing requirements"
```

## Expected Outcomes

After completing this exercise, you should have:

1. A comprehensive security analysis of the authentication code
2. A list of code quality improvements with suggested fixes
3. Performance recommendations
4. A test plan for authentication functionality
5. Sample PR review comments ready to post
6. A reusable authentication review checklist

## Success Criteria

Your review is complete when you have identified:

- [ ] At least 3 security vulnerabilities
- [ ] At least 3 code quality issues
- [ ] At least 2 performance concerns
- [ ] At least 5 test cases that should be added
- [ ] Written constructive comments for top issues

## Review Comment Guidelines

Good review comments:

- **Start with the positive**: Acknowledge what is done well
- **Be specific**: Point to exact lines and issues
- **Explain why**: Help the author understand the impact
- **Suggest solutions**: Do not just criticize, help fix
- **Be kind**: Remember there is a person on the other end

Example of a good comment:

```
## Security: Password Comparison (line 45)

The current string comparison for passwords may be vulnerable to timing
attacks. An attacker could potentially determine the correct password
length by measuring response times.

**Suggestion:** Use a constant-time comparison function:

\`\`\`typescript
import { timingSafeEqual } from 'crypto';

function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
\`\`\`
```

## Bonus Challenges

### Challenge 1: Automated Review Pipeline

Create a script that automatically runs Claude Code review checks:

```typescript
async function automatedReview(prDiff: string): Promise<ReviewResult> {
  // Implement security, quality, and performance checks
  // Aggregate findings into a structured result
}
```

### Challenge 2: GitHub Integration

Use the GitHub CLI to fetch and review actual PRs:

```bash
# Fetch PR diff
gh pr diff 123 > pr_diff.txt

# Review with Claude
claude "Review this pull request diff: $(cat pr_diff.txt)"

# Post comment
gh pr comment 123 --body "$(cat review_comment.md)"
```

### Challenge 3: Custom Review Rules

Create project-specific review rules:

```bash
claude "Given these project rules:
1. All API endpoints must have rate limiting
2. Database queries must use parameterized statements
3. Sensitive data must be encrypted at rest

Review this code for compliance: $(cat exercise_2_starter.ts)"
```

### Challenge 4: Review Metrics

Track review effectiveness over time:

- Issues found by Claude vs. human reviewers
- Time saved per review
- Categories of issues caught

## Common Review Pitfalls

1. **Nitpicking**: Focus on important issues, not style preferences
2. **Missing the forest for trees**: Consider the overall design, not just details
3. **Assuming context**: Ask questions if something is unclear
4. **Being too harsh**: Code review is about improvement, not criticism
5. **Skipping tests**: Always review test coverage with the code

## Claude Code Review Commands

Useful patterns for code review:

```bash
# Quick security scan
claude "List all potential security vulnerabilities in: $(cat file.ts)"

# Check for common mistakes
claude "What mistakes are commonly made in code like this? $(cat file.ts)"

# Suggest tests
claude "What tests should exist for: $(cat file.ts)"

# Check error handling
claude "Is error handling complete in: $(cat file.ts)"

# Review for accessibility (for frontend)
claude "Review this component for accessibility: $(cat Component.tsx)"

# Check for breaking changes
claude "Could any of these changes break existing functionality? $(git diff)"
```

## Integration with CI/CD

Example GitHub Action for automated review:

```yaml
name: Claude Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Get changed files
        run: git diff origin/main...HEAD > diff.txt
      - name: Run Claude review
        run: |
          claude "Review this diff for security and quality issues:
          $(cat diff.txt)" > review.md
      - name: Post review
        run: gh pr comment ${{ github.event.pull_request.number }} -F review.md
```

## Next Steps

After completing this exercise, you will have the skills to integrate Claude Code
into your team's review workflow. Continue to Segment 3 for MCP server implementation.
