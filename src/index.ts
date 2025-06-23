#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { SessionLoader } from './sessionLoader.js';
import { SearchEngine } from './search.js';

// Initialize components
const sessionLoader = new SessionLoader(process.env.CLAUDE_SESSIONS_DIR);
const searchEngine = new SearchEngine();

// Load sessions on startup
console.error('Initializing CC Inspect MCP Server...');
await sessionLoader.loadSessions();

// Create MCP server
const server = new Server(
  {
    name: 'cc-inspect',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
const tools: Tool[] = [
  {
    name: 'searchProjects',
    description: 'Search for Claude Code projects by name, path, or time range using CC Inspect',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search in project names/paths'
        },
        startTime: {
          type: 'string',
          description: 'ISO 8601 timestamp - projects active after this time'
        },
        endTime: {
          type: 'string',
          description: 'ISO 8601 timestamp - projects active before this time'
        },
        sortBy: {
          type: 'string',
          enum: ['recent', 'messageCount', 'name'],
          description: 'How to sort results'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 50)'
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination'
        }
      }
    }
  },
  {
    name: 'searchMessages',
    description: 'Search messages in Claude Code conversation history',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Text to search for in messages'
        },
        sessionId: {
          type: 'string',
          description: 'Get messages from a specific session'
        },
        projectPath: {
          type: 'string',
          description: 'Filter by project path'
        },
        messageType: {
          type: 'string',
          enum: ['user', 'assistant', 'all'],
          description: 'Filter by message type'
        },
        startTime: {
          type: 'string',
          description: 'ISO 8601 timestamp - messages after this time'
        },
        endTime: {
          type: 'string',
          description: 'ISO 8601 timestamp - messages before this time'
        },
        sessionStartIndex: {
          type: 'number',
          description: 'When sessionId provided, start from this index'
        },
        sessionEndIndex: {
          type: 'number',
          description: 'When sessionId provided, end at this index'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 50)'
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination'
        }
      }
    }
  },
  {
    name: 'getActivitySummary',
    description: 'Get a summary of activity within a time range',
    inputSchema: {
      type: 'object',
      required: ['startTime', 'endTime', 'groupBy'],
      properties: {
        startTime: {
          type: 'string',
          description: 'ISO 8601 timestamp - start of time range'
        },
        endTime: {
          type: 'string',
          description: 'ISO 8601 timestamp - end of time range'
        },
        groupBy: {
          type: 'string',
          enum: ['project', 'session', 'hour'],
          description: 'How to group the summary'
        }
      }
    }
  }
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'searchProjects': {
        const projects = sessionLoader.getProjects();
        const result = searchEngine.searchProjects(projects, args || {});
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'searchMessages': {
        const messages = sessionLoader.getMessages();
        const sessions = new Map<string, any>();
        
        // Build sessions map more efficiently
        for (const msg of messages) {
          const existing = sessions.get(msg.sessionId) || [];
          existing.push(msg);
          sessions.set(msg.sessionId, existing);
        }

        const result = searchEngine.searchMessages(messages, sessions, args || {});
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'getActivitySummary': {
        const messages = sessionLoader.getMessages();
        const result = searchEngine.getActivitySummary(messages, args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error in tool ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('CC Inspect MCP Server running');