# Security Checklist

Reference guide for security review. Claude loads this when performing security analysis.

## Critical Vulnerabilities (OWASP Top 10)

### A01: Broken Access Control

- [ ] Verify authorization checks on all endpoints
- [ ] Check for IDOR (Insecure Direct Object References)
- [ ] Ensure proper role-based access control
- [ ] Validate JWT tokens properly

**Pattern to detect:**
```typescript
// BAD: No authorization check
app.get('/user/:id', (req, res) => {
  return db.users.findById(req.params.id);
});

// GOOD: Verify ownership
app.get('/user/:id', authorize, (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).send('Forbidden');
  }
  return db.users.findById(req.params.id);
});
```

### A02: Cryptographic Failures

- [ ] No hardcoded secrets or API keys
- [ ] Passwords hashed with bcrypt/argon2 (not MD5/SHA1)
- [ ] Sensitive data encrypted at rest
- [ ] TLS for all external communications

**Pattern to detect:**
```typescript
// BAD: Hardcoded secret
const API_KEY = 'sk-1234567890abcdef';

// GOOD: Environment variable
const API_KEY = process.env.API_KEY;
```

### A03: Injection

- [ ] Parameterized queries for SQL
- [ ] Input sanitization for NoSQL
- [ ] Command injection prevention
- [ ] XSS prevention in output

**Pattern to detect:**
```typescript
// BAD: SQL injection vulnerable
const query = `SELECT * FROM users WHERE email = '${email}'`;

// GOOD: Parameterized query
const query = 'SELECT * FROM users WHERE email = $1';
await db.query(query, [email]);
```

### A04: Insecure Design

- [ ] Rate limiting on auth endpoints
- [ ] Account lockout after failed attempts
- [ ] Secure password reset flow
- [ ] Multi-factor authentication support

### A05: Security Misconfiguration

- [ ] No debug mode in production
- [ ] Secure headers (CORS, CSP, etc.)
- [ ] Error messages don't leak info
- [ ] Default credentials changed

### A06: Vulnerable Components

- [ ] Dependencies up to date
- [ ] No known CVEs in packages
- [ ] Minimal dependency footprint

**Check command:**
```bash
npm audit
```

### A07: Authentication Failures

- [ ] Strong password requirements
- [ ] Session timeout configured
- [ ] Secure session storage
- [ ] Logout invalidates session

### A08: Data Integrity Failures

- [ ] Validate all deserialized data
- [ ] Verify software updates
- [ ] CI/CD pipeline secured

### A09: Logging Failures

- [ ] Security events logged
- [ ] No sensitive data in logs
- [ ] Log injection prevented

**Pattern to detect:**
```typescript
// BAD: Logging sensitive data
console.log('User login:', { email, password });

// GOOD: Redact sensitive fields
console.log('User login:', { email, password: '[REDACTED]' });
```

### A10: Server-Side Request Forgery

- [ ] Validate/whitelist URLs
- [ ] Block internal network requests
- [ ] Disable redirects for user URLs

## Quick Scan Patterns

Use these regex patterns for quick detection:

```javascript
// Hardcoded secrets
/(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]+['"]/gi

// SQL injection
/query\s*\(\s*`[^`]*\$\{/g

// Eval usage
/eval\s*\(/g

// innerHTML (XSS risk)
/\.innerHTML\s*=/g
```
