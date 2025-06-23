import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { glob } from 'glob';
import type { Message, Project, RawMessage } from './types.js';

export class SessionLoader {
  private claudeDir: string;
  private messages: Message[] = [];
  private projects: Map<string, Project> = new Map();
  private sessions: Map<string, Message[]> = new Map();

  constructor(claudeDir?: string) {
    this.claudeDir = claudeDir || join(homedir(), '.claude', 'projects');
  }

  async loadSessions(): Promise<void> {
    console.error('Loading Claude Code sessions...');
    
    // Find all JSONL files
    const pattern = join(this.claudeDir, '**/*.jsonl');
    const files = await glob(pattern);
    
    console.error(`Found ${files.length} session files`);

    for (const file of files) {
      try {
        await this.loadSessionFile(file);
      } catch (error) {
        console.error(`Error loading ${file}:`, error);
      }
    }

    console.error(`Loaded ${this.messages.length} messages from ${this.projects.size} projects`);
  }

  private async loadSessionFile(filePath: string): Promise<void> {
    const projectFolder = basename(dirname(filePath));
    const sessionId = basename(filePath, '.jsonl');
    
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const sessionMessages: Message[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      try {
        const rawMessage: RawMessage = JSON.parse(lines[i]);
        const message = this.parseMessage(rawMessage, projectFolder, i, lines.length);
        
        this.messages.push(message);
        sessionMessages.push(message);
      } catch (error) {
        console.error(`Error parsing message in ${filePath} line ${i + 1}:`, error);
      }
    }
    
    if (sessionMessages.length > 0) {
      this.sessions.set(sessionId, sessionMessages);
      this.updateProjectInfo(projectFolder, sessionMessages);
    }
  }

  private parseMessage(raw: RawMessage, projectFolder: string, index: number, totalInSession: number): Message {
    const projectPath = raw.cwd || '';
    const projectName = this.decodeProjectName(projectFolder);
    
    // Extract content
    let content = '';
    const toolsUsed: string[] = [];
    
    // Ensure raw.message exists
    if (!raw.message) {
      content = '[No message content]';
    } else if (raw.type === 'user') {
      content = typeof raw.message.content === 'string' 
        ? raw.message.content 
        : JSON.stringify(raw.message.content || '');
    } else if (raw.type === 'assistant' && raw.message.content && Array.isArray(raw.message.content)) {
      const textParts: string[] = [];
      
      for (const item of raw.message.content) {
        if (item.type === 'text' && item.text) {
          textParts.push(item.text);
        } else if (item.type === 'tool_use' && item.name) {
          toolsUsed.push(item.name);
          textParts.push(`[Tool: ${item.name}]`);
        }
      }
      
      content = textParts.join(' ');
    } else if (raw.message && typeof raw.message.content === 'string') {
      content = raw.message.content;
    }
    
    return {
      uuid: raw.uuid,
      sessionId: raw.sessionId,
      sessionIndex: index,
      sessionMessageCount: totalInSession,
      timestamp: raw.timestamp,
      type: raw.type,
      content,
      projectPath,
      projectName,
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
      parentUuid: raw.parentUuid || undefined
    };
  }

  private decodeProjectName(folderName: string): string {
    // Convert encoded folder name back to readable format
    // e.g., "-Users-x-Documents-code-project" -> "project"
    const parts = folderName.split('-').filter(p => p);
    return parts[parts.length - 1] || folderName;
  }

  private updateProjectInfo(projectFolder: string, messages: Message[]): void {
    const projectName = this.decodeProjectName(projectFolder);
    const projectPath = messages[0]?.projectPath || '';
    
    const existing = this.projects.get(projectName) || {
      name: projectName,
      path: projectPath,
      messageCount: 0,
      sessionCount: 0,
      firstMessageTime: messages[0]?.timestamp || '',
      lastMessageTime: messages[0]?.timestamp || ''
    };
    
    existing.messageCount += messages.length;
    existing.sessionCount += 1;
    
    // Update time range
    for (const msg of messages) {
      if (msg.timestamp < existing.firstMessageTime) {
        existing.firstMessageTime = msg.timestamp;
      }
      if (msg.timestamp > existing.lastMessageTime) {
        existing.lastMessageTime = msg.timestamp;
      }
    }
    
    this.projects.set(projectName, existing);
  }

  getMessages(): Message[] {
    return this.messages;
  }

  getProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  getSession(sessionId: string): Message[] {
    return this.sessions.get(sessionId) || [];
  }
}

// Helper to get dirname (not available in ES modules by default)
function dirname(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  parts.pop();
  return parts.join('/');
}