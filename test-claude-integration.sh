#!/bin/bash

echo "Testing Claude Code Search MCP Integration"
echo "=========================================="
echo ""

# Test 1: Search for recent projects
echo "Test 1: What projects did I work on recently?"
echo "---------------------------------------------"
echo 'Use the claude-code-search MCP tool to call searchProjects with sortBy "recent" and limit 5' | claude -p
echo ""

# Test 2: Search for specific content
echo "Test 2: Search for messages about 'install'"
echo "-------------------------------------------"
echo 'Use the claude-code-search MCP tool to call searchMessages with query "install" and limit 3' | claude -p
echo ""

# Test 3: Get yesterday's activity
echo "Test 3: What did I work on yesterday?"
echo "-------------------------------------"
YESTERDAY=$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d "yesterday" +%Y-%m-%d)
echo "Use the claude-code-search MCP tool to call getActivitySummary for $YESTERDAY (from 00:00:00Z to 23:59:59Z) grouped by project" | claude -p
echo ""

echo "✅ Integration test complete!"
echo ""
echo "Note: You may need to approve MCP access when prompted by Claude."