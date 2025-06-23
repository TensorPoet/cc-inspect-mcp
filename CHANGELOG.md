# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-23

### Added
- Initial release of CC Inspect MCP
- Three core search functions: `searchMessages`, `searchProjects`, `getActivitySummary`
- Boolean search support with AND, OR, NOT operators
- Parentheses grouping for complex queries
- Phrase search with quoted strings
- Time-based filtering for all search functions
- Session navigation with index-based retrieval
- Pagination support for large result sets
- TypeScript implementation with full type safety
- Comprehensive test suite
- MCP protocol compliance

### Security
- Path validation to prevent directory traversal
- Input sanitization for search queries
- Configurable logging to prevent sensitive data exposure

[1.0.0]: https://github.com/TensorPoet/cc-inspect-mcp/releases/tag/v1.0.0