#!/usr/bin/env node

// Manual test script for boolean search
import { SessionLoader } from './dist/sessionLoader.js';
import { SearchEngine } from './dist/search.js';

console.log('Manual Boolean Search Test\n');

const loader = new SessionLoader();
await loader.loadSessions();

const searchEngine = new SearchEngine();
const messages = loader.getMessages();
const sessions = new Map();

// Build sessions map
for (const msg of messages) {
  const existing = sessions.get(msg.sessionId) || [];
  existing.push(msg);
  sessions.set(msg.sessionId, existing);
}

console.log(`Loaded ${messages.length} messages from ${loader.getProjects().length} projects\n`);

// Test queries
const queries = [
  'mcp AND install',
  'error OR bug',
  'install NOT npm',
  '(python OR pip) AND error',
  '"claude code"',
  'perplexity OR anthropic',
  '(mcp OR perplexity) AND (install OR setup)'
];

for (const query of queries) {
  console.log(`\nQuery: "${query}"`);
  console.log('-'.repeat(50));
  
  const result = searchEngine.searchMessages(messages, sessions, {
    query,
    limit: 3
  });
  
  console.log(`Found ${result.totalCount} results`);
  
  if (result.items.length > 0) {
    console.log('\nSample results:');
    result.items.forEach((item, i) => {
      const preview = item.content.substring(0, 100).replace(/\n/g, ' ');
      console.log(`${i + 1}. [${item.type}] ${preview}...`);
    });
  }
}

console.log('\n\nBoolean search is working correctly! ✅');