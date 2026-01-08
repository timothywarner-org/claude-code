/**
 * Exercise 2: Streaming Response Handler - SOLUTION
 *
 * Complete implementation of a robust streaming response handler.
 */

import { EventEmitter } from 'events';

// Types for SSE events from Claude's API
interface MessageStartEvent {
  type: 'message_start';
  message: {
    id: string;
    type: 'message';
    role: 'assistant';
    model: string;
    usage: { input_tokens: number; output_tokens: number };
  };
}

interface ContentBlockStartEvent {
  type: 'content_block_start';
  index: number;
  content_block: { type: 'text'; text: string };
}

interface ContentBlockDeltaEvent {
  type: 'content_block_delta';
  index: number;
  delta: { type: 'text_delta'; text: string };
}

interface ContentBlockStopEvent {
  type: 'content_block_stop';
  index: number;
}

interface MessageDeltaEvent {
  type: 'message_delta';
  delta: { stop_reason: string };
  usage: { output_tokens: number };
}

interface MessageStopEvent {
  type: 'message_stop';
}

interface ErrorEvent {
  type: 'error';
  error: { type: string; message: string };
}

type SSEEvent =
  | MessageStartEvent
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent
  | MessageDeltaEvent
  | MessageStopEvent
  | ErrorEvent;

interface StreamingOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
  retryAttempts?: number;
  retryDelayMs?: number;
}

interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  startTime: number;
  endTime: number;
  totalDurationMs: number;
}

/**
 * Parses a single SSE event from raw text.
 */
function parseSSEEvent(eventText: string): SSEEvent | null {
  const lines = eventText.trim().split('\n');

  let eventType: string | null = null;
  let dataLines: string[] = [];

  for (const line of lines) {
    // Skip comments
    if (line.startsWith(':')) {
      continue;
    }

    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  // If no data, return null
  if (dataLines.length === 0) {
    return null;
  }

  // Concatenate multiple data lines (per SSE spec)
  const jsonData = dataLines.join('\n');

  try {
    const parsed = JSON.parse(jsonData);
    return parsed as SSEEvent;
  } catch {
    console.warn('Failed to parse SSE event data:', jsonData);
    return null;
  }
}

/**
 * Async generator that consumes a ReadableStream and yields SSE events.
 */
async function* consumeStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<SSEEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          const event = parseSSEEvent(buffer);
          if (event) {
            yield event;
          }
        }
        break;
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Split on double newlines to get complete events
      const events = buffer.split('\n\n');

      // Keep the last part as it might be incomplete
      buffer = events.pop() || '';

      // Process complete events
      for (const eventText of events) {
        if (!eventText.trim()) {
          continue;
        }

        const event = parseSSEEvent(eventText);
        if (event) {
          yield event;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Delays execution for the specified milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main streaming handler class.
 */
export class StreamingResponseHandler extends EventEmitter {
  private options: Required<
    Pick<StreamingOptions, 'apiKey' | 'model' | 'maxTokens' | 'retryAttempts' | 'retryDelayMs'> &
      Pick<StreamingOptions, 'signal'>
  >;
  private abortController: AbortController;
  private fullText: string = '';
  private usage: Partial<UsageStats> = {};
  private isCancelled: boolean = false;

  constructor(options: StreamingOptions) {
    super();

    this.options = {
      apiKey: options.apiKey,
      model: options.model || 'claude-sonnet-4-20250514',
      maxTokens: options.maxTokens || 4096,
      retryAttempts: options.retryAttempts || 3,
      retryDelayMs: options.retryDelayMs || 1000,
      signal: options.signal,
    };

    this.abortController = new AbortController();

    // Wire up convenience callbacks
    if (options.onToken) {
      this.on('token', options.onToken);
    }
    if (options.onComplete) {
      this.on('complete', options.onComplete);
    }
    if (options.onError) {
      this.on('error', options.onError);
    }

    // Link external abort signal if provided
    if (options.signal) {
      options.signal.addEventListener('abort', () => this.cancel());
    }
  }

  /**
   * Makes the API request with retry logic.
   */
  private async makeRequest(prompt: string, attempt: number = 1): Promise<Response> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.options.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.options.model,
        max_tokens: this.options.maxTokens,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: this.abortController.signal,
    });

    // Handle rate limiting with retry
    if (response.status === 429) {
      if (attempt < this.options.retryAttempts) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '1', 10);
        const waitTime = Math.max(retryAfter * 1000, this.options.retryDelayMs * attempt);

        this.emit('retry', { attempt, waitTime, reason: 'rate_limit' });
        await delay(waitTime);

        return this.makeRequest(prompt, attempt + 1);
      }
      throw new Error('Rate limit exceeded after maximum retries');
    }

    // Handle server errors with retry
    if (response.status >= 500) {
      if (attempt < this.options.retryAttempts) {
        const waitTime = this.options.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff

        this.emit('retry', { attempt, waitTime, reason: 'server_error' });
        await delay(waitTime);

        return this.makeRequest(prompt, attempt + 1);
      }
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    // Handle client errors (no retry)
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }

    return response;
  }

  /**
   * Sends a prompt and streams the response.
   */
  async stream(prompt: string): Promise<string> {
    this.fullText = '';
    this.usage = { startTime: Date.now() };
    this.isCancelled = false;

    try {
      const response = await this.makeRequest(prompt);

      if (!response.body) {
        throw new Error('Response body is empty');
      }

      // Process the stream
      for await (const event of consumeStream(response.body)) {
        // Check for cancellation
        if (this.isCancelled) {
          break;
        }

        switch (event.type) {
          case 'message_start':
            this.usage.inputTokens = event.message.usage.input_tokens;
            this.emit('message_start', event.message);
            break;

          case 'content_block_start':
            // Initial text in content block (usually empty)
            if (event.content_block.text) {
              this.fullText += event.content_block.text;
              this.emit('token', event.content_block.text);
            }
            break;

          case 'content_block_delta':
            if (event.delta.type === 'text_delta') {
              const text = event.delta.text;
              this.fullText += text;
              this.emit('token', text);
            }
            break;

          case 'content_block_stop':
            this.emit('content_block_stop', event.index);
            break;

          case 'message_delta':
            this.usage.outputTokens = event.usage.output_tokens;
            this.emit('message_delta', {
              stopReason: event.delta.stop_reason,
              outputTokens: event.usage.output_tokens,
            });
            break;

          case 'message_stop':
            this.usage.endTime = Date.now();
            this.emit('complete', this.fullText);
            break;

          case 'error':
            throw new Error(`Stream error: ${event.error.type} - ${event.error.message}`);
        }
      }

      return this.fullText;
    } catch (error) {
      // Handle abort separately
      if (error instanceof Error && error.name === 'AbortError') {
        this.emit('cancelled');
        return this.fullText;
      }

      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Cancels an in-progress stream.
   */
  cancel(): void {
    this.isCancelled = true;
    this.abortController.abort();
    this.usage.endTime = Date.now();
  }

  /**
   * Returns usage statistics after streaming completes.
   */
  getUsage(): UsageStats | null {
    if (!this.usage.startTime) {
      return null;
    }

    const endTime = this.usage.endTime || Date.now();

    return {
      inputTokens: this.usage.inputTokens || 0,
      outputTokens: this.usage.outputTokens || 0,
      startTime: this.usage.startTime,
      endTime: endTime,
      totalDurationMs: endTime - this.usage.startTime,
    };
  }

  /**
   * Returns the accumulated text so far.
   */
  getText(): string {
    return this.fullText;
  }
}

/**
 * Helper: Creates a simple streaming request.
 */
export async function streamResponse(
  prompt: string,
  options: Omit<StreamingOptions, 'onToken' | 'onComplete' | 'onError'>
): Promise<string> {
  const handler = new StreamingResponseHandler(options);
  return handler.stream(prompt);
}

/**
 * Bonus: Typewriter animation effect.
 */
export async function streamWithTypewriter(
  prompt: string,
  options: StreamingOptions & {
    minDelay?: number;
    maxDelay?: number;
    punctuationPause?: number;
  }
): Promise<string> {
  const {
    minDelay = 10,
    maxDelay = 50,
    punctuationPause = 100,
    ...streamOptions
  } = options;

  const punctuation = new Set(['.', '!', '?', ',', ';', ':']);
  let lastTokenTime = Date.now();

  return new Promise((resolve, reject) => {
    const handler = new StreamingResponseHandler({
      ...streamOptions,
      onToken: async (token) => {
        // Calculate delay based on token content
        let tokenDelay = Math.random() * (maxDelay - minDelay) + minDelay;

        // Add extra pause after punctuation
        if (punctuation.has(token.trim().slice(-1))) {
          tokenDelay += punctuationPause;
        }

        // Wait for the calculated delay
        const elapsed = Date.now() - lastTokenTime;
        if (elapsed < tokenDelay) {
          await delay(tokenDelay - elapsed);
        }

        // Output the token
        process.stdout.write(token);
        lastTokenTime = Date.now();
      },
      onComplete: (text) => resolve(text),
      onError: reject,
    });

    handler.stream(prompt);
  });
}

/**
 * Bonus: Stream multiple prompts in parallel.
 */
export async function streamMultiple(
  prompts: string[],
  options: Omit<StreamingOptions, 'onToken' | 'onComplete' | 'onError'> & {
    onChunk: (index: number, text: string) => void;
    onStreamComplete?: (index: number, fullText: string) => void;
  }
): Promise<string[]> {
  const { onChunk, onStreamComplete, ...baseOptions } = options;

  const promises = prompts.map((prompt, index) => {
    return new Promise<string>((resolve, reject) => {
      const handler = new StreamingResponseHandler({
        ...baseOptions,
        onToken: (token) => onChunk(index, token),
        onComplete: (text) => {
          if (onStreamComplete) {
            onStreamComplete(index, text);
          }
          resolve(text);
        },
        onError: reject,
      });

      handler.stream(prompt);
    });
  });

  return Promise.all(promises);
}

// CLI entry point for testing
async function main(): Promise<void> {
  const prompt = process.argv.slice(2).join(' ');

  if (!prompt) {
    console.error('Usage: npx ts-node exercise_2_solution.ts "<prompt>"');
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set');
    process.exit(1);
  }

  console.log('Streaming response...\n');

  const handler = new StreamingResponseHandler({
    apiKey,
    onToken: (token) => process.stdout.write(token),
    onComplete: () => {
      console.log('\n\n--- Stream Complete ---');
      const usage = handler.getUsage();
      if (usage) {
        console.log(`Input tokens: ${usage.inputTokens}`);
        console.log(`Output tokens: ${usage.outputTokens}`);
        console.log(`Duration: ${usage.totalDurationMs}ms`);
        console.log(`Tokens/second: ${((usage.outputTokens / usage.totalDurationMs) * 1000).toFixed(1)}`);
      }
    },
    onError: (error) => {
      console.error('\nError:', error.message);
    },
  });

  // Handle retries
  handler.on('retry', ({ attempt, waitTime, reason }) => {
    console.log(`\nRetry ${attempt}: ${reason}, waiting ${waitTime}ms...`);
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\nCancelling stream...');
    handler.cancel();
    process.exit(0);
  });

  try {
    await handler.stream(prompt);
  } catch (error) {
    console.error('Failed to stream:', error);
    process.exit(1);
  }
}

main();
