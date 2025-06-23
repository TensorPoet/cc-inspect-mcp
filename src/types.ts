export interface Message {
  uuid: string;
  sessionId: string;
  sessionIndex: number;      // Position in session (0-based)
  sessionMessageCount: number; // Total messages in this session
  timestamp: string;         // ISO 8601
  type: "user" | "assistant";
  content: string;           // Extracted/formatted content
  projectPath: string;       // From cwd field
  projectName: string;       // Decoded folder name
  toolsUsed?: string[];      // For assistant messages ["Edit", "Bash", etc]
  parentUuid?: string;
}

export interface Project {
  name: string;
  path: string;
  messageCount: number;
  sessionCount: number;
  firstMessageTime: string;
  lastMessageTime: string;
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

export interface RawMessage {
  uuid: string;
  parentUuid?: string | null;
  sessionId: string;
  timestamp: string;
  cwd: string;
  type: "user" | "assistant";
  message: {
    role: string;
    content: string | Array<{
      type: string;
      text?: string;
      name?: string;
      id?: string;
      input?: any;
    }>;
  };
}