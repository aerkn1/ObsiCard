# Changelog

All notable changes to ObsiCard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Future features will be listed here

## [1.1.0] - 2025-11-05

### Changed
- Replaced `fetch` API with Obsidian's `requestUrl` for better compatibility
- Replaced `localStorage` with Obsidian's `App.loadLocalStorage`/`saveLocalStorage` API
- Replaced browser `confirm()` with Obsidian modal dialog
- All inline styles moved to CSS classes for better theme compatibility
- All UI text converted to sentence case following Obsidian conventions
- Settings headings now use `Setting.setHeading()` for consistency

### Fixed
- Fixed promise handling in async callbacks (added `void` operator)
- Fixed Anki sync status reporting to accurately reflect synced/queued/failed states
- Fixed toast notification spam - now shows single comprehensive result message
- Fixed drag handles visibility in review modal
- Removed all unnecessary type casting (`any` → proper types)
- Fixed TypeScript compilation errors in test files

### Improved
- Enhanced error messages in Groq API connection testing
- Better queue status tracking with detailed sync/queue/error counts
- Improved code quality and type safety throughout
- All ObsidianReviewBot feedback addressed

### Technical
- Updated `AnkiSyncService` to accept `App` instance for proper localStorage access
- Improved CSS organization and theme compatibility
- Enhanced test coverage and type safety

## [1.0.0] - 2025-10-19

### Added
- 🧠 AI-powered flashcard generation using Groq API
- 📝 Interactive review modal for flashcard approval
- 🏷️ Dynamic and fixed tag generation modes
- 💾 Automatic saving to `## Flashcards` section in notes
- 🔄 Real-time Anki Desktop synchronization via AnkiConnect
- 📡 Offline queue system with automatic retry
- ✅ Comprehensive validation and repair pipeline
- ⚡ Smart text chunking for large notes (>10k tokens)
- 🤖 Automatic summarization for very large content
- 🎯 Context menu integration (right-click to generate)
- 🎨 Ribbon icon for quick access
- ⚙️ Comprehensive settings panel
- 🧪 Full test suite with 90%+ coverage

### Features

#### Core Functionality
- Generate flashcards from selected text
- Generate flashcards from entire notes
- Edit flashcards before saving
- Batch selection of flashcards to keep
- Source note tracking in flashcards

#### AI Integration
- Groq API integration with multiple model support:
  - Llama 3.1 8B Instant (default, fastest)
  - Llama 3.1 70B Versatile (higher quality)
  - Mixtral 8x7B (balanced)
  - Gemma 2 9B (alternative)
  - Any other Groq model via custom configuration
- Token-based chunking (max 3500 tokens per chunk)
- Parallel processing (up to 3 concurrent requests)
- Automatic content summarization for large notes
- Intelligent tag suggestion in dynamic mode

#### Anki Integration
- One-click sync to Anki Desktop
- Custom deck name configuration
- Automatic deck creation
- Duplicate detection
- Offline queue with retry mechanism
- Queue management commands
- Connection testing

#### User Interface
- Pre-generation modal (mode and tag selection)
- Review modal with card editing
- Settings tab with connection testing
- Progress notifications
- Error handling and user feedback
- Dark/light theme support

#### Commands
- Generate Flashcards from Selection
- Generate Flashcards from Current Note
- Process Anki Sync Queue
- View Sync Queue Status
- Test API Connections

#### Validation & Security
- Schema validation for all flashcards
- Automatic repair of malformed cards
- Content sanitization (XSS prevention)
- API key encryption in settings
- No telemetry or data collection

#### Developer Features
- Vite-based build system
- TypeScript with strict mode
- Comprehensive test suite (Vitest)
- ESLint configuration
- Mock-based testing
- CI/CD ready (GitHub Actions)

### Technical Details
- **Build System**: Vite 5.0
- **Language**: TypeScript 5.3
- **Testing**: Vitest 1.1
- **AI Provider**: Groq API (default: Llama 3.1 8B Instant)
- **Sync**: AnkiConnect (Anki Desktop integration)
- **Min Obsidian Version**: 1.5.0
- **Platform**: Desktop only

### Known Limitations
- Desktop only (no mobile support due to AnkiConnect requirement)
- Requires active Groq API key
- AnkiConnect must be installed for Anki sync
- Maximum context window: ~16k tokens per Groq request

---

## Release Notes

### Version 1.0.0 - Stable Release

This is the first stable release of ObsiCard! 🎉

**Highlights:**
- Production-ready AI flashcard generation
- Robust Anki integration with offline support
- Comprehensive test coverage
- Full documentation

**First Release:**
This is the initial stable release of ObsiCard.

**Getting Started:**
1. Install from Obsidian Community Plugins or GitHub Releases
2. Configure Groq API key in settings
3. Install Anki + AnkiConnect (optional)
4. Start generating flashcards!

**Support:**
- Report issues: [GitHub Issues](https://github.com/aerkn1/ObsiCard/issues)
- Ask questions: [GitHub Discussions](https://github.com/aerkn1/ObsiCard/discussions)
- Contribute: See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Future Roadmap

### Planned Features
- [ ] Mobile support (if AnkiWeb API becomes available)
- [ ] Custom flashcard templates
- [ ] Spaced repetition scheduling
- [ ] Statistics and analytics
- [ ] Multi-language support
- [ ] Additional AI provider support (OpenAI, Anthropic)
- [ ] Flashcard import/export
- [ ] Collaborative flashcard decks
- [ ] Image support in flashcards
- [ ] Audio flashcards

### Under Consideration
- Integration with other spaced repetition apps
- Built-in spaced repetition system
- Flashcard sharing community
- Browser extension for web content

---

[Unreleased]: https://github.com/aerkn1/ObsiCard/compare/1.1.0...HEAD
[1.1.0]: https://github.com/aerkn1/ObsiCard/releases/tag/1.1.0
[1.0.0]: https://github.com/aerkn1/ObsiCard/releases/tag/1.0.0

