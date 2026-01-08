/**
 * Segment 3: Slack Integration Demo
 *
 * Shows how to integrate Claude with Slack for notifications
 * and team communication.
 *
 * Run: npx tsx segment_3_mcp/04_slack_integration.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient, getModel } from '../src/utils/client.js';
import { logger } from '../src/utils/logger.js';

/**
 * Simulated Slack API client
 */
class SlackClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async postMessage(channel: string, text: string, blocks?: unknown[]): Promise<void> {
    logger.info(`[SIMULATED] Posting to ${channel}:`, 'Slack');
    console.log(text);
    if (blocks) {
      logger.json(blocks, 'Blocks');
    }
  }

  async addReaction(channel: string, timestamp: string, emoji: string): Promise<void> {
    logger.info(`[SIMULATED] Adding :${emoji}: to message`, 'Slack');
  }

  async getChannelHistory(channel: string, limit = 10): Promise<unknown[]> {
    // Simulated messages
    return [
      { user: 'U123', text: 'Anyone seen the deployment issue?', ts: '1234567890.123' },
      { user: 'U456', text: 'Yes, checking the logs now', ts: '1234567891.123' },
      { user: 'U789', text: 'Found it - config error in production', ts: '1234567892.123' },
    ];
  }
}

/**
 * Define Slack tools for Claude
 */
const slackTools: Anthropic.Tool[] = [
  {
    name: 'send_slack_message',
    description: 'Send a message to a Slack channel',
    input_schema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel name or ID (e.g., #engineering)' },
        message: { type: 'string', description: 'Message text (supports Slack markdown)' },
        thread_ts: { type: 'string', description: 'Thread timestamp to reply in thread' },
      },
      required: ['channel', 'message'],
    },
  },
  {
    name: 'send_code_review_notification',
    description: 'Send a formatted code review notification to Slack',
    input_schema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel to post to' },
        pr_title: { type: 'string', description: 'Pull request title' },
        pr_url: { type: 'string', description: 'Pull request URL' },
        summary: { type: 'string', description: 'Review summary' },
        status: { type: 'string', enum: ['approved', 'changes_requested', 'pending'] },
        issues: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of issues found',
        },
      },
      required: ['channel', 'pr_title', 'pr_url', 'summary', 'status'],
    },
  },
  {
    name: 'get_channel_context',
    description: 'Get recent messages from a Slack channel for context',
    input_schema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel name or ID' },
        limit: { type: 'number', description: 'Number of messages to retrieve' },
      },
      required: ['channel'],
    },
  },
];

/**
 * Execute Slack tool calls
 */
async function executeSlackTool(
  slack: SlackClient,
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case 'send_slack_message': {
      await slack.postMessage(input.channel as string, input.message as string);
      return 'Message sent successfully';
    }

    case 'send_code_review_notification': {
      const status = input.status as string;
      const emoji = status === 'approved' ? ':white_check_mark:' : status === 'changes_requested' ? ':warning:' : ':eyes:';
      const color = status === 'approved' ? '#36a64f' : status === 'changes_requested' ? '#ff9800' : '#2196f3';

      const blocks = [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${emoji} Code Review: ${input.pr_title}` },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Status:* ${status.replace('_', ' ').toUpperCase()}` },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Summary:*\n${input.summary}` },
        },
      ];

      if (input.issues && (input.issues as string[]).length > 0) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Issues Found:*\n${(input.issues as string[]).map((i) => `• ${i}`).join('\n')}`,
          },
        });
      }

      await slack.postMessage(input.channel as string, `Review for: ${input.pr_url}`, blocks);
      return 'Code review notification sent';
    }

    case 'get_channel_context': {
      const messages = await slack.getChannelHistory(input.channel as string, input.limit as number);
      return JSON.stringify(messages, null, 2);
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

/**
 * Demo: Claude sends Slack notifications
 */
async function demoSlackNotification(client: Anthropic, slack: SlackClient): Promise<void> {
  logger.subsection('Code Review Notification Demo');

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `I just reviewed PR #42 "Add user authentication".
Found these issues:
1. JWT secret should not be hardcoded
2. Missing rate limiting on login endpoint
3. Password validation is too weak

Please send a code review notification to #engineering with status "changes_requested".
The PR URL is https://github.com/acme/app/pull/42`,
    },
  ];

  let continueLoop = true;

  while (continueLoop) {
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 1024,
      tools: slackTools,
      messages,
    });

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await executeSlackTool(slack, block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        } else if (block.type === 'text' && block.text) {
          console.log(block.text);
        }
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    } else {
      continueLoop = false;
      for (const block of response.content) {
        if (block.type === 'text') {
          console.log(block.text);
        }
      }
    }
  }
}

/**
 * Demo: Claude responds to Slack context
 */
async function demoSlackContext(client: Anthropic, slack: SlackClient): Promise<void> {
  logger.subsection('Channel Context Demo');

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: 'Check the recent messages in #incidents and summarize what is happening.',
    },
  ];

  let continueLoop = true;

  while (continueLoop) {
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 1024,
      tools: slackTools,
      messages,
    });

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await executeSlackTool(slack, block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    } else {
      continueLoop = false;
      logger.subsection('Claude\'s Summary');
      for (const block of response.content) {
        if (block.type === 'text') {
          console.log(block.text);
        }
      }
    }
  }
}

/**
 * Show Slack MCP server setup
 */
function showSlackSetup(): void {
  logger.section('Slack Integration Setup');

  console.log(`
1. CREATE A SLACK APP

   Go to: https://api.slack.com/apps
   Click "Create New App" > "From scratch"
   Name it "Claude Assistant" or similar

2. ADD BOT SCOPES

   Go to "OAuth & Permissions" and add these scopes:
   - chat:write (send messages)
   - channels:history (read channel messages)
   - channels:read (list channels)
   - reactions:write (add reactions)

3. INSTALL TO WORKSPACE

   Click "Install to Workspace" and authorize

4. GET YOUR TOKEN

   Copy the "Bot User OAuth Token" (starts with xoxb-)

5. CONFIGURE IN CLAUDE CODE

   {
     "mcpServers": {
       "slack": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-slack"],
         "env": {
           "SLACK_BOT_TOKEN": "\${SLACK_BOT_TOKEN}"
         }
       }
     }
   }

6. SET ENVIRONMENT VARIABLE

   export SLACK_BOT_TOKEN=xoxb-your-token-here
`);
}

/**
 * Main demo runner
 */
async function main(): Promise<void> {
  logger.section('Slack Integration Demo');

  // Show setup instructions
  showSlackSetup();

  // Create clients
  const client = createClient();
  const slack = new SlackClient(process.env.SLACK_BOT_TOKEN || 'demo-token');

  // Run demos
  await demoSlackNotification(client, slack);
  await demoSlackContext(client, slack);

  logger.section('Integration Patterns');
  console.log(`
Common Slack + Claude patterns:

1. DEPLOYMENT NOTIFICATIONS
   Claude summarizes deployments and posts to #releases

2. INCIDENT RESPONSE
   Claude monitors #incidents and suggests solutions

3. CODE REVIEW ALERTS
   Claude posts review summaries to #code-review

4. DAILY STANDUP SUMMARIES
   Claude reads standup channels and creates summaries

5. DOCUMENTATION UPDATES
   Claude notifies #docs when API changes are detected
`);
}

main().catch((error) => {
  logger.error(`Demo failed: ${error.message}`);
  process.exit(1);
});
