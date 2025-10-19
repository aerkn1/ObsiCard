# 🧠 ObsiCard – AI-Powered Flashcard Generator

**ObsiCard** intelligently turns your Obsidian notes into structured flashcards powered by Groq AI. Each approved flashcard is stored inside the same note and synced instantly with your Anki Desktop deck.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/v/release/aerkn1/ObsiCard)](https://github.com/aerkn1/ObsiCard/releases)

## ✨ Features

- **🧠 AI Flashcard Generation** - Powered by Groq API for intelligent flashcard creation
- **📝 Review & Approval Modal** - Review and edit flashcards before saving
- **🏷️ Smart Tag Recommendations** - Dynamic or fixed tag modes
- **💾 Auto-Save to Notes** - Flashcards stored under `## Flashcards` section
- **🔄 Real-Time Anki Sync** - Seamless integration with Anki Desktop via AnkiConnect
- **📡 Offline Queue** - Automatic retry system for failed syncs
- **✅ Full Validation** - Schema validation and repair pipeline
- **⚡ Smart Chunking** - Handles large notes with intelligent summarization
- **🎯 Context Menu Integration** - Right-click to generate flashcards

## 🚀 Quick Start

1. **Install the Plugin**
   - Download the latest release from [GitHub Releases](https://github.com/aerkn1/ObsiCard/releases)
   - Extract to your Obsidian vault's `.obsidian/plugins/obsicard` folder
   - Enable in Obsidian Settings → Community Plugins

2. **Configure API Keys**
   - Get a free Groq API key from [https://console.groq.com](https://console.groq.com)
   - Add your API key in ObsiCard Settings

3. **Set Up Anki (Optional)**
   - Install [Anki Desktop](https://apps.ankiweb.net/)
   - Install [AnkiConnect add-on](https://ankiweb.net/shared/info/2055492159) (ID: 2055492159)
   - Keep Anki running in the background

4. **Generate Flashcards**
   - Highlight text or open a note
   - Right-click → "Generate Flashcards with ObsiCard"
   - Choose mode and tags
   - Review and approve flashcards
   - Done! Flashcards are saved and synced

## ⚙️ Requirements

- **Obsidian Desktop** v1.5.0 or higher
- **Groq API Key** (free at [console.groq.com](https://console.groq.com))
- **Anki Desktop** + AnkiConnect (optional, for syncing)

## 🎮 Usage

### Generate from Selection
1. Select text in your note
2. Right-click → "Generate Flashcards with ObsiCard"
3. Choose Dynamic (AI tags) or Fixed (your tags) mode
4. Review generated flashcards
5. Edit, select, and approve

### Generate from Entire Note
1. Open any note
2. Click the brain icon in the ribbon, or
3. Use Command Palette → "Generate Flashcards from Current Note"

### Review Flashcards
- Each flashcard shows Front, Back, and Tags
- Click checkboxes to select/deselect
- Click "Edit" to modify any flashcard
- Click "Approve & Save" to save selected cards

### Anki Sync
- If Anki is running: flashcards sync immediately
- If Anki is offline: flashcards are queued
- Use "Process Anki Sync Queue" command to retry

## 📋 Commands

| Command | Description |
|---------|-------------|
| Generate Flashcards from Selection | Create flashcards from selected text |
| Generate Flashcards from Current Note | Create flashcards from entire note |
| Process Anki Sync Queue | Retry queued flashcards |
| View Sync Queue Status | Check how many flashcards are queued |
| Test API Connections | Verify Groq and Anki connectivity |

## ⚙️ Settings

### Groq API Configuration
- **API Key** - Your Groq API key
- **Model** - Choose from Mixtral, Llama 3, or Gemma 2
- **Test Connection** - Verify API access

### Anki Integration
- **AnkiConnect URL** - Default: `http://127.0.0.1:8765`
- **Deck Name** - Target Anki deck (default: "ObsiCard")
- **Auto-sync** - Enable/disable automatic Anki syncing

### Advanced Settings
- **Max Chunk Size** - Token limit per chunk (default: 3500)
- **Max Parallel Requests** - Concurrent API calls (1-5)
- **Enable Offline Queue** - Queue flashcards when Anki is offline
- **Max Retries** - Retry attempts for failed syncs
- **Default Tags** - Tags applied to all flashcards

## 🧩 How It Works

```
┌─────────────────┐
│  Select Text    │
│  or Full Note   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Pre-Generation  │
│ Modal (Mode +   │
│ Tags Selection) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Groq API Call  │
│  • Chunking     │
│  • Generation   │
│  • Validation   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Review Modal   │
│  (Edit/Select)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Save to Note    │
│ (## Flashcards) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sync to Anki   │
│  (or Queue)     │
└─────────────────┘
```

## 🔒 Privacy

- **No Data Collection** - ObsiCard never stores or shares your notes
- **Direct API Calls** - Your content is sent directly to Groq (secured by your API key)
- **Local Storage** - All settings and queued flashcards stored locally

## 🧩 Open Source

Released under the **MIT License**. You can use, modify, and distribute freely with attribution.

### 🛠️ Development

```bash
# Clone repository
git clone https://github.com/aerkn1/ObsiCard.git
cd obsicard

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint
```

### 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/aerkn1/ObsiCard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/aerkn1/ObsiCard/discussions)
- **Documentation**: [Wiki](https://github.com/aerkn1/ObsiCard/wiki)

## 📚 Resources

- [Groq Console](https://console.groq.com) - Get your free API key
- [AnkiConnect](https://ankiweb.net/shared/info/2055492159) - Anki integration add-on
- [Obsidian Plugin Development](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## 🙏 Acknowledgments

- Powered by [Groq](https://groq.com) for fast AI inference
- Inspired by the Obsidian and Anki communities
- Built with [Vite](https://vitejs.dev) and [TypeScript](https://www.typescriptlang.org)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ by [Arda Erkan](https://github.com/your-username)**

If you find ObsiCard useful, consider ⭐ starring the repository!
