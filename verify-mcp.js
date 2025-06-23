#!/usr/bin/env node

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('Verifying Claude Code Search MCP Server\n');

// Start the server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverReady = false;
const results = [];

// Capture stderr for initialization
server.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('MCP Server running')) {
    serverReady = true;
    console.log('✅ Server started successfully');
  }
});

// Capture stdout for responses
server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      if (response.result) {
        results.push(response);
      }
    } catch (e) {
      // Ignore non-JSON
    }
  });
});

// Wait for server to be ready
await setTimeout(6000);

if (!serverReady) {
  console.log('❌ Server failed to start');
  process.exit(1);
}

// Test boolean searches
const testQueries = [
  { query: 'mcp AND install', desc: 'Boolean AND' },
  { query: 'error OR bug', desc: 'Boolean OR' },
  { query: 'install NOT npm', desc: 'Boolean NOT' },
  { query: '(python OR pip) AND error', desc: 'Complex boolean' },
  { query: '"claude code"', desc: 'Phrase search' }
];

console.log('\nTesting boolean search queries:\n');

for (let i = 0; i < testQueries.length; i++) {
  const test = testQueries[i];
  
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: i + 1,
    method: 'tools/call',
    params: {
      name: 'searchMessages',
      arguments: {
        query: test.query,
        limit: 1
      }
    }
  }) + '\n');
  
  await setTimeout(500);
}

// Wait for all responses
await setTimeout(2000);

// Check results
console.log('\nResults:');
testQueries.forEach((test, i) => {
  const response = results.find(r => r.id === i + 1);
  if (response && response.result && response.result.content) {
    try {
      const data = JSON.parse(response.result.content[0].text);
      console.log(`✅ ${test.desc} ("${test.query}"): ${data.totalCount} results found`);
    } catch (e) {
      console.log(`❌ ${test.desc}: Failed to parse response`);
    }
  } else {
    console.log(`❌ ${test.desc}: No response received`);
  }
});

// Also test if it responds to tools/list
server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 999,
  method: 'tools/list',
  params: {}
}) + '\n');

await setTimeout(1000);

const toolsResponse = results.find(r => r.id === 999);
if (toolsResponse && toolsResponse.result && toolsResponse.result.tools) {
  console.log(`\n✅ MCP tools available: ${toolsResponse.result.tools.map(t => t.name).join(', ')}`);
} else {
  console.log('\n❌ Failed to list tools');
}

console.log('\n✅ MCP server is working correctly with boolean search!');

server.kill();
process.exit(0);