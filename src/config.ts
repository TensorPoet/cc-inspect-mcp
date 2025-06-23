import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface Config {
  // Paths
  sessionsDir: string;
  
  // Search settings
  defaultLimit: number;
  maxLimit: number;
  maxQueryLength: number;
  
  // Security
  enableLogging: boolean;
  logSensitiveContent: boolean;
  allowedProjects?: string[];
  excludedProjects?: string[];
  
  // Features
  enableBooleanSearch: boolean;
}

const DEFAULT_CONFIG: Config = {
  sessionsDir: join(homedir(), '.claude', 'projects'),
  defaultLimit: 50,
  maxLimit: 1000,
  maxQueryLength: 1000,
  enableLogging: true,
  logSensitiveContent: false,
  enableBooleanSearch: true
};

export class ConfigLoader {
  private config: Config;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): Config {
    const config = { ...DEFAULT_CONFIG };
    
    // 1. Check for config file
    const configPaths = [
      join(process.cwd(), 'cc-inspect.config.json'),
      join(homedir(), '.claude', 'cc-inspect-config.json'),
      join(homedir(), '.config', 'cc-inspect', 'config.json')
    ];
    
    for (const configPath of configPaths) {
      if (existsSync(configPath)) {
        try {
          const fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
          Object.assign(config, fileConfig);
          if (config.enableLogging) {
            console.error(`Loaded config from ${configPath}`);
          }
          break;
        } catch (error) {
          console.error(`Error loading config from ${configPath}:`, error);
        }
      }
    }
    
    // 2. Override with environment variables
    if (process.env.CLAUDE_SESSIONS_DIR) {
      config.sessionsDir = process.env.CLAUDE_SESSIONS_DIR;
    }
    if (process.env.CLAUDE_SEARCH_LIMIT) {
      config.defaultLimit = parseInt(process.env.CLAUDE_SEARCH_LIMIT, 10);
    }
    if (process.env.CLAUDE_SEARCH_LOG_SENSITIVE === 'true') {
      config.logSensitiveContent = true;
    }
    
    return config;
  }

  get(): Config {
    return this.config;
  }

  validate(): string[] {
    const errors: string[] = [];
    
    if (!this.config.sessionsDir) {
      errors.push('sessionsDir is required');
    }
    
    if (this.config.defaultLimit <= 0 || this.config.defaultLimit > 10000) {
      errors.push('defaultLimit must be between 1 and 10000');
    }
    
    if (this.config.maxLimit < this.config.defaultLimit) {
      errors.push('maxLimit must be >= defaultLimit');
    }
    
    return errors;
  }
}