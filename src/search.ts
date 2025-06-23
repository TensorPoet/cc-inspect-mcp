import type { Message, Project, SearchResult } from './types.js';
import { BooleanQueryParser, BooleanQueryEvaluator } from './booleanParser.js';

export class SearchEngine {
  private booleanParser = new BooleanQueryParser();
  private booleanEvaluator = new BooleanQueryEvaluator();
  searchProjects(
    projects: Project[],
    params: {
      query?: string;
      startTime?: string;
      endTime?: string;
      sortBy?: 'recent' | 'messageCount' | 'name';
      limit?: number;
      offset?: number;
    }
  ): SearchResult<Project> {
    let filtered = [...projects];

    // Filter by query
    if (params.query) {
      // Try boolean search first
      let useBooleanSearch = false;
      let booleanQuery;
      
      try {
        if (/\b(AND|OR|NOT)\b|[()"-]/.test(params.query)) {
          booleanQuery = this.booleanParser.parse(params.query);
          useBooleanSearch = true;
        }
      } catch (e) {
        // Fall back to simple search
      }
      
      if (useBooleanSearch && booleanQuery) {
        filtered = filtered.filter(p => {
          const searchText = `${p.name} ${p.path}`;
          return this.booleanEvaluator.evaluate(booleanQuery, searchText);
        });
      } else {
        // Simple search
        const query = params.query.toLowerCase();
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(query) || 
          p.path.toLowerCase().includes(query)
        );
      }
    }

    // Filter by time range
    if (params.startTime || params.endTime) {
      filtered = filtered.filter(p => {
        if (params.startTime && p.lastMessageTime < params.startTime) return false;
        if (params.endTime && p.firstMessageTime > params.endTime) return false;
        return true;
      });
    }

    // Sort
    const sortBy = params.sortBy || 'recent';
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return b.lastMessageTime.localeCompare(a.lastMessageTime);
        case 'messageCount':
          return b.messageCount - a.messageCount;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    // Paginate
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    const paged = filtered.slice(offset, offset + limit);

    return {
      items: paged,
      totalCount: filtered.length,
      hasMore: offset + limit < filtered.length,
      nextOffset: offset + limit < filtered.length ? offset + limit : undefined
    };
  }

  searchMessages(
    messages: Message[],
    sessions: Map<string, Message[]>,
    params: {
      query?: string;
      sessionId?: string;
      projectPath?: string;
      messageType?: 'user' | 'assistant' | 'all';
      startTime?: string;
      endTime?: string;
      sessionStartIndex?: number;
      sessionEndIndex?: number;
      limit?: number;
      offset?: number;
    }
  ): SearchResult<Message> {
    let filtered = [...messages];

    // Handle session-specific search with index range
    if (params.sessionId) {
      const sessionMessages = sessions.get(params.sessionId);
      if (sessionMessages) {
        if (params.sessionStartIndex !== undefined || params.sessionEndIndex !== undefined) {
          const start = params.sessionStartIndex || 0;
          const end = params.sessionEndIndex || sessionMessages.length - 1;
          filtered = sessionMessages.slice(start, end + 1);
        } else {
          filtered = sessionMessages;
        }
      } else {
        filtered = [];
      }
    }

    // Filter by project
    if (params.projectPath) {
      filtered = filtered.filter(m => m.projectPath === params.projectPath);
    }

    // Filter by message type
    if (params.messageType && params.messageType !== 'all') {
      filtered = filtered.filter(m => m.type === params.messageType);
    }

    // Filter by time range
    if (params.startTime || params.endTime) {
      filtered = filtered.filter(m => {
        if (params.startTime && m.timestamp < params.startTime) return false;
        if (params.endTime && m.timestamp > params.endTime) return false;
        return true;
      });
    }

    // Search query
    if (params.query) {
      // Try to parse as boolean query first
      let useBooleanSearch = false;
      let booleanQuery;
      let queryTerms: string[] = [];
      
      try {
        // Check if query contains boolean operators
        if (/\b(AND|OR|NOT)\b|[()"-]/.test(params.query)) {
          booleanQuery = this.booleanParser.parse(params.query);
          queryTerms = this.booleanEvaluator.extractTerms(booleanQuery);
          useBooleanSearch = true;
        }
      } catch (e) {
        // Fall back to simple search if parsing fails
        console.error('Boolean query parse error:', e);
      }
      
      if (useBooleanSearch && booleanQuery) {
        // Boolean search
        filtered = filtered.filter(m => {
          return this.booleanEvaluator.evaluate(booleanQuery, m.content);
        });
        
        // Sort by relevance using extracted terms
        if (queryTerms.length > 0) {
          filtered.sort((a, b) => {
            const scoreA = this.scoreMessage(a, queryTerms);
            const scoreB = this.scoreMessage(b, queryTerms);
            return scoreB - scoreA;
          });
        }
      } else {
        // Simple search (backward compatible)
        const query = params.query.toLowerCase();
        const queryWords = query.split(/\s+/).filter(w => w.length > 0);
        
        filtered = filtered.filter(m => {
          const content = m.content.toLowerCase();
          // Match if all query words are found
          return queryWords.every(word => content.includes(word));
        });

        // Sort by relevance
        filtered.sort((a, b) => {
          const scoreA = this.scoreMessage(a, queryWords);
          const scoreB = this.scoreMessage(b, queryWords);
          return scoreB - scoreA;
        });
      }
    } else {
      // Sort by timestamp if no query
      filtered.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return b.timestamp.localeCompare(a.timestamp);
      });
    }

    // Paginate
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    const paged = filtered.slice(offset, offset + limit);

    return {
      items: paged,
      totalCount: filtered.length,
      hasMore: offset + limit < filtered.length,
      nextOffset: offset + limit < filtered.length ? offset + limit : undefined
    };
  }

  private scoreMessage(message: Message, queryWords: string[]): number {
    const content = message.content.toLowerCase();
    let score = 0;

    for (const word of queryWords) {
      // Count occurrences
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        score += matches.length;
      }
    }

    // Boost for exact phrase match
    const fullQuery = queryWords.join(' ');
    if (content.includes(fullQuery)) {
      score += queryWords.length * 2;
    }

    // Slight boost for user messages (questions often more relevant)
    if (message.type === 'user') {
      score *= 1.1;
    }

    return score;
  }

  getActivitySummary(
    messages: Message[],
    params: {
      startTime: string;
      endTime: string;
      groupBy: 'project' | 'session' | 'hour';
    }
  ): {
    totalMessages: number;
    breakdown: Array<{
      key: string;
      messageCount: number;
      userMessageCount: number;
      toolsUsed?: string[];
    }>;
  } {
    // Filter by time range
    const filtered = messages.filter(m => 
      m.timestamp >= params.startTime && 
      m.timestamp <= params.endTime
    );

    const breakdown = new Map<string, {
      messageCount: number;
      userMessageCount: number;
      tools: Set<string>;
    }>();

    for (const message of filtered) {
      let key: string;
      
      switch (params.groupBy) {
        case 'project':
          key = message.projectName;
          break;
        case 'session':
          key = message.sessionId;
          break;
        case 'hour':
          const date = new Date(message.timestamp);
          key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:00`;
          break;
      }

      const existing = breakdown.get(key) || {
        messageCount: 0,
        userMessageCount: 0,
        tools: new Set<string>()
      };

      existing.messageCount++;
      if (message.type === 'user') {
        existing.userMessageCount++;
      }
      if (message.toolsUsed) {
        message.toolsUsed.forEach(tool => existing.tools.add(tool));
      }

      breakdown.set(key, existing);
    }

    return {
      totalMessages: filtered.length,
      breakdown: Array.from(breakdown.entries()).map(([key, data]) => ({
        key,
        messageCount: data.messageCount,
        userMessageCount: data.userMessageCount,
        toolsUsed: data.tools.size > 0 ? Array.from(data.tools) : undefined
      }))
    };
  }
}