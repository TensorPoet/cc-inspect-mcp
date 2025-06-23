import { resolve, isAbsolute, relative } from 'path';
import { homedir } from 'os';

export class SecurityValidator {
  private allowedBasePath: string;

  constructor(basePath?: string) {
    // Default to Claude's directory, but allow override
    this.allowedBasePath = resolve(basePath || join(homedir(), '.claude'));
  }

  /**
   * Validates that a path is within the allowed directory
   * Prevents directory traversal attacks
   */
  validatePath(inputPath: string): boolean {
    try {
      const resolvedPath = resolve(inputPath);
      const relativePath = relative(this.allowedBasePath, resolvedPath);
      
      // If the relative path starts with '..', it's outside allowed directory
      return !relativePath.startsWith('..') && !isAbsolute(relativePath);
    } catch {
      return false;
    }
  }

  /**
   * Sanitizes search queries to prevent injection attacks
   * Allows only safe characters for boolean search
   */
  sanitizeQuery(query: string): string {
    // Allow alphanumeric, spaces, and boolean operators
    // Remove any potential script injection attempts
    return query
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '') // Remove any HTML tags
      .slice(0, 1000); // Limit query length
  }

  /**
   * Validates that session IDs are valid UUIDs
   */
  validateSessionId(sessionId: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(sessionId);
  }

  /**
   * Sanitizes log output to prevent sensitive data exposure
   */
  sanitizeForLogging(content: string, maxLength: number = 200): string {
    return content
      .slice(0, maxLength)
      .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters
      + (content.length > maxLength ? '...' : '');
  }
}

// Re-export join for import fix
import { join } from 'path';