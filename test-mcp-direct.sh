#!/bin/bash

# Test MCP server directly with JSON-RPC
echo "Testing Claude Code Search MCP Server"
echo "====================================="

# Create a test script that sends JSON-RPC requests
cat > test-request.js << 'EOF'
import { spawn } from 'child_process';

// Start the MCP server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Wait for initialization
setTimeout(() => {
  // Test 1: List tools
  console.log('\n1. Testing tools/list:');
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  }) + '\n');

  // Test 2: Boolean search
  setTimeout(() => {
    console.log('\n2. Testing boolean search "mcp AND install":');
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'searchMessages',
        arguments: {
          query: 'mcp AND install',
          limit: 3
        }
      }
    }) + '\n');
  }, 1000);

  // Test 3: Complex boolean
  setTimeout(() => {
    console.log('\n3. Testing complex boolean "(error OR bug) AND pip":');
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'searchMessages',
        arguments: {
          query: '(error OR bug) AND pip',
          limit: 3
        }
      }
    }) + '\n');
  }, 2000);

  // Test 4: Phrase search
  setTimeout(() => {
    console.log('\n4. Testing phrase search "claude code":');
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'searchMessages',
        arguments: {
          query: '"claude code"',
          limit: 3
        }
      }
    }) + '\n');
  }, 3000);

  // Kill server after tests
  setTimeout(() => {
    server.kill();
    process.exit(0);
  }, 8000);
}, 6000);

// Handle responses
server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      if (response.id === 1) {
        console.log('Tools available:', response.result.tools.map(t => t.name).join(', '));
      } else if (response.id >= 2) {
        const result = JSON.parse(response.result.content[0].text);
        console.log(`Found ${result.totalCount} results`);
        if (result.items.length > 0) {
          console.log('First result preview:', result.items[0].content.substring(0, 80) + '...');
        }
      }
    } catch (e) {
      // Ignore non-JSON output
    }
  });
});

server.stderr.on('data', (data) => {
  // Log initialization messages
  if (data.toString().includes('MCP Server running')) {
    console.log('✓ Server started successfully');
  }
});
EOF

# Run the test
node test-request.js

# Cleanup
rm test-request.js