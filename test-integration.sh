#!/bin/bash

echo "Testing Claude Code Search MCP Integration"
echo "=========================================="
echo

# Test 1: Simple boolean search
echo "Test 1: Boolean AND search"
echo "Query: 'mcp AND install'"
echo
echo "Running: claude -p 'Use claude-code-search to find messages containing mcp AND install. Show me just the count.'"
claude -p 'Use claude-code-search to find messages containing mcp AND install. Show me just the count.' --max-tokens 200

echo
echo "---"
echo

# Test 2: OR search
echo "Test 2: Boolean OR search"
echo "Query: 'perplexity OR anthropic'"
echo
echo "Running: claude -p 'Use claude-code-search to search for perplexity OR anthropic. How many results?'"
claude -p 'Use claude-code-search to search for perplexity OR anthropic. How many results?' --max-tokens 200

echo
echo "---"
echo

# Test 3: Complex boolean
echo "Test 3: Complex boolean with parentheses"
echo "Query: '(error OR bug) AND pip'"
echo
echo "Running: claude -p 'Use claude-code-search with query (error OR bug) AND pip. How many matches?'"
claude -p 'Use claude-code-search with query (error OR bug) AND pip. How many matches?' --max-tokens 200

echo
echo "=========================================="
echo "Integration test complete!"