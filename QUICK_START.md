# 🚀 ObsiCard - Quick Start Guide

## ⚡ Installation

### Option 1: From GitHub Release (Recommended)
```bash
# 1. Download latest release
# Go to: https://github.com/aerkn1/ObsiCard/releases

# 2. Extract to your vault
cd /path/to/your/vault/.obsidian/plugins/
unzip obsicard-1.0.0.zip

# 3. Enable in Obsidian
# Settings → Community Plugins → Enable ObsiCard
```

### Option 2: Development Installation
```bash
# 1. Clone repository
git clone https://github.com/aerkn1/ObsiCard.git
cd obsicard

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Copy to your vault
cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/obsicard/

# 5. Enable in Obsidian
```

## 🔑 Configuration (5 minutes)

### Step 1: Get Groq API Key
1. Visit: https://console.groq.com
2. Sign up (free)
3. Create API key
4. Copy key

### Step 2: Configure Plugin
1. Open Obsidian Settings
2. Go to ObsiCard settings
3. Paste Groq API key
4. Click "Test Connection" ✅
5. Done!

### Step 3: Set Up Anki (Optional)
1. Install Anki Desktop: https://apps.ankiweb.net
2. Open Anki → Tools → Add-ons → Get Add-ons
3. Enter code: `2055492159`
4. Restart Anki
5. Keep Anki running in background
6. In ObsiCard settings, click "Test Connection" ✅

## 🎯 First Flashcard

### Method 1: From Selection
```
1. Select text in your note:
   "The mitochondria is the powerhouse of the cell"

2. Right-click → "Generate Flashcards with ObsiCard"

3. Choose mode:
   - Dynamic: AI suggests tags ✨
   - Fixed: Use your tags 🏷️

4. Review flashcards:
   [✓] What is the mitochondria?
       A: The powerhouse of the cell

5. Click "Approve & Save" ✅

6. Done! Flashcard saved to note and synced to Anki
```

### Method 2: From Full Note
```
1. Open any note

2. Click brain icon 🧠 in ribbon (or use command palette)

3. Choose mode and tags

4. Review generated flashcards

5. Select ones you want to keep

6. Approve and save ✅
```

## 📝 Usage Examples

### Example 1: Study Notes
```markdown
# Biology Notes

Photosynthesis is the process by which plants convert 
light energy into chemical energy. It occurs in chloroplasts
and produces glucose and oxygen.

## Flashcards

---

**Q:** What is photosynthesis?

**A:** The process by which plants convert light energy into 
chemical energy, occurring in chloroplasts.

*Tags:* #biology #science
*Created:* 2025-10-19

---
```

### Example 2: Programming Concepts
```markdown
# JavaScript Array Methods

The map() method creates a new array by applying a function 
to each element of the original array.

## Flashcards

---

**Q:** What does the JavaScript map() method do?

**A:** Creates a new array by applying a function to each 
element of the original array.

*Tags:* #javascript #programming
*Created:* 2025-10-19

---
```

## ⚙️ Key Settings

### Recommended Settings
```
Groq API Key: [your-key]
Groq Model: Mixtral 8x7B ⭐
Anki Deck: ObsiCard
Auto-sync to Anki: ✅ Enabled
Max Chunk Size: 3500 tokens
Max Parallel Requests: 3
Offline Queue: ✅ Enabled
Default Tags: obsidian, review
```

### Advanced Settings
```
Max Chunk Size: 3500 (1000-8000)
  - Larger = fewer API calls, but slower
  - Smaller = more API calls, but faster

Max Parallel Requests: 3 (1-5)
  - More = faster, but higher rate limit risk
  - Fewer = slower, but more reliable

Max Retries: 3 (0-10)
  - How many times to retry failed Anki syncs
```

## 🎨 Commands

### Available Commands
```
Command Palette (Ctrl/Cmd + P):

1. Generate Flashcards from Selection
   → Create from highlighted text

2. Generate Flashcards from Current Note
   → Create from entire note

3. Process Anki Sync Queue
   → Retry failed syncs

4. View Sync Queue Status
   → Check queued cards

5. Test API Connections
   → Verify Groq and Anki
```

### Keyboard Shortcuts
```
You can assign custom shortcuts in:
Settings → Hotkeys → Search "ObsiCard"
```

## 🔧 Troubleshooting

### Groq API Issues
```
❌ "Failed to connect to Groq API"

✅ Solutions:
1. Check API key is correct
2. Verify internet connection
3. Check Groq service status
4. Try different model
```

### Anki Issues
```
❌ "AnkiConnect not available"

✅ Solutions:
1. Make sure Anki is running
2. Install AnkiConnect add-on (2055492159)
3. Check URL: http://127.0.0.1:8765
4. Restart Anki
5. Check firewall settings
```

### No Flashcards Generated
```
❌ "No flashcards generated"

✅ Solutions:
1. Ensure content has enough information
2. Try shorter content first
3. Check console for errors (Ctrl+Shift+I)
4. Verify API key and model
```

### Offline Queue
```
If Anki is offline, flashcards are queued.

To process queue:
1. Start Anki
2. Run "Process Anki Sync Queue" command
3. Or wait for automatic processing (every 5 min)
```

## 📊 Best Practices

### Content Selection
```
✅ Good:
- Clear, factual information
- 100-500 words per chunk
- Well-structured notes
- Specific topics

❌ Avoid:
- Very short snippets (<50 words)
- Very long notes (>10k words)
- Unclear or ambiguous content
```

### Tag Strategy
```
✅ Good tags:
- Specific: "mitosis" not "biology"
- Consistent: Always use same tag
- Hierarchical: "biology::cell-biology"

✅ Tag modes:
- Dynamic: Good for new topics
- Fixed: Good for consistent organization
```

### Review Strategy
```
1. Always review AI-generated cards
2. Edit unclear questions
3. Add examples to answers
4. Remove duplicates
5. Keep tags consistent
```

## 🎓 Tips & Tricks

### Tip 1: Chunk Large Notes
```
Instead of generating from entire 5000-word note:
1. Split into sections
2. Generate from each section
3. More accurate flashcards
```

### Tip 2: Use Templates
```
Create note templates with common tags:
---
tags: [your-subject, important]
---

Then use Fixed mode with these tags
```

### Tip 3: Batch Processing
```
1. Collect all notes you want to process
2. Generate flashcards for each
3. Review all at once
4. Bulk approve
```

### Tip 4: Custom Decks
```
Create specific Anki decks:
- "ObsiCard-Biology"
- "ObsiCard-Programming"
- "ObsiCard-Exam"

Change deck in settings before generating
```

## 📈 Next Steps

### Week 1
- [ ] Install and configure
- [ ] Generate first 10 flashcards
- [ ] Test Anki sync
- [ ] Learn commands

### Week 2
- [ ] Try both Dynamic and Fixed modes
- [ ] Customize default tags
- [ ] Set up custom keyboard shortcuts
- [ ] Explore settings

### Week 3
- [ ] Process larger notes
- [ ] Organize flashcards by deck
- [ ] Review and edit cards
- [ ] Start studying in Anki

### Ongoing
- [ ] Generate cards regularly
- [ ] Review in Anki daily
- [ ] Adjust settings as needed
- [ ] Share feedback

## 🆘 Get Help

### Resources
- 📖 Full docs: README.md
- 🐛 Report issues: GitHub Issues
- 💬 Ask questions: GitHub Discussions
- 📚 Wiki: GitHub Wiki

### Community
- Share your workflows
- Contribute improvements
- Help other users
- Request features

## ⭐ Rate & Review

If you find ObsiCard useful:
- ⭐ Star on GitHub
- 📝 Leave a review
- 🐦 Share on social media
- 🤝 Contribute to development

---

**Happy studying! 🎓✨**

Questions? Open an issue on GitHub!

