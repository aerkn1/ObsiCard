# Contributing to ObsiCard

Thank you for your interest in contributing to ObsiCard! This document provides guidelines and instructions for contributing.

## 🤝 Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git
- Obsidian Desktop (for testing)
- Anki Desktop + AnkiConnect (optional, for integration testing)

### Setting Up Development Environment

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/aerkn1/ObsiCard.git
   cd obsicard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a test vault**
   ```bash
   # Create an Obsidian vault for testing
   mkdir test-vault
   ```

4. **Link plugin to test vault**
   ```bash
   mkdir -p test-vault/.obsidian/plugins/obsicard
   ln -s $(pwd) test-vault/.obsidian/plugins/obsicard
   ```

5. **Start development mode**
   ```bash
   npm run dev
   ```

6. **Enable plugin in Obsidian**
   - Open the test vault in Obsidian
   - Go to Settings → Community Plugins
   - Enable ObsiCard

## 🏗️ Project Structure

```
obsicard/
├── src/
│   ├── services/        # Core services (Groq, Anki, Validator, etc.)
│   ├── ui/              # UI components (Modals, Settings)
│   ├── utils/           # Utility functions
│   └── types.ts         # TypeScript type definitions
├── tests/
│   ├── mocks/           # Mock data and implementations
│   ├── services/        # Service tests
│   ├── utils/           # Utility tests
│   └── integration/     # Integration tests
├── main.ts              # Plugin entry point
├── manifest.json        # Plugin manifest
├── package.json         # Dependencies and scripts
└── vite.config.ts       # Build configuration
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Writing Tests

- Place unit tests next to the code they test or in `tests/` directory
- Use descriptive test names: `should validate correct flashcard`
- Mock external dependencies (Groq API, AnkiConnect, Obsidian API)
- Aim for ≥90% code coverage

Example test:
```typescript
import { describe, it, expect } from 'vitest';
import { Validator } from '../src/services/Validator';

describe('Validator', () => {
  it('should validate correct flashcard', () => {
    const card = {
      front: 'Question',
      back: 'Answer',
      tags: ['test']
    };
    
    const result = Validator.validateFlashcard(card);
    expect(result.isValid).toBe(true);
  });
});
```

## 📝 Coding Standards

### TypeScript

- Use TypeScript for all code
- Enable strict type checking
- Avoid `any` type when possible
- Document public APIs with JSDoc comments

### Code Style

- Follow existing code style
- Use ESLint for linting: `npm run lint`
- Format with Prettier (if configured)
- Maximum line length: 100 characters
- Use meaningful variable and function names

### Git Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for custom deck selection
fix: resolve duplicate flashcard issue
docs: update installation instructions
test: add tests for TokenUtils
refactor: simplify validation logic
perf: optimize chunking algorithm
```

## 🔄 Pull Request Process

### Before Submitting

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write tests**
   - Add tests for new features
   - Update tests for changed features
   - Ensure all tests pass

3. **Update documentation**
   - Update README.md if needed
   - Add JSDoc comments to public APIs
   - Update CHANGELOG.md

4. **Lint your code**
   ```bash
   npm run lint
   npm run lint:fix  # Auto-fix issues
   ```

5. **Test in Obsidian**
   - Build the plugin: `npm run build`
   - Test in your test vault
   - Verify no console errors

### Submitting Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Go to GitHub and create a Pull Request
   - Use a clear, descriptive title
   - Fill out the PR template completely
   - Link related issues

3. **PR Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Tests added/updated
   - [ ] All tests pass
   - [ ] Tested in Obsidian

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No new warnings
   ```

### Review Process

- Maintainers will review your PR
- Address feedback and push updates
- Once approved, your PR will be merged
- Your contribution will be credited in CHANGELOG.md

## 🐛 Reporting Bugs

### Before Reporting

1. Check [existing issues](https://github.com/aerkn1/ObsiCard/issues)
2. Verify you're using the latest version
3. Test in a clean vault with minimal plugins

### Bug Report Template

```markdown
**Description**
Clear description of the bug

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Screenshots**
If applicable

**Environment**
- Obsidian version:
- ObsiCard version:
- OS:

**Additional Context**
Any other relevant information
```

## 💡 Feature Requests

We welcome feature requests! Please:

1. Check if feature already requested
2. Describe the feature clearly
3. Explain the use case
4. Propose implementation if possible

## 🎨 UI/UX Guidelines

- Follow Obsidian's design language
- Use CSS variables for theming
- Support both light and dark modes
- Ensure accessibility (keyboard navigation, screen readers)
- Keep modals responsive and user-friendly

## 📚 Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update wiki for complex features
- Include code examples where helpful

## 🔐 Security

- Never commit API keys or secrets
- Report security vulnerabilities privately via GitHub Security Advisories
- Follow secure coding practices
- Validate and sanitize all user input

## 📦 Release Process

(For maintainers)

1. Update version in `manifest.json` and `package.json`
2. Update CHANGELOG.md
3. Create release commit: `chore: release v1.x.x`
4. Tag release: `git tag v1.x.x`
5. Push: `git push origin main --tags`
6. GitHub Actions will build and create release

## 🙏 Recognition

Contributors will be:
- Listed in CHANGELOG.md
- Credited in release notes
- Added to GitHub contributors list

## 📞 Getting Help

- **Questions**: [GitHub Discussions](https://github.com/aerkn1/ObsiCard/discussions)
- **Issues**: [GitHub Issues](https://github.com/aerkn1/ObsiCard/issues)
- **Chat**: (Add Discord/Slack if available)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ObsiCard! 🎉

