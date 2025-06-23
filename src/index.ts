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
import { ConfigLoader } from './config.js';
import { SecurityValidator } from './security.js';
import type { Message } from './types.js';

// Load configuration
const configLoader = new ConfigLoader();
const config = configLoader.get();

// Validate configuration
const configErrors = configLoader.validate();
if (configErrors.length > 0) {
  console.error('Configuration errors:', configErrors);
  process.exit(1);
}

// Initialize components with config
const sessionLoader = new SessionLoader(
  config.sessionsDir,
  config.excludedProjects,
  config.allowedProjects,
  config.enableLogging
);
const searchEngine = new SearchEngine();
const security = new SecurityValidator(config.sessionsDir);

// Load sessions on startup
if (config.enableLogging) {
  console.error('Initializing CC Inspect MCP Server...');
}
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
        const params: any = args || {};
        
        // Apply config limits
        if (params.limit === undefined) {
          params.limit = config.defaultLimit;
        } else if (params.limit > config.maxLimit) {
          params.limit = config.maxLimit;
        }
        
        // Sanitize query if provided
        if (params.query && typeof params.query === 'string') {
          params.query = security.sanitizeQuery(params.query);
        }
        
        const result = searchEngine.searchProjects(projects, params);
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
        const sessions = new Map<string, Message[]>();
        const params: any = args || {};
        
        // Apply config limits
        if (params.limit === undefined) {
          params.limit = config.defaultLimit;
        } else if (params.limit > config.maxLimit) {
          params.limit = config.maxLimit;
        }
        
        // Validate and sanitize inputs
        if (params.query && typeof params.query === 'string') {
          params.query = security.sanitizeQuery(params.query);
        }
        
        if (params.sessionId && typeof params.sessionId === 'string' && !security.validateSessionId(params.sessionId)) {
          throw new Error('Invalid session ID format');
        }
        
        // Build sessions map
        for (const msg of messages) {
          const existing = sessions.get(msg.sessionId) || [];
          existing.push(msg);
          sessions.set(msg.sessionId, existing);
        }

        const result = searchEngine.searchMessages(messages, sessions, params);
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
        
        // Validate required parameters
        if (!args || !args.startTime || !args.endTime || !args.groupBy) {
          throw new Error('Missing required parameters: startTime, endTime, and groupBy are required');
        }
        
        // Type-safe parameter passing
        const params = {
          startTime: String(args.startTime),
          endTime: String(args.endTime),
          groupBy: args.groupBy as 'project' | 'session' | 'hour'
        };
        
        const result = searchEngine.getActivitySummary(messages, params);
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
    if (config.enableLogging) {
      console.error(`Error in tool ${name}:`, error);
    }
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
if (config.enableLogging) {
  console.error('CC Inspect MCP Server running');
}