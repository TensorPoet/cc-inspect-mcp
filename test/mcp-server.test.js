import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

describe('MCP Server E2E Tests', () => {
  let server;
  let requestId = 1;

  before(async () => {
    // Start the MCP server
    server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to initialize
    await setTimeout(6000);
  });

  after(() => {
    if (server) {
      server.kill();
    }
  });

  // Helper to send JSON-RPC request
  async function sendRequest(method, params) {
    const request = {
      jsonrpc: '2.0',
      id: requestId++,
      method,
      params
    };
    
    const message = JSON.stringify(request);
    server.stdin.write(message + '\n');
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);
      
      const handleData = (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              clearTimeout(timeoutId);
              server.stdout.off('data', handleData);
              resolve(response);
            }
          } catch (e) {
            // Ignore non-JSON lines
          }
        }
      };
      server.stdout.on('data', handleData);
    });
  }

  it('should list available tools', async () => {
    const response = await sendRequest('tools/list', {});
    assert.equal(response.error, undefined);
    assert.equal(Array.isArray(response.result.tools), true);
    assert.equal(response.result.tools.length, 3);
    
    const toolNames = response.result.tools.map(t => t.name);
    assert.equal(toolNames.includes('searchProjects'), true);
    assert.equal(toolNames.includes('searchMessages'), true);
    assert.equal(toolNames.includes('getActivitySummary'), true);
  });

  it('should search messages with boolean query', async () => {
    const response = await sendRequest('tools/call', {
      name: 'searchMessages',
      arguments: {
        query: '(mcp OR perplexity) AND install',
        limit: 5
      }
    });
    
    assert.equal(response.error, undefined);
    assert.equal(response.result.content[0].type, 'text');
    
    const result = JSON.parse(response.result.content[0].text);
    assert.equal(typeof result.totalCount, 'number');
    assert.equal(Array.isArray(result.items), true);
  });

  it('should search projects with boolean query', async () => {
    const response = await sendRequest('tools/call', {
      name: 'searchProjects',
      arguments: {
        query: 'claude OR mcp',
        limit: 5
      }
    });
    
    assert.equal(response.error, undefined);
    assert.equal(response.result.content[0].type, 'text');
    
    const result = JSON.parse(response.result.content[0].text);
    assert.equal(typeof result.totalCount, 'number');
    assert.equal(Array.isArray(result.items), true);
  });

  it('should handle phrase search', async () => {
    const response = await sendRequest('tools/call', {
      name: 'searchMessages',
      arguments: {
        query: '"claude code"',
        limit: 5
      }
    });
    
    assert.equal(response.error, undefined);
    const result = JSON.parse(response.result.content[0].text);
    assert.equal(typeof result.totalCount, 'number');
  });

  it('should handle complex boolean with NOT', async () => {
    const response = await sendRequest('tools/call', {
      name: 'searchMessages',
      arguments: {
        query: 'install NOT npm',
        limit: 5
      }
    });
    
    assert.equal(response.error, undefined);
    const result = JSON.parse(response.result.content[0].text);
    assert.equal(typeof result.totalCount, 'number');
  });
});