# Exercise 2: Building a Streaming Response Handler

## Learning Objectives

By the end of this exercise, you will be able to:

1. Understand how streaming responses work with the Claude API
2. Implement a robust streaming handler with proper error handling
3. Build real-time UI updates as tokens arrive
4. Handle connection interruptions gracefully
5. Implement rate limiting and backpressure

## Prerequisites

- Completed Exercise 1 (Context Window Loader)
- Anthropic API key configured
- Understanding of async iterators in TypeScript/JavaScript
- Basic knowledge of Node.js streams

## Background

Streaming responses are essential for:

- **User experience**: Users see output immediately instead of waiting
- **Long responses**: Large outputs (like code generation) can start displaying before completion
- **Interruptibility**: Users can cancel requests mid-stream
- **Memory efficiency**: Process tokens as they arrive instead of buffering

The Claude API uses Server-Sent Events (SSE) for streaming, which you will learn to handle.

## Step-by-Step Instructions

### Step 1: Understand the Streaming Protocol

Claude's streaming responses follow this pattern:

```
event: message_start
data: {"type": "message_start", "message": {...}}

event: content_block_start
data: {"type": "content_block_start", "index": 0, "content_block": {...}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Hello"}}

event: content_block_stop
data: {"type": "content_block_stop", "index": 0}

event: message_stop
data: {"type": "message_stop"}
```

### Step 2: Open the Starter File

Open `exercise_2_starter.ts` and examine the provided types and structure.

### Step 3: Implement the Event Parser

Complete the `parseSSEEvent()` function:

1. Parse the event type from the `event:` line
2. Parse the JSON data from the `data:` line
3. Return a typed event object
4. Handle malformed events gracefully

### Step 4: Implement the Stream Consumer

Complete the `consumeStream()` async generator:

1. Read chunks from the response stream
2. Buffer partial events
3. Parse complete events
4. Yield text deltas as they arrive

### Step 5: Build the Response Handler

Complete the `StreamingResponseHandler` class:

1. Initialize a connection to the API
2. Handle the response stream
3. Emit events for UI updates
4. Track usage statistics
5. Implement cancellation

### Step 6: Test Your Implementation

```bash
# Run the interactive test
npx ts-node exercise_2_starter.ts "Write a short poem about TypeScript"

# Test with a longer response
npx ts-node exercise_2_starter.ts "Explain the complete history of JavaScript in detail"

# Test cancellation (press Ctrl+C during streaming)
npx ts-node exercise_2_starter.ts "Write a 1000 word essay"
```

### Step 7: Implement Error Recovery

Add retry logic for:

- Network timeouts
- Rate limiting (429 responses)
- Server errors (500+)

## Expected Outcomes

After completing this exercise, you should have:

1. A working `StreamingResponseHandler` class
2. Real-time console output as tokens arrive
3. Proper error handling for network issues
4. Cancellation support via AbortController
5. Usage tracking (tokens consumed, time elapsed)

## Success Criteria

Your solution is complete when:

- [ ] Streaming output appears character-by-character
- [ ] Ctrl+C cleanly cancels the stream
- [ ] Network errors trigger automatic retry
- [ ] Final usage stats are accurate
- [ ] Memory usage stays constant regardless of response length

## API Reference

```typescript
// Making a streaming request
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    stream: true,
    messages: [{ role: 'user', content: prompt }],
  }),
});
```

## Bonus Challenges

### Challenge 1: Token-by-Token Animation

Implement a typewriter effect that renders tokens with realistic timing:

```typescript
interface AnimationOptions {
  minDelay: number; // Minimum ms between tokens
  maxDelay: number; // Maximum ms between tokens
  punctuationPause: number; // Extra pause after punctuation
}
```

### Challenge 2: Progress Estimation

Add estimated completion progress:

```typescript
interface ProgressInfo {
  tokensReceived: number;
  estimatedTotal: number; // Based on typical response patterns
  percentComplete: number;
  estimatedTimeRemaining: number;
}
```

### Challenge 3: Parallel Streaming

Implement a multi-stream handler that processes multiple requests simultaneously:

```typescript
async function streamMultiple(
  prompts: string[],
  onChunk: (index: number, text: string) => void
): Promise<string[]>;
```

### Challenge 4: Persistent Connections

Implement connection pooling for reduced latency on sequential requests.

## Common Pitfalls

1. **Buffer accumulation**: Make sure to process chunks incrementally to avoid memory issues.
2. **Incomplete events**: SSE events can be split across chunks; buffer properly.
3. **Missing cleanup**: Always close connections in finally blocks.
4. **Rate limit handling**: Implement exponential backoff for 429 responses.
5. **Cancellation propagation**: Ensure AbortController signals reach the fetch call.

## Deep Dive: SSE Event Format

Server-Sent Events have a specific format:

```
event: <event_type>\n
data: <json_data>\n
\n
```

Key parsing considerations:

- Events are separated by double newlines (`\n\n`)
- Multiple `data:` lines can be concatenated
- Comments start with `:` and should be ignored
- Keep-alive messages may be sent as comments

## Next Steps

Once you have completed this exercise, you are ready for Segment 2: Claude Code CLI workflows.
