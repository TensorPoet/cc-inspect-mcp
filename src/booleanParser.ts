export interface BooleanQuery {
  type: 'AND' | 'OR' | 'NOT' | 'TERM' | 'PHRASE';
  value?: string;
  left?: BooleanQuery;
  right?: BooleanQuery;
  child?: BooleanQuery;
}

export class BooleanQueryParser {
  private pos: number = 0;
  private input: string = '';

  parse(query: string): BooleanQuery {
    this.input = query;
    this.pos = 0;
    return this.parseExpression();
  }

  private parseExpression(): BooleanQuery {
    let left = this.parseAndExpression();

    while (this.consumeKeyword('OR')) {
      const right = this.parseAndExpression();
      left = { type: 'OR', left, right };
    }

    return left;
  }

  private parseAndExpression(): BooleanQuery {
    let left = this.parseNotExpression();

    while (this.pos < this.input.length && !this.peekKeyword('OR') && !this.peekToken(')')) {
      // Check for explicit AND or implicit AND (space)
      const hasAnd = this.consumeKeyword('AND');
      
      // Skip whitespace
      this.skipWhitespace();
      
      // If we hit OR, closing paren, or end of input, break
      if (this.pos >= this.input.length || this.peekKeyword('OR') || this.peekToken(')')) {
        break;
      }

      const right = this.parseNotExpression();
      left = { type: 'AND', left, right };
    }

    return left;
  }

  private parseNotExpression(): BooleanQuery {
    if (this.consumeToken('-') || this.consumeKeyword('NOT')) {
      const child = this.parsePrimaryExpression();
      return { type: 'NOT', child };
    }
    return this.parsePrimaryExpression();
  }

  private parsePrimaryExpression(): BooleanQuery {
    this.skipWhitespace();

    // Handle parentheses
    if (this.consumeToken('(')) {
      const expr = this.parseExpression();
      if (!this.consumeToken(')')) {
        throw new Error(`Expected closing parenthesis at position ${this.pos}`);
      }
      return expr;
    }

    // Handle quoted phrases
    if (this.peekToken('"')) {
      return this.parsePhrase();
    }

    // Handle regular terms
    return this.parseTerm();
  }

  private parseTerm(): BooleanQuery {
    this.skipWhitespace();
    let term = '';
    
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      
      // Stop at special characters or keywords
      if (char === ' ' || char === '(' || char === ')' || char === '"' || char === '-') {
        break;
      }
      
      // Check if we're at a keyword boundary
      if (this.peekKeyword('AND') || this.peekKeyword('OR') || this.peekKeyword('NOT')) {
        break;
      }
      
      term += char;
      this.pos++;
    }

    if (term.length === 0) {
      throw new Error(`Unexpected character at position ${this.pos}`);
    }

    return { type: 'TERM', value: term };
  }

  private parsePhrase(): BooleanQuery {
    this.consumeToken('"');
    let phrase = '';
    
    while (this.pos < this.input.length && this.input[this.pos] !== '"') {
      phrase += this.input[this.pos];
      this.pos++;
    }
    
    this.consumeToken('"');
    return { type: 'PHRASE', value: phrase };
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && this.input[this.pos] === ' ') {
      this.pos++;
    }
  }

  private peekToken(token: string): boolean {
    this.skipWhitespace();
    return this.input.substr(this.pos, token.length) === token;
  }

  private consumeToken(token: string): boolean {
    this.skipWhitespace();
    if (this.input.substr(this.pos, token.length) === token) {
      this.pos += token.length;
      return true;
    }
    return false;
  }

  private peekKeyword(keyword: string): boolean {
    this.skipWhitespace();
    const ahead = this.input.substr(this.pos, keyword.length + 1);
    return (
      ahead === keyword + ' ' || 
      ahead === keyword + '(' || 
      this.input.substr(this.pos) === keyword
    );
  }

  private consumeKeyword(keyword: string): boolean {
    if (this.peekKeyword(keyword)) {
      this.pos += keyword.length;
      return true;
    }
    return false;
  }
}

export class BooleanQueryEvaluator {
  evaluate(query: BooleanQuery, text: string): boolean {
    const lowerText = text.toLowerCase();
    
    switch (query.type) {
      case 'TERM':
        // Simple substring match for terms
        return lowerText.includes(query.value!.toLowerCase());
        
      case 'PHRASE':
        return lowerText.includes(query.value!.toLowerCase());
        
      case 'AND':
        return this.evaluate(query.left!, text) && this.evaluate(query.right!, text);
        
      case 'OR':
        return this.evaluate(query.left!, text) || this.evaluate(query.right!, text);
        
      case 'NOT':
        return !this.evaluate(query.child!, text);
        
      default:
        return false;
    }
  }

  // Extract all positive terms for scoring
  extractTerms(query: BooleanQuery, terms: string[] = []): string[] {
    switch (query.type) {
      case 'TERM':
      case 'PHRASE':
        if (query.value) terms.push(query.value);
        break;
        
      case 'AND':
      case 'OR':
        if (query.left) this.extractTerms(query.left, terms);
        if (query.right) this.extractTerms(query.right, terms);
        break;
        
      case 'NOT':
        // Don't include NOT terms in scoring
        break;
    }
    
    return terms;
  }
}