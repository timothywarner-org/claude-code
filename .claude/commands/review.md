Review the changes in the current branch:

1. Run `git diff main...HEAD` to get all changes
2. Analyze each changed file for:
   - Security vulnerabilities (SQL injection, XSS, auth issues)
   - Performance issues (N+1 queries, unnecessary loops)
   - Missing error handling
   - Code style violations
3. Rate each issue by severity: critical, warning, or suggestion
4. Provide specific file and line references
5. Suggest fixes with code examples
