# Usage Examples

## Example Queries and How They Work

### "What did we work on yesterday?"

```javascript
// Step 1: Get projects active yesterday
const projects = await searchProjects({
  startTime: "2024-06-22T00:00:00Z",
  endTime: "2024-06-22T23:59:59Z"
});

// Step 2: Get activity summary
const summary = await getActivitySummary({
  startTime: "2024-06-22T00:00:00Z",  
  endTime: "2024-06-22T23:59:59Z",
  groupBy: "project"
});

// Step 3: For each project, get some sample messages
for (const project of summary.breakdown) {
  const messages = await searchMessages({
    projectPath: project.key,
    startTime: "2024-06-22T00:00:00Z",
    endTime: "2024-06-22T23:59:59Z",
    limit: 10
  });
}
```

### "How did we install perplexity mcp globally?"

```javascript
// Step 1: Search for relevant messages
const results = await searchMessages({
  query: "perplexity mcp install global"
});

// Step 2: If need more context around a specific message
const message = results.items[0];
const context = await searchMessages({
  sessionId: message.sessionId,
  sessionStartIndex: message.sessionIndex - 5,
  sessionEndIndex: message.sessionIndex + 5
});
```

### "How many projects did we work on yesterday?"

```javascript
// Simple approach - just count projects
const projects = await searchProjects({
  startTime: "2024-06-22T00:00:00Z",
  endTime: "2024-06-22T23:59:59Z"
});
// Answer: projects.totalCount

// Or use activity summary
const summary = await getActivitySummary({
  startTime: "2024-06-22T00:00:00Z",
  endTime: "2024-06-22T23:59:59Z",
  groupBy: "project"
});
// Answer: summary.breakdown.length
```

### "How did we resolve the pip installation error the other day?"

```javascript
// Step 1: Search for pip errors in recent messages
const results = await searchMessages({
  query: "pip install error",
  startTime: "2024-06-20T00:00:00Z",  // 3 days ago
  endTime: "2024-06-23T00:00:00Z"     // today
});

// Step 2: Look at messages that mention resolution
const solutions = await searchMessages({
  query: "pip resolved fixed working",
  startTime: "2024-06-20T00:00:00Z",
  endTime: "2024-06-23T00:00:00Z"
});

// Step 3: Check specific sessions for the full conversation
for (const msg of results.items) {
  if (msg.content.includes("error")) {
    // Get the whole session to see the resolution
    const session = await searchMessages({
      sessionId: msg.sessionId
    });
  }
}
```

## Advanced Usage

### Finding specific tool usage

```javascript
// Find all edits to Python files yesterday
const messages = await searchMessages({
  query: ".py",
  messageType: "assistant",
  startTime: "2024-06-22T00:00:00Z",
  endTime: "2024-06-22T23:59:59Z"
});

// Filter for Edit tool usage
const edits = messages.items.filter(m => 
  m.toolsUsed && m.toolsUsed.includes('Edit')
);
```

### Getting a project's activity timeline

```javascript
// Get all sessions for a project
const messages = await searchMessages({
  projectPath: "/Users/x/Documents/code/projects/api-server"
});

// Group by session
const sessions = {};
for (const msg of messages.items) {
  if (!sessions[msg.sessionId]) {
    sessions[msg.sessionId] = [];
  }
  sessions[msg.sessionId].push(msg);
}

// Now you can see when each session occurred
```

### Searching across multiple projects

```javascript
// Find all mentions of a specific error across all projects
const results = await searchMessages({
  query: "ModuleNotFoundError numpy"
});

// Group results by project
const byProject = {};
for (const msg of results.items) {
  if (!byProject[msg.projectName]) {
    byProject[msg.projectName] = [];
  }
  byProject[msg.projectName].push(msg);
}
```

## Tips

1. **Use time ranges** to narrow down searches and improve performance
2. **Start broad, then narrow** - use activity summary first, then drill into specific messages
3. **Use session navigation** to get context around interesting messages
4. **Combine search parameters** for precise results (e.g., query + projectPath + timeRange)
5. **Check toolsUsed** field to identify actual work vs discussion