/**
 * Exercise 2: Streaming Response Handler
 *
 * Your task: Implement a robust streaming response handler for Claude's API
 * that provides real-time output and proper error handling.
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
 *
 * TODO: Implement this function
 *
 * @param eventText - Raw text of the SSE event (event: ... \n data: ...)
 * @returns Parsed event object or null if invalid
 */
function parseSSEEvent(eventText: string): SSEEvent | null {
  // YOUR CODE HERE
  // 1. Extract the event type from the "event:" line
  // 2. Extract the JSON data from the "data:" line
  // 3. Parse the JSON and return the typed event
  // 4. Return null for invalid or comment events

  throw new Error('Not implemented');
}

/**
 * Async generator that consumes a ReadableStream and yields SSE events.
 *
 * TODO: Implement this function
 *
 * @param stream - The response body stream
 * @yields Parsed SSE events
 */
async function* consumeStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<SSEEvent> {
  // YOUR CODE HERE
  // 1. Create a reader from the stream
  // 2. Read chunks and decode them
  // 3. Buffer partial events (events can span chunks)
  // 4. Split on double newlines to get complete events
  // 5. Parse each event and yield it

  throw new Error('Not implemented');
}

/**
 * Main streaming handler class.
 *
 * TODO: Complete this class implementation
 */
export class StreamingResponseHandler extends EventEmitter {
  private options: Required<
    Pick<StreamingOptions, 'apiKey' | 'model' | 'maxTokens'> &
      Pick<StreamingOptions, 'signal'>
  >;
  private abortController: AbortController;
  private fullText: string = '';
  private usage: Partial<UsageStats> = {};

  constructor(options: StreamingOptions) {
    super();

    this.options = {
      apiKey: options.apiKey,
      model: options.model || 'claude-sonnet-4-20250514',
      maxTokens: options.maxTokens || 4096,
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
  }

  /**
   * Sends a prompt and streams the response.
   *
   * TODO: Implement this method
   */
  async stream(prompt: string): Promise<string> {
    // YOUR CODE HERE
    // 1. Record start time
    // 2. Make the fetch request with streaming enabled
    // 3. Check for non-200 responses and handle errors
    // 4. Consume the stream using consumeStream()
    // 5. Process each event type appropriately:
    //    - message_start: Extract input token count
    //    - content_block_delta: Emit token, accumulate text
    //    - message_delta: Extract final output token count
    //    - message_stop: Record end time, emit complete
    //    - error: Throw appropriate error
    // 6. Return the full accumulated text

    throw new Error('Not implemented');
  }

  /**
   * Cancels an in-progress stream.
   */
  cancel(): void {
    this.abortController.abort();
    this.emit('cancelled');
  }

  /**
   * Returns usage statistics after streaming completes.
   */
  getUsage(): UsageStats | null {
    if (!this.usage.startTime || !this.usage.endTime) {
      return null;
    }

    return {
      inputTokens: this.usage.inputTokens || 0,
      outputTokens: this.usage.outputTokens || 0,
      startTime: this.usage.startTime,
      endTime: this.usage.endTime,
      totalDurationMs: this.usage.endTime - this.usage.startTime,
    };
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

// CLI entry point for testing
async function main(): Promise<void> {
  const prompt = process.argv.slice(2).join(' ');

  if (!prompt) {
    console.error('Usage: npx ts-node exercise_2_starter.ts "<prompt>"');
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
      }
    },
    onError: (error) => {
      console.error('\nError:', error.message);
    },
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
