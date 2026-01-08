# Troubleshooting Guide

Common issues and solutions for the Claude Code course.

## API Key Issues

### "ANTHROPIC_API_KEY not set"

**Cause:** The API key environment variable isn't configured.

**Solutions:**

1. **Check your .env file:**

   ```bash
   cat .env
   # Should show: ANTHROPIC_API_KEY=sk-ant-...
   ```

2. **Load the environment:**

   ```bash
   # macOS/Linux
   source .env
   # or
   export $(cat .env | xargs)

   # Windows (PowerShell)
   Get-Content .env | ForEach-Object {
     if ($_ -match '^([^=]+)=(.*)$') {
       [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
     }
   }
   ```

3. **Set directly in terminal:**

   ```bash
   export ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

### "Invalid API key"

**Cause:** The API key format is incorrect or the key has been revoked.

**Solutions:**

1. Verify key format starts with `sk-ant-`
2. Check key status at [console.anthropic.com](https://console.anthropic.com/)
3. Generate a new key if needed

### "Rate limit exceeded"

**Cause:** Too many API requests in a short time.

**Solutions:**

1. Wait a few minutes and retry
2. Implement exponential backoff (the SDK does this automatically)
3. Upgrade your API tier if needed

## TypeScript Issues

### "Cannot find module"

**Cause:** Dependencies not installed or import path issues.

**Solutions:**

1. **Reinstall dependencies:**

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check import extensions:**

   ```typescript
   // Wrong
   import { something } from './module';

   // Correct (ES modules require extensions)
   import { something } from './module.js';
   ```

### "ERR_MODULE_NOT_FOUND"

**Cause:** ES module resolution issues.

**Solutions:**

1. **Ensure package.json has type module:**

   ```json
   {
     "type": "module"
   }
   ```

2. **Check tsconfig.json module settings:**

   ```json
   {
     "compilerOptions": {
       "module": "NodeNext",
       "moduleResolution": "NodeNext"
     }
   }
   ```

### "Type errors in SDK"

**Cause:** TypeScript version mismatch or outdated types.

**Solutions:**

1. **Update TypeScript:**

   ```bash
   npm install typescript@latest
   ```

2. **Skip lib check:**

   ```json
   {
     "compilerOptions": {
       "skipLibCheck": true
     }
   }
   ```

## Claude Code CLI Issues

### "claude: command not found"

**Cause:** CLI not installed or not in PATH.

**Solutions:**

1. **Install globally:**

   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Check npm global path:**

   ```bash
   npm config get prefix
   # Add this to your PATH if needed
   ```

3. **Use npx instead:**

   ```bash
   npx @anthropic-ai/claude-code
   ```

### "Permission denied"

**Cause:** Insufficient permissions for global npm install.

**Solutions:**

1. **macOS/Linux - Fix npm permissions:**

   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

2. **Or use sudo (not recommended):**

   ```bash
   sudo npm install -g @anthropic-ai/claude-code
   ```

### "MCP server failed to start"

**Cause:** MCP server configuration or runtime issue.

**Solutions:**

1. **Test server manually:**

   ```bash
   cd mcp_servers/memory
   npm run dev
   # Should show "running on stdio"
   ```

2. **Check Claude Code MCP config:**

   ```bash
   claude mcp list
   ```

3. **Remove and re-add:**

   ```bash
   claude mcp remove memory
   claude mcp add memory -- npx tsx /path/to/server.ts
   ```

## Network Issues

### "ECONNREFUSED" or "ETIMEDOUT"

**Cause:** Network connectivity issues.

**Solutions:**

1. **Check internet connection**

2. **Test API endpoint:**

   ```bash
   curl https://api.anthropic.com/v1/messages -I
   ```

3. **Check proxy settings:**

   ```bash
   # If behind a proxy
   export HTTPS_PROXY=http://proxy:port
   ```

### "SSL certificate problem"

**Cause:** Corporate proxy or outdated certificates.

**Solutions:**

1. **Update Node.js to latest version**

2. **For corporate environments:**

   ```bash
   # Not recommended for production
   export NODE_TLS_REJECT_UNAUTHORIZED=0
   ```

## Git Hook Issues

### "Hook failed to execute"

**Cause:** Hook script permissions or path issues.

**Solutions:**

1. **Make hooks executable:**

   ```bash
   chmod +x .git/hooks/*
   ```

2. **Check hook script:**

   ```bash
   cat .git/hooks/pre-commit
   ```

### "pre-commit hook is slow"

**Cause:** Running full review on every commit.

**Solutions:**

1. **Only review changed files:**

   ```bash
   git diff --cached --name-only | head -10
   ```

2. **Skip hooks when needed:**

   ```bash
   git commit --no-verify -m "Quick fix"
   ```

## Memory/Performance Issues

### "JavaScript heap out of memory"

**Cause:** Processing too large a file or codebase.

**Solutions:**

1. **Increase Node.js memory:**

   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

2. **Process files in chunks**

3. **Use streaming for large responses**

### "Slow API responses"

**Cause:** Large context or model processing time.

**Solutions:**

1. **Reduce context size:**
   - Only include relevant files
   - Summarize instead of including full content

2. **Use streaming:**

   ```typescript
   const stream = client.messages.stream({...});
   ```

3. **Choose appropriate model:**
   - Use Sonnet for most tasks
   - Reserve Opus for complex reasoning

## Still Stuck?

1. **Check the error message carefully** - It often contains the solution
2. **Search the [Anthropic Documentation](https://docs.anthropic.com/)**
3. **Ask in the [Anthropic Discord](https://discord.gg/anthropic)**
4. **Check GitHub Issues** on the SDK repositories
5. **During live training** - Ask the instructor!

## Diagnostic Commands

Run these to gather information for troubleshooting:

```bash
# System info
node --version
npm --version
npx tsc --version

# Check environment
echo $ANTHROPIC_API_KEY | head -c 10

# Verify dependencies
npm ls @anthropic-ai/sdk
npm ls @modelcontextprotocol/sdk

# Test API connection
npx tsx -e "
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
const msg = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 10,
  messages: [{role: 'user', content: 'Hi'}]
});
console.log('API works:', msg.content[0].text);
"
```
