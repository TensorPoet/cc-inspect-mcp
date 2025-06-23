# CC Inspect MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/cc-inspect-mcp.svg)](https://nodejs.org)

An MCP (Model Context Protocol) server for inspecting and searching Claude Code conversation history with powerful boolean search capabilities.

## Features

- Search projects by name, path, or time range
- Search messages with full-text search, time filters, and project filters
- Boolean search support with AND, OR, NOT operators and parentheses
- Phrase search with quoted strings
- Get activity summaries grouped by project, session, or hour
- Navigate sessions by index for contextual message retrieval

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

## Configuration

Add the MCP server to Claude Code using the CLI:

### Option 1: User-wide installation (recommended)
```bash
# From the cc-inspect-mcp directory after building:
claude mcp add -s user cc-inspect node dist/index.js
```

### Option 2: Project-specific installation
```bash
# From your project directory:
claude mcp add cc-inspect node /absolute/path/to/cc-inspect-mcp/dist/index.js
```

### Verify installation
```bash
claude mcp list
```

## Usage Examples

### In Claude Code

Once installed, you can use natural language to search your history:

```bash
# Ask Claude to search for you
claude -p "Use cc-inspect to find what projects I worked on yesterday"

# Or in an interactive session
claude
> Use the cc-inspect MCP to search for messages about 'pip install error'
```

### Direct MCP Tool Calls

When Claude Code calls the MCP tools, it uses:

```javascript
use_mcp_tool("cc-inspect", "searchProjects", {
  "startTime": "2024-06-22T00:00:00Z",
  "endTime": "2024-06-22T23:59:59Z",
  "sortBy": "messageCount"
})
```

### Search for specific content

```javascript
use_mcp_tool("cc-inspect", "searchMessages", {
  "query": "perplexity mcp install",
  "messageType": "all"
})
```

### Get context around a message

```javascript
// First find a message
const result = await use_mcp_tool("cc-inspect", "searchMessages", {
  "query": "error"
});

// Then get surrounding context
use_mcp_tool("cc-inspect", "searchMessages", {
  "sessionId": result.items[0].sessionId,
  "sessionStartIndex": result.items[0].sessionIndex - 5,
  "sessionEndIndex": result.items[0].sessionIndex + 5
})
```

### Get activity summary

```javascript
use_mcp_tool("cc-inspect", "getActivitySummary", {
  "startTime": "2024-06-22T00:00:00Z",
  "endTime": "2024-06-22T23:59:59Z",
  "groupBy": "project"
})
```

## API Reference

### searchProjects

Search for projects by various criteria.

**Parameters:**
- `query` (optional): Search in project names/paths (supports boolean search)
- `startTime` (optional): ISO 8601 - projects active after this time
- `endTime` (optional): ISO 8601 - projects active before this time
- `sortBy` (optional): "recent" | "messageCount" | "name"
- `limit` (optional): Maximum results (default: 50)
- `offset` (optional): For pagination

### searchMessages

Search messages with flexible filtering and boolean search support.

**Parameters:**
- `query` (optional): Text search with boolean support:
  - Boolean operators: `AND`, `OR`, `NOT` (or use `-` prefix)
  - Parentheses for grouping: `(term1 OR term2) AND term3`
  - Phrase search: `"exact phrase"`
  - Examples:
    - `error AND (pip OR npm)` - Find errors related to pip or npm
    - `install NOT npm` - Find install messages not about npm
    - `"pip install" OR "npm install"` - Find exact phrases
    - `(python OR javascript) AND tutorial` - Complex boolean logic
- `sessionId` (optional): Get specific session
- `projectPath` (optional): Filter by project
- `messageType` (optional): "user" | "assistant" | "all"
- `startTime` (optional): ISO 8601
- `endTime` (optional): ISO 8601
- `sessionStartIndex` (optional): When sessionId provided
- `sessionEndIndex` (optional): When sessionId provided
- `limit` (optional): Maximum results (default: 50)
- `offset` (optional): For pagination

### getActivitySummary

Get activity summary for a time range.

**Parameters:**
- `startTime` (required): ISO 8601
- `endTime` (required): ISO 8601
- `groupBy` (required): "project" | "session" | "hour"

## Development

Watch for changes during development:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

## Configuration

CC Inspect looks for configuration files in these locations (in order):
1. `./cc-inspect.config.json` (current directory)
2. `~/.claude/cc-inspect-config.json`
3. `~/.config/cc-inspect/config.json`

Create a configuration file to customize behavior:

```json
{
  "sessionsDir": "/path/to/sessions",
  "defaultLimit": 50,
  "maxLimit": 1000,
  "enableLogging": true,
  "logSensitiveContent": false,
  "excludedProjects": ["private-project"],
  "allowedProjects": ["project1", "project2"]
}
```

Or use environment variables:
- `CLAUDE_SESSIONS_DIR` - Custom sessions directory
- `CLAUDE_SEARCH_LIMIT` - Default result limit
- `CLAUDE_SEARCH_LOG_SENSITIVE` - Log conversation content (true/false)

## Message Structure

Each message includes:
- `uuid`: Unique message ID
- `sessionId`: Session UUID
- `sessionIndex`: Position in session (0-based)
- `sessionMessageCount`: Total messages in session
- `timestamp`: ISO 8601 timestamp
- `type`: "user" or "assistant"
- `content`: Message content
- `projectPath`: Full project path
- `projectName`: Project name
- `toolsUsed`: Array of tools used (for assistant messages)
- `parentUuid`: Parent message UUID (for threading)

## Troubleshooting

### Server doesn't start
- Ensure Node.js >= 18 is installed
- Check that Claude sessions directory exists: `~/.claude/projects`
- Verify no other process is using the MCP connection

### No search results
- Confirm you have Claude Code conversation history
- Check that boolean operators are uppercase (AND, OR, NOT)
- Try simpler queries first
- Verify sessions are being loaded (check server logs)

### Performance issues
- Large conversation histories may take time to load initially
- Limit search results with smaller `limit` parameter
- Consider using `excludedProjects` or `allowedProjects` in config to reduce data loaded

## License

MIT - see [LICENSE](LICENSE) file.