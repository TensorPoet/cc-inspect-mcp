import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BooleanQueryParser, BooleanQueryEvaluator } from '../dist/booleanParser.js';

describe('BooleanQueryParser', () => {
  const parser = new BooleanQueryParser();
  const evaluator = new BooleanQueryEvaluator();

  describe('Simple term parsing', () => {
    it('should parse single terms', () => {
      const query = parser.parse('install');
      assert.equal(query.type, 'TERM');
      assert.equal(query.value, 'install');
    });

    it('should parse quoted phrases', () => {
      const query = parser.parse('"pip install"');
      assert.equal(query.type, 'PHRASE');
      assert.equal(query.value, 'pip install');
    });
  });

  describe('Boolean operators', () => {
    it('should parse AND operations', () => {
      const query = parser.parse('install AND npm');
      assert.equal(query.type, 'AND');
      assert.equal(query.left.value, 'install');
      assert.equal(query.right.value, 'npm');
    });

    it('should parse OR operations', () => {
      const query = parser.parse('install OR setup');
      assert.equal(query.type, 'OR');
      assert.equal(query.left.value, 'install');
      assert.equal(query.right.value, 'setup');
    });

    it('should parse NOT operations', () => {
      const query = parser.parse('NOT npm');
      assert.equal(query.type, 'NOT');
      assert.equal(query.child.value, 'npm');
    });

    it('should parse minus prefix as NOT', () => {
      const query = parser.parse('-npm');
      assert.equal(query.type, 'NOT');
      assert.equal(query.child.value, 'npm');
    });

    it('should handle implicit AND', () => {
      const query = parser.parse('install npm');
      assert.equal(query.type, 'AND');
      assert.equal(query.left.value, 'install');
      assert.equal(query.right.value, 'npm');
    });
  });

  describe('Complex queries with parentheses', () => {
    it('should parse grouped OR with AND', () => {
      const query = parser.parse('(install OR setup) AND python');
      assert.equal(query.type, 'AND');
      assert.equal(query.left.type, 'OR');
      assert.equal(query.right.value, 'python');
    });

    it('should parse nested parentheses', () => {
      const query = parser.parse('((error OR bug) AND (pip OR npm)) NOT yarn');
      assert.equal(query.type, 'AND');
      assert.equal(query.left.type, 'AND');
      assert.equal(query.left.left.type, 'OR');
      assert.equal(query.right.type, 'NOT');
    });
  });

  describe('Evaluation', () => {
    it('should match simple terms', () => {
      const query = parser.parse('install');
      assert.equal(evaluator.evaluate(query, 'how to install npm'), true);
      assert.equal(evaluator.evaluate(query, 'setup guide'), false);
    });

    it('should match phrases exactly', () => {
      const query = parser.parse('"pip install"');
      assert.equal(evaluator.evaluate(query, 'run pip install numpy'), true);
      assert.equal(evaluator.evaluate(query, 'pip and install separately'), false);
    });

    it('should evaluate AND correctly', () => {
      const query = parser.parse('python AND install');
      assert.equal(evaluator.evaluate(query, 'python install guide'), true);
      assert.equal(evaluator.evaluate(query, 'python setup'), false);
      assert.equal(evaluator.evaluate(query, 'install nodejs'), false);
    });

    it('should evaluate OR correctly', () => {
      const query = parser.parse('python OR javascript');
      assert.equal(evaluator.evaluate(query, 'python tutorial'), true);
      assert.equal(evaluator.evaluate(query, 'javascript guide'), true);
      assert.equal(evaluator.evaluate(query, 'ruby programming'), false);
    });

    it('should evaluate NOT correctly', () => {
      const query = parser.parse('install NOT npm');
      assert.equal(evaluator.evaluate(query, 'install python'), true);
      assert.equal(evaluator.evaluate(query, 'install npm package'), false);
    });

    it('should evaluate complex queries', () => {
      const query = parser.parse('(error OR bug) AND (pip OR python)');
      assert.equal(evaluator.evaluate(query, 'pip install error'), true);
      assert.equal(evaluator.evaluate(query, 'python bug fix'), true);
      assert.equal(evaluator.evaluate(query, 'npm error'), false);
      assert.equal(evaluator.evaluate(query, 'setup python'), false);
    });
  });

  describe('Term extraction', () => {
    it('should extract all positive terms', () => {
      const query = parser.parse('(python OR javascript) AND tutorial NOT video');
      const terms = evaluator.extractTerms(query);
      assert.deepEqual(terms.sort(), ['javascript', 'python', 'tutorial'].sort());
    });
  });
});