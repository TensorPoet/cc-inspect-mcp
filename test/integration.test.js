import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SearchEngine } from '../dist/search.js';

describe('SearchEngine Integration', () => {
  const searchEngine = new SearchEngine();

  // Mock messages for testing
  const mockMessages = [
    {
      uuid: '1',
      sessionId: 'session1',
      sessionIndex: 0,
      sessionMessageCount: 5,
      timestamp: '2024-01-01T10:00:00Z',
      type: 'user',
      content: 'How do I install perplexity mcp server?',
      projectPath: '/home/user/project1',
      projectName: 'project1'
    },
    {
      uuid: '2',
      sessionId: 'session1',
      sessionIndex: 1,
      sessionMessageCount: 5,
      timestamp: '2024-01-01T10:01:00Z',
      type: 'assistant',
      content: 'To install the perplexity MCP server, run npm install...',
      projectPath: '/home/user/project1',
      projectName: 'project1'
    },
    {
      uuid: '3',
      sessionId: 'session2',
      sessionIndex: 0,
      sessionMessageCount: 3,
      timestamp: '2024-01-02T14:00:00Z',
      type: 'user',
      content: 'I got an error with pip install',
      projectPath: '/home/user/project2',
      projectName: 'project2'
    },
    {
      uuid: '4',
      sessionId: 'session2',
      sessionIndex: 1,
      sessionMessageCount: 3,
      timestamp: '2024-01-02T14:01:00Z',
      type: 'assistant',
      content: 'The pip install error might be due to Python version...',
      projectPath: '/home/user/project2',
      projectName: 'project2'
    },
    {
      uuid: '5',
      sessionId: 'session3',
      sessionIndex: 0,
      sessionMessageCount: 2,
      timestamp: '2024-01-03T09:00:00Z',
      type: 'user',
      content: 'Setup Claude Code with MCP',
      projectPath: '/home/user/project3',
      projectName: 'project3'
    }
  ];

  // Build sessions map
  const mockSessions = new Map();
  mockMessages.forEach(msg => {
    const existing = mockSessions.get(msg.sessionId) || [];
    existing.push(msg);
    mockSessions.set(msg.sessionId, existing);
  });

  describe('Boolean search in messages', () => {
    it('should find messages with OR operator', () => {
      const result = searchEngine.searchMessages(mockMessages, mockSessions, {
        query: 'perplexity OR claude'
      });
      assert.equal(result.totalCount, 3);
      assert.equal(result.items.some(m => m.content.includes('perplexity')), true);
      assert.equal(result.items.some(m => m.content.includes('Claude')), true);
    });

    it('should find messages with AND operator', () => {
      const result = searchEngine.searchMessages(mockMessages, mockSessions, {
        query: 'error AND pip'
      });
      assert.equal(result.totalCount, 2);
      result.items.forEach(item => {
        assert.equal(
          item.content.toLowerCase().includes('error') && 
          item.content.toLowerCase().includes('pip'), 
          true
        );
      });
    });

    it('should exclude messages with NOT operator', () => {
      const result = searchEngine.searchMessages(mockMessages, mockSessions, {
        query: 'install NOT npm'
      });
      // Should find messages containing "install" but NOT "npm"
      // Messages 1, 3, 4 match this criteria
      assert.equal(result.totalCount, 3);
      result.items.forEach(item => {
        assert.equal(item.content.toLowerCase().includes('install'), true);
        assert.equal(item.content.toLowerCase().includes('npm'), false);
      });
    });

    it('should handle complex boolean queries', () => {
      const result = searchEngine.searchMessages(mockMessages, mockSessions, {
        query: '(mcp OR pip) AND install'
      });
      // Should find messages containing (mcp OR pip) AND install
      // Messages 1, 2, 3, 4 match this criteria
      assert.equal(result.totalCount, 4);
      result.items.forEach(item => {
        const content = item.content.toLowerCase();
        assert.equal(
          (content.includes('mcp') || content.includes('pip')) && content.includes('install'),
          true
        );
      });
    });

    it('should support phrase search', () => {
      const result = searchEngine.searchMessages(mockMessages, mockSessions, {
        query: '"pip install"'
      });
      assert.equal(result.totalCount, 2);
      result.items.forEach(item => {
        assert.equal(item.content.toLowerCase().includes('pip install'), true);
      });
    });
  });

  describe('Project search with boolean', () => {
    const mockProjects = [
      {
        name: 'claude-code-search-mcp',
        path: '/home/user/claude-code-search-mcp',
        messageCount: 100,
        sessionCount: 5,
        firstMessageTime: '2024-01-01T00:00:00Z',
        lastMessageTime: '2024-01-05T00:00:00Z'
      },
      {
        name: 'perplexity-mcp',
        path: '/home/user/perplexity-mcp',
        messageCount: 50,
        sessionCount: 3,
        firstMessageTime: '2024-01-02T00:00:00Z',
        lastMessageTime: '2024-01-04T00:00:00Z'
      },
      {
        name: 'test-project',
        path: '/home/user/test-project',
        messageCount: 20,
        sessionCount: 2,
        firstMessageTime: '2024-01-03T00:00:00Z',
        lastMessageTime: '2024-01-03T10:00:00Z'
      }
    ];

    it('should find projects with OR operator', () => {
      const result = searchEngine.searchProjects(mockProjects, {
        query: 'claude OR perplexity'
      });
      assert.equal(result.totalCount, 2);
    });

    it('should find projects with AND operator', () => {
      const result = searchEngine.searchProjects(mockProjects, {
        query: 'mcp AND search'
      });
      assert.equal(result.totalCount, 1);
      assert.equal(result.items[0].name, 'claude-code-search-mcp');
    });

    it('should exclude projects with NOT operator', () => {
      const result = searchEngine.searchProjects(mockProjects, {
        query: 'mcp NOT perplexity'
      });
      assert.equal(result.totalCount, 1);
      assert.equal(result.items[0].name, 'claude-code-search-mcp');
    });
  });

  describe('Fallback to simple search', () => {
    it('should fallback when no boolean operators present', () => {
      const result = searchEngine.searchMessages(mockMessages, mockSessions, {
        query: 'install'
      });
      assert.equal(result.totalCount >= 3, true);
    });

    it('should handle mixed case in operators', () => {
      const result = searchEngine.searchMessages(mockMessages, mockSessions, {
        query: 'error and pip' // lowercase 'and' should not be treated as operator
      });
      // Should fallback to simple search looking for all three words
      assert.equal(result.totalCount, 0);
    });
  });
});