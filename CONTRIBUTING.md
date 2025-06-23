# Contributing to CC Inspect MCP

Thank you for your interest in contributing to CC Inspect MCP! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to be respectful and constructive in all interactions.

## How to Contribute

### Reporting Issues

1. Check if the issue already exists
2. Include steps to reproduce
3. Include error messages and logs
4. Specify your environment (OS, Node.js version, Claude Code version)

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit with clear messages (`git commit -m 'Add amazing feature'`)
7. Push to your fork (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Claude Code CLI installed
- TypeScript knowledge

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/TensorPoet/cc-inspect-mcp.git
cd cc-inspect-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Run tests:
```bash
npm test
```

5. Watch mode for development:
```bash
npm run dev
```

### Testing with Claude Code

1. Link the development version:
```bash
claude mcp add -s user cc-inspect-dev node $(pwd)/dist/index.js
```

2. Test your changes:
```bash
claude -p "Use cc-inspect-dev to test my changes"
```

3. Remove when done:
```bash
claude mcp remove cc-inspect-dev
```

## Code Style

- Use TypeScript for all source files
- Follow existing code formatting
- Add JSDoc comments for public APIs
- Keep functions focused and small
- Use meaningful variable names

## Testing Guidelines

- Write tests for new features
- Include edge cases in tests
- Maintain test coverage above 80%
- Use descriptive test names
- Mock external dependencies

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Include examples for new features
- Update CHANGELOG.md

## Commit Messages

Follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Maintenance tasks

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a PR with version bump
4. After merge, tag the release
5. GitHub Actions will publish to npm

## Questions?

Feel free to open an issue for questions or join the discussion in existing issues.