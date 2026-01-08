# Exercise 1: Analyzing Large Codebases with Claude's 200K Context Window

## Learning Objectives

By the end of this exercise, you will be able to:

1. Understand the practical implications of Claude's 200K token context window
2. Load and analyze an entire codebase in a single conversation
3. Ask architectural questions that span multiple files
4. Identify patterns and anti-patterns across a codebase
5. Generate comprehensive documentation from existing code

## Prerequisites

- Claude Code CLI installed and authenticated
- Node.js 18+ and npm installed
- Git installed
- Basic TypeScript/JavaScript knowledge

## Background

Claude's 200K context window is equivalent to approximately 150,000 words or 500+ pages of text.
This allows you to load entire small-to-medium codebases into a single conversation, enabling:

- Full architectural analysis without context switching
- Cross-file refactoring suggestions
- Comprehensive code reviews
- Accurate dependency mapping

## Step-by-Step Instructions

### Step 1: Clone the Sample Repository

```bash
git clone https://github.com/expressjs/express.git sample-codebase
cd sample-codebase
```

### Step 2: Explore the Codebase Structure

Before loading into Claude, understand what you are working with:

```bash
# Count lines of code
find . -name "*.js" -type f | xargs wc -l | tail -1

# List main directories
ls -la lib/
```

### Step 3: Open Your Starter File

Open `exercise_1_starter.ts` in your editor. This file contains utility functions for
preparing codebase content for Claude's context window.

### Step 4: Implement the Context Loader

Complete the `loadCodebaseContext()` function in `exercise_1_starter.ts`:

1. Recursively read all `.js` and `.ts` files from a directory
2. Format each file with clear delimiters showing the file path
3. Calculate token count estimates (approximately 4 characters per token)
4. Return a structured object with the content and metadata

### Step 5: Test Your Implementation

```bash
npx ts-node exercise_1_starter.ts ../sample-codebase/lib
```

Expected output:

```
Files loaded: 23
Estimated tokens: 45,000
Context utilization: 22.5%
```

### Step 6: Use Claude Code CLI for Analysis

With your context loader working, use Claude Code to analyze the codebase:

```bash
claude "Analyze the Express.js middleware architecture.
What patterns does it use? Are there any potential improvements?"
```

### Step 7: Ask Cross-File Questions

Practice asking questions that require understanding multiple files:

```bash
claude "Trace the request lifecycle from app.listen() to res.send().
What middleware hooks are available at each stage?"
```

## Expected Outcomes

After completing this exercise, you should have:

1. A working `loadCodebaseContext()` function that prepares code for Claude
2. Experience asking architectural questions across multiple files
3. Understanding of how token limits affect what you can analyze
4. A mental model for when full-context analysis is appropriate

## Success Criteria

Your solution is complete when:

- [ ] All test files pass: `npm test exercise_1`
- [ ] Token estimation is within 10% of actual count
- [ ] You can load the Express.js lib folder without errors
- [ ] Claude provides coherent architectural analysis

## Bonus Challenges

### Challenge 1: Smart File Filtering

Modify your loader to intelligently filter files:

- Exclude test files unless explicitly requested
- Prioritize core modules over utilities
- Include package.json for dependency context

### Challenge 2: Incremental Loading

Implement a function that loads files incrementally based on relevance:

```typescript
async function loadRelevantContext(
  query: string,
  codebasePath: string,
  maxTokens: number
): Promise<ContextResult>;
```

### Challenge 3: Context Window Optimization

Create a compression strategy that:

- Removes comments (configurable)
- Minifies whitespace
- Summarizes large files instead of including full content

## Common Pitfalls

1. **Loading too much**: Not all code needs full context. Focus on relevant modules.
2. **Ignoring token limits**: Always estimate before loading to avoid truncation.
3. **Missing dependencies**: Include package.json and tsconfig.json for full context.
4. **Forgetting file paths**: Always include clear file path headers.

## Next Steps

Once you have completed this exercise, proceed to Exercise 2: Building a Streaming Response Handler.
