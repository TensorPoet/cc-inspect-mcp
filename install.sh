#!/bin/bash

echo "CC Inspect MCP - Installation Script"
echo "===================================="

# Get the absolute path of the MCP server
MCP_PATH="$(cd "$(dirname "$0")" && pwd)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

# Check if claude is installed
if ! command -v claude &> /dev/null; then
    echo "❌ Claude Code CLI is not installed."
    echo "   Install it from: https://claude.ai/code"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the TypeScript code
echo "🔨 Building TypeScript..."
npm run build

# Check if already installed
if claude mcp list | grep -q "cc-inspect"; then
    echo "⚠️  cc-inspect MCP server is already installed."
    echo "   To reinstall, first run: claude mcp remove -s user cc-inspect"
else
    # Add the MCP server using Claude Code CLI
    echo "🔗 Adding MCP server to Claude Code..."
    claude mcp add -s user cc-inspect node "$MCP_PATH/dist/index.js"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added MCP server!"
    else
        echo "❌ Failed to add MCP server. Please try manually:"
        echo "   claude mcp add -s user cc-inspect node $MCP_PATH/dist/index.js"
        exit 1
    fi
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "📍 MCP Server location: $MCP_PATH/dist/index.js"
echo ""
echo "🔍 Verify installation:"
echo "   claude mcp list"
echo ""
echo "🚀 CC Inspect is now available in Claude Code!"
echo "   Use it with: use_mcp_tool(\"cc-inspect\", ...)"
echo ""
echo "📖 See README.md for usage examples."