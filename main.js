"use strict";
const obsidian = require("obsidian");
var GenerationMode = /* @__PURE__ */ ((GenerationMode2) => {
  GenerationMode2["DYNAMIC"] = "dynamic";
  GenerationMode2["FIXED"] = "fixed";
  return GenerationMode2;
})(GenerationMode || {});
const DEFAULT_SETTINGS = {
  groqApiKey: "",
  groqModel: "llama-3.1-8b-instant",
  ankiConnectUrl: "http://127.0.0.1:8765",
  ankiDeckName: "ObsiCard",
  maxChunkSize: 3500,
  maxParallelRequests: 3,
  enableOfflineQueue: true,
  maxRetries: 3,
  defaultTags: ["obsidian"],
  autoSyncToAnki: true
};
const _TokenUtils = class _TokenUtils {
  /**
   * Estimate token count for a given text
   * @param text - Text to count tokens for
   * @returns Estimated token count
   */
  static countTokens(text) {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }
  /**
   * Split text into chunks based on token limit
   * @param text - Text to chunk
   * @param maxChunkSize - Maximum tokens per chunk
   * @returns Chunking result with metadata
   */
  static chunkText(text, maxChunkSize) {
    const totalTokens = this.countTokens(text);
    if (totalTokens <= maxChunkSize) {
      return {
        chunks: [{
          content: text,
          tokenCount: totalTokens,
          index: 0
        }],
        totalTokens,
        requiresSummarization: false
      };
    }
    const paragraphs = text.split(/\n\n+/);
    const chunks = [];
    let currentChunk = "";
    let currentTokenCount = 0;
    let chunkIndex = 0;
    for (const paragraph of paragraphs) {
      const paragraphTokens = this.countTokens(paragraph);
      if (paragraphTokens > maxChunkSize) {
        if (currentChunk) {
          chunks.push({
            content: currentChunk.trim(),
            tokenCount: currentTokenCount,
            index: chunkIndex++
          });
          currentChunk = "";
          currentTokenCount = 0;
        }
        const sentences = this.splitBySentences(paragraph);
        for (const sentence of sentences) {
          const sentenceTokens = this.countTokens(sentence);
          if (currentTokenCount + sentenceTokens > maxChunkSize) {
            if (currentChunk) {
              chunks.push({
                content: currentChunk.trim(),
                tokenCount: currentTokenCount,
                index: chunkIndex++
              });
            }
            currentChunk = sentence + " ";
            currentTokenCount = sentenceTokens;
          } else {
            currentChunk += sentence + " ";
            currentTokenCount += sentenceTokens;
          }
        }
      } else {
        if (currentTokenCount + paragraphTokens > maxChunkSize) {
          chunks.push({
            content: currentChunk.trim(),
            tokenCount: currentTokenCount,
            index: chunkIndex++
          });
          currentChunk = paragraph + "\n\n";
          currentTokenCount = paragraphTokens;
        } else {
          currentChunk += paragraph + "\n\n";
          currentTokenCount += paragraphTokens;
        }
      }
    }
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokenCount,
        index: chunkIndex
      });
    }
    return {
      chunks,
      totalTokens,
      requiresSummarization: totalTokens > 1e4
      // Threshold for summarization
    };
  }
  /**
   * Split text by sentences
   * @param text - Text to split
   * @returns Array of sentences
   */
  static splitBySentences(text) {
    return text.match(/[^.!?]+[.!?]+/g) || [text];
  }
  /**
   * Create a summary prompt for large texts
   * @param text - Text to summarize
   * @returns Summary prompt
   */
  static createSummaryPrompt(text) {
    return `Please provide a concise summary of the following text, focusing on key concepts and main ideas that would be useful for creating flashcards. Limit the summary to about 1000 tokens.

Text:
${text}`;
  }
  /**
   * Validate that text is within acceptable limits
   * @param text - Text to validate
   * @returns True if within limits
   */
  static isWithinLimits(text) {
    return this.countTokens(text) <= this.CONTEXT_LIMIT;
  }
  /**
   * Truncate text to specified token limit
   * @param text - Text to truncate
   * @param maxTokens - Maximum token count
   * @returns Truncated text
   */
  static truncateToTokenLimit(text, maxTokens) {
    const currentTokens = this.countTokens(text);
    if (currentTokens <= maxTokens) {
      return text;
    }
    const ratio = maxTokens / currentTokens;
    const targetLength = Math.floor(text.length * ratio);
    return text.substring(0, targetLength) + "...";
  }
};
_TokenUtils.CHARS_PER_TOKEN = 4;
_TokenUtils.CONTEXT_LIMIT = 16e3;
let TokenUtils = _TokenUtils;
class Sanitizer {
  /**
   * Sanitize flashcard text by removing dangerous content
   * @param text - Text to sanitize
   * @returns Sanitized text
   */
  static sanitizeText(text) {
    if (!text) return "";
    let sanitized = text;
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
    sanitized = sanitized.replace(/javascript:/gi, "");
    sanitized = sanitized.replace(/<!--.*?-->/gs, "");
    sanitized = sanitized.replace(/\s+/g, " ").trim();
    return sanitized;
  }
  /**
   * Escape markdown special characters
   * @param text - Text to escape
   * @returns Escaped text
   */
  static escapeMarkdown(text) {
    return text.replace(/([\\`*_{}[\]()#+\-.!])/g, "\\$1");
  }
  /**
   * Clean up AI-generated text artifacts
   * @param text - Text to clean
   * @returns Cleaned text
   */
  static cleanAIArtifacts(text) {
    let cleaned = text;
    cleaned = cleaned.replace(/^(Answer|Response|Output):\s*/i, "");
    cleaned = cleaned.replace(/^```(?:json)?\s*|\s*```$/g, "");
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    return cleaned.trim();
  }
  /**
   * Normalize tags
   * @param tags - Array of tags
   * @returns Normalized tags
   */
  static normalizeTags(tags) {
    if (!tags || !Array.isArray(tags)) return [];
    return tags.map((tag) => tag.toLowerCase().trim()).filter((tag) => tag.length > 0 && tag.length <= 50).filter((tag, index, self) => self.indexOf(tag) === index).slice(0, 10);
  }
  /**
   * Validate and clean flashcard content
   * @param front - Front of card
   * @param back - Back of card
   * @returns Object with cleaned front and back
   */
  static cleanFlashcardContent(front, back) {
    return {
      front: this.sanitizeText(this.cleanAIArtifacts(front)),
      back: this.sanitizeText(this.cleanAIArtifacts(back))
    };
  }
}
class Validator {
  /**
   * Validate a single flashcard
   * @param flashcard - Flashcard to validate
   * @returns Validation result with errors if any
   */
  static validateFlashcard(flashcard) {
    const errors = [];
    if (!flashcard || typeof flashcard !== "object") {
      errors.push("Flashcard must be an object");
      return { isValid: false, errors };
    }
    const card = flashcard;
    if (!card.front || typeof card.front !== "string") {
      errors.push('Flashcard must have a valid "front" string');
    } else if (card.front.trim().length === 0) {
      errors.push('Flashcard "front" cannot be empty');
    } else if (card.front.length > 5e3) {
      errors.push('Flashcard "front" is too long (max 5000 characters)');
    }
    if (!card.back || typeof card.back !== "string") {
      errors.push('Flashcard must have a valid "back" string');
    } else if (card.back.trim().length === 0) {
      errors.push('Flashcard "back" cannot be empty');
    } else if (card.back.length > 1e4) {
      errors.push('Flashcard "back" is too long (max 10000 characters)');
    }
    if (!card.tags || !Array.isArray(card.tags)) {
      errors.push('Flashcard must have a "tags" array');
    } else {
      for (const tag of card.tags) {
        if (typeof tag !== "string") {
          errors.push("All tags must be strings");
          break;
        }
      }
    }
    return { isValid: errors.length === 0, errors };
  }
  /**
   * Validate array of flashcards
   * @param flashcards - Array of flashcards to validate
   * @returns Validation result
   */
  static validateFlashcards(flashcards) {
    if (!Array.isArray(flashcards)) {
      return {
        isValid: false,
        errors: ["Expected an array of flashcards"],
        repaired: []
      };
    }
    if (flashcards.length === 0) {
      return {
        isValid: false,
        errors: ["Flashcard array is empty"],
        repaired: []
      };
    }
    const allErrors = [];
    let allValid = true;
    flashcards.forEach((card, index) => {
      const { isValid, errors } = this.validateFlashcard(card);
      if (!isValid) {
        allValid = false;
        allErrors.push(`Card ${index + 1}: ${errors.join(", ")}`);
      }
    });
    return {
      isValid: allValid,
      errors: allErrors,
      repaired: allValid ? flashcards : []
    };
  }
  /**
   * Attempt to repair invalid flashcards
   * @param flashcards - Array of potentially invalid flashcards
   * @returns Repaired flashcards
   */
  static repairFlashcards(flashcards) {
    if (!Array.isArray(flashcards)) {
      return [];
    }
    const repaired = [];
    for (const card of flashcards) {
      try {
        const repairedCard = this.repairFlashcard(card);
        if (repairedCard) {
          repaired.push(repairedCard);
        }
      } catch (error) {
        console.error("Failed to repair flashcard:", error);
      }
    }
    return repaired;
  }
  /**
   * Attempt to repair a single flashcard
   * @param flashcard - Potentially invalid flashcard
   * @returns Repaired flashcard or null if cannot be repaired
   */
  static repairFlashcard(flashcard) {
    if (!flashcard || typeof flashcard !== "object") {
      return null;
    }
    const card = flashcard;
    let front = "";
    if (typeof card.front === "string") {
      front = card.front;
    } else if (card.question && typeof card.question === "string") {
      front = card.question;
    } else if (card.prompt && typeof card.prompt === "string") {
      front = card.prompt;
    }
    let back = "";
    if (typeof card.back === "string") {
      back = card.back;
    } else if (card.answer && typeof card.answer === "string") {
      back = card.answer;
    } else if (card.response && typeof card.response === "string") {
      back = card.response;
    }
    const cleaned = Sanitizer.cleanFlashcardContent(front, back);
    front = cleaned.front;
    back = cleaned.back;
    if (!front || !back || front.length === 0 || back.length === 0) {
      return null;
    }
    if (front.length > 5e3) {
      front = front.substring(0, 4997) + "...";
    }
    if (back.length > 1e4) {
      back = back.substring(0, 9997) + "...";
    }
    let tags = [];
    if (Array.isArray(card.tags)) {
      tags = card.tags.filter((t) => typeof t === "string").map((t) => String(t));
    }
    tags = Sanitizer.normalizeTags(tags);
    if (tags.length === 0) {
      tags = ["obsidian"];
    }
    const source = typeof card.source === "string" ? card.source : void 0;
    return {
      front,
      back,
      tags,
      source
    };
  }
  /**
   * Validate and parse Groq API response
   * @param response - Raw response from Groq API
   * @returns Validated and repaired flashcards
   */
  static validateGroqResponse(response) {
    try {
      let flashcards = [];
      if (typeof response === "string") {
        const parsed = JSON.parse(response);
        if (Array.isArray(parsed)) {
          flashcards = parsed;
        } else if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
          flashcards = parsed.flashcards;
        }
      } else if (Array.isArray(response)) {
        flashcards = response;
      } else if (response && typeof response === "object") {
        const obj = response;
        if (Array.isArray(obj.flashcards)) {
          flashcards = obj.flashcards;
        } else if (Array.isArray(obj.cards)) {
          flashcards = obj.cards;
        }
      }
      const validation = this.validateFlashcards(flashcards);
      if (!validation.isValid) {
        const repaired = this.repairFlashcards(flashcards);
        return {
          isValid: repaired.length > 0,
          errors: repaired.length > 0 ? [] : validation.errors,
          repaired
        };
      }
      return validation;
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to parse Groq response: ${error instanceof Error ? error.message : String(error)}`],
        repaired: []
      };
    }
  }
  /**
   * Sanitize all flashcards in an array
   * @param flashcards - Array of flashcards
   * @returns Sanitized flashcards
   */
  static sanitizeFlashcards(flashcards) {
    return flashcards.map((card) => {
      const cleaned = Sanitizer.cleanFlashcardContent(card.front, card.back);
      return {
        ...card,
        front: cleaned.front,
        back: cleaned.back,
        tags: Sanitizer.normalizeTags(card.tags)
      };
    });
  }
}
class GroqFlashcardService {
  constructor(settings) {
    this.GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    this.settings = settings;
  }
  /**
   * Update service settings
   * @param settings - New settings
   */
  updateSettings(settings) {
    this.settings = settings;
  }
  /**
   * Generate flashcards from text content
   * @param content - Text content to generate flashcards from
   * @param mode - Generation mode (dynamic or fixed)
   * @param userTags - User-specified tags
   * @param noteName - Name of the source note
   * @returns Array of validated flashcards
   */
  async generateFlashcards(content, mode, userTags, noteName) {
    if (!this.settings.groqApiKey) {
      new obsidian.Notice("Please configure your Groq API key in settings");
      throw new Error("Groq API key not configured");
    }
    if (!content || content.trim().length === 0) {
      new obsidian.Notice("No content provided for flashcard generation");
      throw new Error("Empty content");
    }
    try {
      const chunkingResult = TokenUtils.chunkText(content, this.settings.maxChunkSize);
      if (chunkingResult.requiresSummarization) {
        new obsidian.Notice("Content is large, summarizing first...");
        content = await this.summarizeContent(content);
        const newChunking = TokenUtils.chunkText(content, this.settings.maxChunkSize);
        return await this.processChunks(newChunking.chunks, mode, userTags, noteName);
      }
      return await this.processChunks(chunkingResult.chunks, mode, userTags, noteName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      new obsidian.Notice(`Failed to generate flashcards: ${errorMessage}`);
      throw error;
    }
  }
  /**
   * Process multiple chunks in parallel
   * @param chunks - Array of text chunks
   * @param mode - Generation mode
   * @param userTags - User-specified tags
   * @param noteName - Source note name
   * @returns Combined flashcards from all chunks
   */
  async processChunks(chunks, mode, userTags, noteName) {
    const allFlashcards = [];
    const maxParallel = this.settings.maxParallelRequests;
    for (let i = 0; i < chunks.length; i += maxParallel) {
      const batch = chunks.slice(i, i + maxParallel);
      const batchPromises = batch.map(
        (chunk) => this.generateFromChunk(chunk.content, mode, userTags, noteName)
      );
      const results = await Promise.allSettled(batchPromises);
      for (const result of results) {
        if (result.status === "fulfilled") {
          allFlashcards.push(...result.value);
        } else {
          console.error("Chunk processing failed:", result.reason);
        }
      }
      if (i + maxParallel < chunks.length) {
        await this.delay(500);
      }
    }
    return allFlashcards;
  }
  /**
   * Generate flashcards from a single chunk
   * @param content - Chunk content
   * @param mode - Generation mode
   * @param userTags - User tags
   * @param noteName - Source note name
   * @returns Flashcards from this chunk
   */
  async generateFromChunk(content, mode, userTags, noteName) {
    const prompt = this.buildPrompt(content, mode, userTags);
    const response = await this.callGroqAPI(prompt);
    const validation = Validator.validateGroqResponse(response);
    if (!validation.isValid) {
      console.warn("Groq response validation failed:", validation.errors);
      if (validation.repaired && validation.repaired.length > 0) {
        return this.addMetadata(validation.repaired, noteName);
      }
      throw new Error("Failed to generate valid flashcards");
    }
    return this.addMetadata(validation.repaired || [], noteName);
  }
  /**
   * Summarize large content
   * @param content - Content to summarize
   * @returns Summarized content
   */
  async summarizeContent(content) {
    const prompt = TokenUtils.createSummaryPrompt(content);
    try {
      const response = await this.callGroqAPI(prompt, true);
      return typeof response === "string" ? response : JSON.stringify(response);
    } catch (error) {
      console.error("Summarization failed:", error);
      return TokenUtils.truncateToTokenLimit(content, 8e3);
    }
  }
  /**
   * Build prompt for Groq API
   * @param content - Content to generate flashcards from
   * @param mode - Generation mode
   * @param tags - Tags to use
   * @returns Formatted prompt
   */
  buildPrompt(content, mode, tags) {
    const basePrompt = `Generate high-quality flashcards from the following content. Each flashcard should test understanding of a key concept.

IMPORTANT: Respond with ONLY a valid JSON array of flashcards. Do not include any explanatory text before or after the JSON.

Format:
[
  {
    "front": "Question or prompt",
    "back": "Answer or explanation",
    "tags": ["tag1", "tag2"]
  }
]

Requirements:
- Front: Clear, concise question or prompt (max 500 chars)
- Back: Comprehensive answer with examples if relevant (max 1000 chars)
- Tags: Relevant categorization tags
- Generate 3-10 flashcards depending on content richness
- Focus on understanding, not memorization
- Use active recall principles

Content:
${content}

${mode === GenerationMode.DYNAMIC ? "Suggest relevant tags based on the content." : `Use these tags: ${tags.join(", ")}`}

JSON array:`;
    return basePrompt;
  }
  /**
   * Call Groq API
   * @param prompt - Prompt to send
   * @param isSummary - Whether this is a summary request
   * @returns API response
   */
  async callGroqAPI(prompt, isSummary = false) {
    const response = await obsidian.requestUrl({
      url: this.GROQ_API_URL,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.settings.groqApiKey}`
      },
      body: JSON.stringify({
        model: this.settings.groqModel,
        messages: [
          {
            role: "system",
            content: isSummary ? "You are a helpful assistant that creates concise summaries." : "You are a helpful assistant that creates educational flashcards. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: isSummary ? 2e3 : 4e3
      })
    });
    if (response.status !== 200) {
      const errorText = response.text;
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }
    const data = response.json;
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response format from Groq API");
    }
    const content = data.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response from Groq API");
    }
    if (isSummary) {
      return content;
    }
    return this.extractJSON(content);
  }
  /**
   * Extract JSON from response text
   * @param text - Response text that may contain JSON
   * @returns Parsed JSON
   */
  extractJSON(text) {
    try {
      return JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error("Could not extract valid JSON from response");
        }
      }
      throw new Error("No JSON found in response");
    }
  }
  /**
   * Add metadata to flashcards
   * @param flashcards - Flashcards to add metadata to
   * @param noteName - Source note name
   * @returns Flashcards with metadata
   */
  addMetadata(flashcards, noteName) {
    return flashcards.map((card) => ({
      ...card,
      source: noteName || card.source
    }));
  }
  /**
   * Delay execution
   * @param ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Test API connection with detailed error reporting
   * @returns Connection test result with details
   */
  async testConnection() {
    try {
      if (!this.settings.groqApiKey || this.settings.groqApiKey.trim() === "") {
        return {
          success: false,
          message: "Groq API key is not configured"
        };
      }
      if (!this.settings.groqApiKey.startsWith("gsk_")) {
        return {
          success: false,
          message: 'Invalid API key format. Groq API keys should start with "gsk_"'
        };
      }
      const response = await obsidian.requestUrl({
        url: this.GROQ_API_URL,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.settings.groqApiKey}`
        },
        body: JSON.stringify({
          model: this.settings.groqModel,
          messages: [
            {
              role: "user",
              content: "Test"
            }
          ],
          max_tokens: 10
        })
      });
      if (response.status !== 200) {
        const errorText = response.text;
        let errorMessage = `HTTP ${response.status}: Unknown error`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData && typeof errorData === "object" && "error" in errorData) {
            const error = errorData.error;
            errorMessage = error.message || error.type || errorMessage;
          }
        } catch {
          errorMessage = errorText || errorMessage;
        }
        return {
          success: false,
          message: `Groq API error: ${errorMessage}`,
          details: {
            status: response.status,
            response: errorText
          }
        };
      }
      const data = response.json;
      return {
        success: true,
        message: "Successfully connected to Groq API",
        details: {
          model: this.settings.groqModel,
          response: data
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Connection failed: ${errorMessage}`,
        details: { error: errorMessage }
      };
    }
  }
}
class AnkiSyncService {
  constructor(settings, app) {
    this.syncQueue = [];
    this.isProcessingQueue = false;
    this.ANKI_CONNECT_VERSION = 6;
    this.QUEUE_STORAGE_KEY = "obsicard-sync-queue";
    this.settings = settings;
    this.app = app;
    this.loadQueue();
  }
  /**
   * Update service settings
   * @param settings - New settings
   */
  updateSettings(settings) {
    this.settings = settings;
  }
  /**
   * Update app reference (needed when settings are reloaded)
   * @param app - Obsidian app instance
   */
  updateApp(app) {
    this.app = app;
  }
  /**
   * Sync a single flashcard to Anki
   * @param flashcard - Flashcard to sync
   * @returns True if sync successful
   */
  async syncFlashcard(flashcard) {
    try {
      const isAvailable = await this.checkAnkiConnect();
      if (!isAvailable) {
        if (this.settings.enableOfflineQueue) {
          this.queueFlashcard(flashcard);
          return true;
        } else {
          throw new Error("AnkiConnect is not available");
        }
      }
      await this.ensureDeckExists();
      await this.createAnkiNote(flashcard);
      return true;
    } catch (error) {
      console.error("Failed to sync flashcard:", error);
      if (this.settings.enableOfflineQueue) {
        this.queueFlashcard(flashcard);
        return true;
      }
      throw error;
    }
  }
  /**
   * Sync a single flashcard to Anki with detailed status
   * @param flashcard - Flashcard to sync
   * @param customDeckName - Optional custom deck name
   * @returns Status object
   */
  async syncFlashcardWithStatus(flashcard, customDeckName) {
    try {
      const isAvailable = await this.checkAnkiConnect();
      if (!isAvailable) {
        if (this.settings.enableOfflineQueue) {
          this.queueFlashcard(flashcard);
          return { synced: false, queued: true, error: false };
        } else {
          return { synced: false, queued: false, error: true };
        }
      }
      await this.ensureDeckExists(customDeckName);
      await this.createAnkiNote(flashcard, customDeckName);
      return { synced: true, queued: false, error: false };
    } catch (error) {
      console.error("Failed to sync flashcard:", error);
      if (this.settings.enableOfflineQueue) {
        this.queueFlashcard(flashcard);
        return { synced: false, queued: true, error: false };
      }
      return { synced: false, queued: false, error: true };
    }
  }
  /**
   * Sync multiple flashcards to Anki
   * @param flashcards - Flashcards to sync
   * @param customDeckName - Optional custom deck name
   * @returns Object with sync and queue counts
   */
  async syncFlashcards(flashcards, customDeckName) {
    let syncedCount = 0;
    let queuedCount = 0;
    let errorCount = 0;
    for (const flashcard of flashcards) {
      try {
        const result = await this.syncFlashcardWithStatus(flashcard, customDeckName);
        if (result.synced) {
          syncedCount++;
        } else if (result.queued) {
          queuedCount++;
        } else {
          errorCount++;
        }
        await this.delay(100);
      } catch (error) {
        console.error("Failed to sync flashcard:", error);
        errorCount++;
      }
    }
    return { synced: syncedCount, queued: queuedCount, errors: errorCount };
  }
  /**
   * Check if AnkiConnect is available
   * @returns True if available
   */
  async checkAnkiConnect() {
    try {
      const response = await this.invokeAnkiConnect("version", {});
      return response.error === null;
    } catch {
      return false;
    }
  }
  /**
   * Ensure the deck exists in Anki, create if not
   * @param customDeckName - Optional custom deck name
   */
  async ensureDeckExists(customDeckName) {
    const deckName = customDeckName || this.settings.ankiDeckName;
    const response = await this.invokeAnkiConnect("deckNames", {});
    const deckNames = response.result;
    if (!deckNames.includes(deckName)) {
      await this.invokeAnkiConnect("createDeck", {
        deck: deckName
      });
    }
  }
  /**
   * Create a note in Anki
   * @param flashcard - Flashcard to create
   * @param customDeckName - Optional custom deck name
   */
  async createAnkiNote(flashcard, customDeckName) {
    const deckName = customDeckName || this.settings.ankiDeckName;
    const note = {
      deckName,
      modelName: "Basic",
      fields: {
        Front: flashcard.front,
        Back: flashcard.back
      },
      tags: flashcard.tags,
      options: {
        allowDuplicate: false,
        duplicateScope: "deck"
      }
    };
    const response = await this.invokeAnkiConnect("addNote", { note });
    if (response.error) {
      throw new Error(`Failed to create Anki note: ${response.error}`);
    }
  }
  /**
   * Invoke AnkiConnect API
   * @param action - Action to perform
   * @param params - Parameters for the action
   * @returns Response from AnkiConnect
   */
  async invokeAnkiConnect(action, params) {
    const request = {
      action,
      version: this.ANKI_CONNECT_VERSION,
      params
    };
    const response = await obsidian.requestUrl({
      url: this.settings.ankiConnectUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    });
    if (response.status !== 200) {
      throw new Error(`AnkiConnect request failed: ${response.statusText || "Unknown error"}`);
    }
    return response.json;
  }
  /**
   * Queue a flashcard for later sync
   * @param flashcard - Flashcard to queue
   */
  queueFlashcard(flashcard) {
    const item = {
      flashcard,
      timestamp: Date.now(),
      retryCount: 0
    };
    this.syncQueue.push(item);
    this.saveQueue();
  }
  /**
   * Process the sync queue
   * @returns Number of successfully synced items
   */
  async processQueue() {
    if (this.isProcessingQueue || this.syncQueue.length === 0) {
      return 0;
    }
    this.isProcessingQueue = true;
    let successCount = 0;
    try {
      const isAvailable = await this.checkAnkiConnect();
      if (!isAvailable) {
        new obsidian.Notice("Anki is not available. Queue processing skipped.");
        return 0;
      }
      const itemsToProcess = [...this.syncQueue];
      this.syncQueue = [];
      for (const item of itemsToProcess) {
        try {
          await this.createAnkiNote(item.flashcard);
          successCount++;
        } catch (error) {
          console.error("Failed to sync queued item:", error);
          if (item.retryCount < this.settings.maxRetries) {
            item.retryCount++;
            this.syncQueue.push(item);
          }
        }
        await this.delay(100);
      }
      this.saveQueue();
      if (successCount > 0) {
        new obsidian.Notice(`Synced ${successCount} queued flashcard(s) to Anki`);
      }
    } finally {
      this.isProcessingQueue = false;
    }
    return successCount;
  }
  /**
   * Get queue status
   * @returns Queue information
   */
  getQueueStatus() {
    return {
      count: this.syncQueue.length,
      items: [...this.syncQueue]
    };
  }
  /**
   * Clear the sync queue
   */
  clearQueue() {
    this.syncQueue = [];
    this.saveQueue();
  }
  /**
   * Save queue to localStorage using App API
   */
  saveQueue() {
    try {
      this.app.saveLocalStorage(this.QUEUE_STORAGE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error("Failed to save sync queue:", error);
    }
  }
  /**
   * Load queue from localStorage using App API
   */
  loadQueue() {
    try {
      const saved = this.app.loadLocalStorage(this.QUEUE_STORAGE_KEY);
      if (saved) {
        this.syncQueue = JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to load sync queue:", error);
      this.syncQueue = [];
    }
  }
  /**
   * Start automatic queue processing
   * @param intervalMs - Interval in milliseconds
   * @returns Interval ID
   */
  startAutoProcessing(intervalMs = 6e4) {
    return window.setInterval(() => {
      void this.processQueue().catch((error) => {
        console.error("Error processing queue:", error);
      });
    }, intervalMs);
  }
  /**
   * Stop automatic queue processing
   * @param intervalId - Interval ID to stop
   */
  stopAutoProcessing(intervalId) {
    clearInterval(intervalId);
  }
  /**
   * Delay execution
   * @param ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Test connection to AnkiConnect and provide detailed info
   * @returns Connection status and info
   */
  async testConnection() {
    try {
      const response = await this.invokeAnkiConnect("version", {});
      if (response.error) {
        return {
          success: false,
          message: `AnkiConnect error: ${response.error}`
        };
      }
      const version = response.result;
      return {
        success: true,
        message: "Successfully connected to AnkiConnect",
        version
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  /**
   * Get Anki deck names
   * @returns Array of deck names
   */
  async getDeckNames() {
    try {
      const response = await this.invokeAnkiConnect("deckNames", {});
      return response.result;
    } catch {
      return [];
    }
  }
}
class MarkdownWriter {
  constructor(app) {
    this.FLASHCARDS_HEADING = "## Flashcards";
    this.app = app;
  }
  /**
   * Write flashcards to a note under ## Flashcards section
   * @param file - File to write to
   * @param flashcards - Flashcards to write
   * @returns True if write successful
   */
  async writeFlashcardsToNote(file, flashcards) {
    try {
      const content = await this.app.vault.read(file);
      const newContent = this.insertFlashcards(content, flashcards);
      await this.app.vault.modify(file, newContent);
      return true;
    } catch (error) {
      console.error("Failed to write flashcards:", error);
      return false;
    }
  }
  /**
   * Insert flashcards into note content
   * @param content - Original note content
   * @param flashcards - Flashcards to insert
   * @returns Modified content
   */
  insertFlashcards(content, flashcards) {
    const flashcardSection = this.formatFlashcards(flashcards);
    const flashcardsHeadingRegex = /^##\s+Flashcards\s*$/m;
    const match = flashcardsHeadingRegex.exec(content);
    if (match) {
      return this.appendToExistingSection(content, flashcardSection, match.index);
    } else {
      return this.createNewSection(content, flashcardSection);
    }
  }
  /**
   * Append flashcards to existing section
   * @param content - Original content
   * @param flashcardSection - Formatted flashcard section
   * @param headingIndex - Index of the ## Flashcards heading
   * @returns Modified content
   */
  appendToExistingSection(content, flashcardSection, headingIndex) {
    const afterHeading = content.substring(headingIndex);
    const nextHeadingRegex = /\n##?\s+/;
    const nextHeadingMatch = afterHeading.substring(afterHeading.indexOf("\n") + 1).match(nextHeadingRegex);
    let insertPosition;
    if (nextHeadingMatch && nextHeadingMatch.index !== void 0) {
      insertPosition = headingIndex + afterHeading.indexOf("\n") + 1 + nextHeadingMatch.index;
    } else {
      insertPosition = content.length;
    }
    const before = content.substring(0, insertPosition);
    const after = content.substring(insertPosition);
    return before + "\n" + flashcardSection + "\n" + after;
  }
  /**
   * Create new Flashcards section at end of document
   * @param content - Original content
   * @param flashcardSection - Formatted flashcard section
   * @returns Modified content
   */
  createNewSection(content, flashcardSection) {
    let separator = "\n\n";
    if (!content.endsWith("\n")) {
      separator = "\n\n";
    } else if (!content.endsWith("\n\n")) {
      separator = "\n";
    }
    return content + separator + this.FLASHCARDS_HEADING + "\n\n" + flashcardSection;
  }
  /**
   * Format flashcards as markdown
   * @param flashcards - Flashcards to format
   * @returns Formatted markdown string
   */
  formatFlashcards(flashcards) {
    const formatted = [];
    for (const card of flashcards) {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const tags = card.tags.map((tag) => `#${tag}`).join(" ");
      formatted.push("---");
      formatted.push("");
      formatted.push(`**Q:** ${card.front}`);
      formatted.push("");
      formatted.push(`**A:** ${card.back}`);
      formatted.push("");
      if (tags) {
        formatted.push(`*Tags:* ${tags}`);
      }
      formatted.push(`*Created:* ${timestamp}`);
      formatted.push("");
    }
    return formatted.join("\n");
  }
  /**
   * Read flashcards from a note
   * @param file - File to read from
   * @returns Array of flashcards found in the note
   */
  async readFlashcardsFromNote(file) {
    try {
      const content = await this.app.vault.read(file);
      return this.parseFlashcards(content);
    } catch (error) {
      console.error("Failed to read flashcards:", error);
      return [];
    }
  }
  /**
   * Parse flashcards from note content
   * @param content - Note content
   * @returns Parsed flashcards
   */
  parseFlashcards(content) {
    const flashcards = [];
    const flashcardsHeadingRegex = /^##\s+Flashcards\s*$/m;
    const match = flashcardsHeadingRegex.exec(content);
    if (!match) {
      return flashcards;
    }
    const sectionStart = match.index + match[0].length;
    const afterSection = content.substring(sectionStart);
    const nextHeadingMatch = afterSection.match(/\n##?\s+/);
    const sectionContent = nextHeadingMatch && nextHeadingMatch.index !== void 0 ? afterSection.substring(0, nextHeadingMatch.index) : afterSection;
    const cardBlocks = sectionContent.split("---").filter((block) => block.trim());
    for (const block of cardBlocks) {
      const card = this.parseFlashcardBlock(block);
      if (card) {
        flashcards.push(card);
      }
    }
    return flashcards;
  }
  /**
   * Parse a single flashcard block
   * @param block - Flashcard block text
   * @returns Parsed flashcard or null
   */
  parseFlashcardBlock(block) {
    const frontMatch = block.match(/\*\*Q:\*\*\s*(.+?)(?=\n|$)/s);
    const backMatch = block.match(/\*\*A:\*\*\s*(.+?)(?=\n\*|$)/s);
    const tagsMatch = block.match(/\*Tags:\*\s*(.+?)(?=\n|$)/);
    if (!frontMatch || !backMatch) {
      return null;
    }
    const front = frontMatch[1].trim();
    const back = backMatch[1].trim();
    const tags = [];
    if (tagsMatch) {
      const tagString = tagsMatch[1];
      const tagMatches = tagString.match(/#[\w-]+/g);
      if (tagMatches) {
        tags.push(...tagMatches.map((tag) => tag.substring(1)));
      }
    }
    return {
      front,
      back,
      tags: tags.length > 0 ? tags : ["obsidian"]
    };
  }
  /**
   * Check if note has Flashcards section
   * @param file - File to check
   * @returns True if section exists
   */
  async hasFlashcardsSection(file) {
    try {
      const content = await this.app.vault.read(file);
      const flashcardsHeadingRegex = /^##\s+Flashcards\s*$/m;
      return flashcardsHeadingRegex.test(content);
    } catch {
      return false;
    }
  }
  /**
   * Remove duplicate flashcards from a note
   * @param file - File to deduplicate
   * @returns Number of duplicates removed
   */
  async deduplicateFlashcards(file) {
    try {
      const flashcards = await this.readFlashcardsFromNote(file);
      const unique = this.removeDuplicates(flashcards);
      const removed = flashcards.length - unique.length;
      if (removed > 0) {
        const content = await this.app.vault.read(file);
        const newContent = this.removeFlashcardsSection(content);
        await this.app.vault.modify(file, newContent);
        await this.writeFlashcardsToNote(file, unique);
      }
      return removed;
    } catch (error) {
      console.error("Failed to deduplicate flashcards:", error);
      return 0;
    }
  }
  /**
   * Remove duplicates from flashcard array
   * @param flashcards - Flashcards to deduplicate
   * @returns Deduplicated flashcards
   */
  removeDuplicates(flashcards) {
    const seen = /* @__PURE__ */ new Set();
    const unique = [];
    for (const card of flashcards) {
      const key = `${card.front}|||${card.back}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(card);
      }
    }
    return unique;
  }
  /**
   * Remove Flashcards section from content
   * @param content - Original content
   * @returns Content without Flashcards section
   */
  removeFlashcardsSection(content) {
    const flashcardsHeadingRegex = /^##\s+Flashcards\s*$/m;
    const match = flashcardsHeadingRegex.exec(content);
    if (!match) {
      return content;
    }
    const sectionStart = match.index;
    const afterSection = content.substring(sectionStart);
    const nextHeadingMatch = afterSection.substring(afterSection.indexOf("\n") + 1).match(/\n##?\s+/);
    let sectionEnd;
    if (nextHeadingMatch && nextHeadingMatch.index !== void 0) {
      sectionEnd = sectionStart + afterSection.indexOf("\n") + 1 + nextHeadingMatch.index;
    } else {
      sectionEnd = content.length;
    }
    const before = content.substring(0, sectionStart);
    const after = content.substring(sectionEnd);
    return (before + after).trim() + "\n";
  }
}
class PreGenerationModal extends obsidian.Modal {
  constructor(app, defaultTags, onSubmit) {
    super(app);
    this.mode = GenerationMode.DYNAMIC;
    this.tags = [];
    this.tags = [...defaultTags];
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("obsicard-pregen-modal");
    contentEl.createEl("h2", { text: "Generate flashcards" });
    contentEl.createEl("p", {
      text: "Configure how flashcards should be generated from your content.",
      cls: "setting-item-description"
    });
    new obsidian.Setting(contentEl).setName("Generation mode").setDesc("Dynamic: AI suggests tags based on content. Fixed: use your specified tags.").addDropdown((dropdown) => {
      dropdown.addOption(GenerationMode.DYNAMIC, "Dynamic (AI-suggested tags)").addOption(GenerationMode.FIXED, "Fixed (use my tags)").setValue(this.mode).onChange((value) => {
        this.mode = value;
        this.updateTagsVisibility();
      });
    });
    const tagsContainer = contentEl.createDiv("tags-container");
    const tagsSetting = new obsidian.Setting(tagsContainer).setName("Tags").setDesc("Comma-separated tags for flashcards (e.g., history, important, exam).").addText((text) => {
      text.setPlaceholder("Enter tags...").setValue(this.tags.join(", ")).onChange((value) => {
        this.tags = value.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0);
      });
    });
    tagsContainer.settingEl = tagsSetting;
    this.updateTagsVisibility();
    const suggestionsDiv = contentEl.createDiv("tag-suggestions");
    suggestionsDiv.createEl("p", {
      text: "Common tags:",
      cls: "setting-item-description"
    });
    const commonTags = ["important", "review", "exam", "concept", "definition", "formula"];
    const buttonContainer = suggestionsDiv.createDiv("button-container");
    for (const tag of commonTags) {
      const button = buttonContainer.createEl("button", {
        text: tag,
        cls: "tag-suggestion-button"
      });
      button.addEventListener("click", () => {
        if (!this.tags.includes(tag)) {
          this.tags.push(tag);
          this.updateTagsInput(tagsContainer);
        }
      });
    }
    const buttonContainer2 = contentEl.createDiv("button-container");
    const cancelButton = buttonContainer2.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => this.close());
    const generateButton = buttonContainer2.createEl("button", {
      text: "Generate",
      cls: "mod-cta"
    });
    generateButton.addEventListener("click", () => {
      this.onSubmit(this.mode, this.tags);
      this.close();
    });
  }
  /**
   * Update visibility of tags input based on mode
   */
  updateTagsVisibility() {
    const tagsContainer = this.contentEl.querySelector(".tags-container");
    if (tagsContainer) {
      if (this.mode === GenerationMode.FIXED) {
        tagsContainer.classList.add("visible");
        tagsContainer.classList.remove("hidden");
      } else {
        tagsContainer.classList.add("hidden");
        tagsContainer.classList.remove("visible");
      }
    }
    const suggestionsDiv = this.contentEl.querySelector(".tag-suggestions");
    if (suggestionsDiv) {
      if (this.mode === GenerationMode.FIXED) {
        suggestionsDiv.classList.add("visible");
        suggestionsDiv.classList.remove("hidden");
      } else {
        suggestionsDiv.classList.add("hidden");
        suggestionsDiv.classList.remove("visible");
      }
    }
  }
  /**
   * Update tags input field value
   */
  updateTagsInput(container) {
    const input = container.querySelector("input");
    if (input) {
      input.value = this.tags.join(", ");
    }
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
class ReviewModal extends obsidian.Modal {
  constructor(app, flashcards, onApprove, initialDeckName = "ObsiCard") {
    super(app);
    this.flashcards = flashcards;
    this.selectedCards = new Set(flashcards.map((_, i) => i));
    this.onApprove = onApprove;
    this.deckName = initialDeckName;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("obsicard-review-modal");
    const header = contentEl.createDiv("review-header");
    header.createEl("h2", { text: "Review flashcards" });
    header.createEl("p", {
      text: `${this.flashcards.length} flashcard(s) generated. Select the ones you want to keep.`,
      cls: "setting-item-description"
    });
    const selectControls = contentEl.createDiv("select-controls");
    const toggleSelectBtn = selectControls.createEl("button", { text: "Select all" });
    toggleSelectBtn.addEventListener("click", () => {
      const allSelected = this.selectedCards.size === this.flashcards.length;
      if (allSelected) {
        this.selectedCards.clear();
        toggleSelectBtn.textContent = "Select all";
      } else {
        this.selectedCards = new Set(this.flashcards.map((_, i) => i));
        toggleSelectBtn.textContent = "Deselect all";
      }
      this.updateCardSelection();
    });
    const deckNameContainer = contentEl.createDiv("deck-name-container");
    deckNameContainer.createEl("label", {
      text: "Anki deck name:",
      cls: "setting-item-name"
    });
    const deckNameInput = deckNameContainer.createEl("input", {
      type: "text",
      value: this.deckName,
      placeholder: "Enter deck name..."
    });
    deckNameInput.addEventListener("input", (e) => {
      this.deckName = e.target.value.trim() || "ObsiCard";
    });
    const cardList = contentEl.createDiv("flashcard-list");
    this.flashcards.forEach((card, index) => {
      const cardEl = this.createFlashcardElement(card, index);
      cardList.appendChild(cardEl);
    });
    const buttonContainer = contentEl.createDiv("button-container");
    const leftButtons = buttonContainer.createDiv("left-buttons");
    const cancelButton = leftButtons.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => this.close());
    const rightButtons = buttonContainer.createDiv("right-buttons");
    const selectedCount = rightButtons.createEl("span", {
      text: `${this.selectedCards.size} selected`
    });
    selectedCount.id = "selected-count";
    const approveButton = rightButtons.createEl("button", {
      text: "Approve & save",
      cls: "mod-cta"
    });
    approveButton.id = "approve-button";
    this.updateApproveButton();
    approveButton.addEventListener("click", () => {
      const approved = this.flashcards.filter((_, i) => this.selectedCards.has(i));
      if (approved.length === 0) {
        return;
      }
      this.onApprove(approved, this.deckName);
      this.close();
    });
    this.addStyles();
    this.watchForDragHandles();
  }
  /**
   * Create a flashcard element
   */
  createFlashcardElement(card, index) {
    const cardEl = document.createElement("div");
    cardEl.className = "flashcard-item";
    cardEl.dataset.index = String(index);
    cardEl.draggable = false;
    cardEl.addEventListener("dragstart", (e) => e.preventDefault());
    cardEl.addEventListener("drag", (e) => e.preventDefault());
    cardEl.addEventListener("dragend", (e) => e.preventDefault());
    cardEl.addEventListener("dragover", (e) => e.preventDefault());
    cardEl.addEventListener("dragenter", (e) => e.preventDefault());
    cardEl.addEventListener("dragleave", (e) => e.preventDefault());
    cardEl.addEventListener("drop", (e) => e.preventDefault());
    cardEl.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const isSelected = this.selectedCards.has(index);
      if (isSelected) {
        this.selectedCards.delete(index);
      } else {
        this.selectedCards.add(index);
      }
      this.updateCardSelection();
      this.updateSelectedCount();
    });
    const checkboxContainer = cardEl.createDiv("checkbox-container");
    const checkbox = checkboxContainer.createEl("input", {
      type: "checkbox"
    });
    checkbox.checked = this.selectedCards.has(index);
    checkbox.addEventListener("change", (e) => {
      e.stopPropagation();
      if (checkbox.checked) {
        this.selectedCards.add(index);
      } else {
        this.selectedCards.delete(index);
      }
      this.updateSelectedCount();
      this.updateCardAppearance(cardEl, checkbox.checked);
    });
    const checkboxLabel = checkboxContainer.createEl("label", {
      text: `Flashcard ${index + 1}`
    });
    checkboxLabel.addEventListener("click", (e) => {
      e.stopPropagation();
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change"));
    });
    const frontDiv = cardEl.createDiv("card-front");
    frontDiv.createEl("strong", { text: "Front: " });
    frontDiv.createSpan({ text: card.front });
    const backDiv = cardEl.createDiv("card-back");
    backDiv.createEl("strong", { text: "Back: " });
    backDiv.createSpan({ text: card.back });
    if (card.tags && card.tags.length > 0) {
      const tagsDiv = cardEl.createDiv("card-tags");
      tagsDiv.createEl("strong", { text: "Tags: " });
      const tagsSpan = tagsDiv.createSpan();
      tagsSpan.textContent = card.tags.map((tag) => `#${tag}`).join(" ");
    }
    const editButton = cardEl.createEl("button", {
      text: "Edit",
      cls: "clickable-icon"
    });
    editButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.editFlashcard(card, index);
    });
    this.updateCardAppearance(cardEl, checkbox.checked);
    return cardEl;
  }
  /**
   * Update card appearance based on selection
   */
  updateCardAppearance(cardEl, selected) {
    if (selected) {
      cardEl.classList.add("selected");
      cardEl.classList.remove("unselected");
    } else {
      cardEl.classList.add("unselected");
      cardEl.classList.remove("selected");
    }
  }
  /**
   * Update card selection UI
   */
  updateCardSelection() {
    const cardItems = this.contentEl.querySelectorAll(".flashcard-item");
    cardItems.forEach((cardEl) => {
      const index = parseInt(cardEl.dataset.index || "0");
      const checkbox = cardEl.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = this.selectedCards.has(index);
        this.updateCardAppearance(cardEl, checkbox.checked);
      }
    });
    this.updateSelectedCount();
    const toggleBtn = this.contentEl.querySelector(".select-controls button");
    if (toggleBtn) {
      const allSelected = this.selectedCards.size === this.flashcards.length;
      toggleBtn.textContent = allSelected ? "Deselect all" : "Select all";
    }
  }
  /**
   * Update selected count display
   */
  updateSelectedCount() {
    const countEl = this.contentEl.querySelector("#selected-count");
    if (countEl) {
      countEl.textContent = `${this.selectedCards.size} selected`;
    }
    this.updateApproveButton();
  }
  /**
   * Update approve button state based on selection
   */
  updateApproveButton() {
    const approveButton = this.contentEl.querySelector("#approve-button");
    if (approveButton) {
      const hasSelection = this.selectedCards.size > 0;
      approveButton.disabled = !hasSelection;
      if (hasSelection) {
        approveButton.textContent = `Approve & save (${this.selectedCards.size})`;
        approveButton.classList.remove("is-disabled");
      } else {
        approveButton.textContent = "Select flashcards to save";
        approveButton.classList.add("is-disabled");
      }
    }
  }
  /**
   * Edit a flashcard (simple implementation)
   */
  editFlashcard(card, index) {
    const modal = new EditFlashcardModal(this.app, card, (updated) => {
      this.flashcards[index] = updated;
      this.onOpen();
    });
    modal.open();
  }
  /**
   * Watch for and remove any dynamically added drag handles
   */
  watchForDragHandles() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              const dragHandles = element.querySelectorAll(".drag-handle, .handle, [data-drag-handle], .list-item-drag-handle, .list-item-handle, .workspace-leaf-drag-handle, .sidebar-drag-handle, .mod-drag-handle");
              dragHandles.forEach((handle) => {
                handle.classList.add("obsicard-drag-handle-removed");
                handle.remove();
              });
              if (element.classList.contains("drag-handle") || element.classList.contains("handle") || element.hasAttribute("data-drag-handle")) {
                element.classList.add("obsicard-drag-handle-removed");
                element.remove();
              }
            }
          });
        }
      });
    });
    observer.observe(this.contentEl, {
      childList: true,
      subtree: true
    });
  }
  /**
   * Add custom styles - now handled by CSS file
   */
  addStyles() {
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
class EditFlashcardModal extends obsidian.Modal {
  constructor(app, card, onSave) {
    super(app);
    this.card = { ...card };
    this.onSave = onSave;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("obsicard-edit-modal");
    contentEl.createEl("h2", { text: "Edit flashcard" });
    contentEl.createEl("label", { text: "Front" });
    const frontInput = contentEl.createEl("textarea");
    frontInput.value = this.card.front;
    contentEl.createEl("label", { text: "Back" });
    const backInput = contentEl.createEl("textarea");
    backInput.value = this.card.back;
    contentEl.createEl("label", { text: "Tags (comma-separated)" });
    const tagsInput = contentEl.createEl("input", { type: "text" });
    tagsInput.value = this.card.tags.join(", ");
    const buttonContainer = contentEl.createDiv("button-container");
    const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => this.close());
    const saveButton = buttonContainer.createEl("button", {
      text: "Save",
      cls: "mod-cta"
    });
    saveButton.addEventListener("click", () => {
      this.card.front = frontInput.value.trim();
      this.card.back = backInput.value.trim();
      this.card.tags = tagsInput.value.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0);
      this.onSave(this.card);
      this.close();
    });
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
class ObsiCardSettingsTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new obsidian.Setting(containerEl).setHeading().setName("ObsiCard settings");
    new obsidian.Setting(containerEl).setHeading().setName("Groq API configuration");
    new obsidian.Setting(containerEl).setName("Groq API key").setDesc("Your Groq API key for AI flashcard generation.").addText((text) => {
      text.setPlaceholder("Enter your API key").setValue(this.plugin.settings.groqApiKey).onChange(async (value) => {
        this.plugin.settings.groqApiKey = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.type = "password";
      text.inputEl.addClass("obsicard-setting-input");
    }).addButton((button) => {
      button.setButtonText("Test connection").onClick(async () => {
        const testButton = button.buttonEl;
        testButton.disabled = true;
        testButton.textContent = "Testing...";
        const result = await this.plugin.groqService.testConnection();
        if (result.success) {
          new obsidian.Notice(`✓ ${result.message}`);
          testButton.textContent = "Connected ✓";
        } else {
          new obsidian.Notice(`✗ ${result.message}`);
          testButton.textContent = "Failed ✗";
        }
        setTimeout(() => {
          testButton.disabled = false;
          testButton.textContent = "Test connection";
        }, 2e3);
      });
    });
    new obsidian.Setting(containerEl).setName("Groq model").setDesc("Model ID, e.g., llama-3.1-8b-instant (editable).").addText((text) => {
      text.setPlaceholder("llama-3.1-8b-instant").setValue(this.plugin.settings.groqModel).onChange(async (value) => {
        this.plugin.settings.groqModel = value.trim();
        await this.plugin.saveSettings();
      });
      text.inputEl.addClass("obsicard-setting-input");
    }).addExtraButton((button) => {
      button.setIcon("reset").setTooltip("Reset to recommended").onClick(async () => {
        this.plugin.settings.groqModel = "llama-3.1-8b-instant";
        await this.plugin.saveSettings();
        this.display();
      });
    });
    new obsidian.Setting(containerEl).setHeading().setName("Anki integration");
    new obsidian.Setting(containerEl).setName("AnkiConnect URL").setDesc("URL for AnkiConnect API (default: http://127.0.0.1:8765).").addText((text) => {
      text.setPlaceholder("http://127.0.0.1:8765").setValue(this.plugin.settings.ankiConnectUrl).onChange(async (value) => {
        this.plugin.settings.ankiConnectUrl = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.addClass("obsicard-setting-input");
    }).addButton((button) => {
      button.setButtonText("Test connection").onClick(async () => {
        const testButton = button.buttonEl;
        testButton.disabled = true;
        testButton.textContent = "Testing...";
        const result = await this.plugin.ankiService.testConnection();
        if (result.success) {
          new obsidian.Notice(`✓ ${result.message} (Version: ${result.version})`);
          testButton.textContent = "Connected ✓";
        } else {
          new obsidian.Notice(`✗ ${result.message}`);
          testButton.textContent = "Failed ✗";
        }
        setTimeout(() => {
          testButton.disabled = false;
          testButton.textContent = "Test connection";
        }, 2e3);
      });
    });
    new obsidian.Setting(containerEl).setName("Anki deck name").setDesc("Name of the Anki deck to sync flashcards to.").addText((text) => {
      text.setPlaceholder("ObsiCard").setValue(this.plugin.settings.ankiDeckName).onChange(async (value) => {
        this.plugin.settings.ankiDeckName = value;
        await this.plugin.saveSettings();
      });
    }).addButton((button) => {
      button.setButtonText("Browse decks").onClick(async () => {
        const decks = await this.plugin.ankiService.getDeckNames();
        if (decks.length > 0) {
          new obsidian.Notice(`Available decks: ${decks.join(", ")}`);
        } else {
          new obsidian.Notice("No decks found or Anki not connected");
        }
      });
    });
    new obsidian.Setting(containerEl).setName("Auto-sync to Anki").setDesc("Automatically sync approved flashcards to Anki.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.autoSyncToAnki).onChange(async (value) => {
        this.plugin.settings.autoSyncToAnki = value;
        await this.plugin.saveSettings();
      });
    });
    new obsidian.Setting(containerEl).setHeading().setName("Advanced settings");
    new obsidian.Setting(containerEl).setName("Maximum chunk size").setDesc("Maximum tokens per chunk for processing (default: 3500).").addText((text) => {
      text.setPlaceholder("3500").setValue(String(this.plugin.settings.maxChunkSize)).onChange(async (value) => {
        const num = parseInt(value);
        if (!isNaN(num) && num > 0 && num <= 8e3) {
          this.plugin.settings.maxChunkSize = num;
          await this.plugin.saveSettings();
        }
      });
      text.inputEl.type = "number";
    });
    new obsidian.Setting(containerEl).setName("Maximum parallel requests").setDesc("Maximum number of concurrent API requests (1-5, default: 3).").addText((text) => {
      text.setPlaceholder("3").setValue(String(this.plugin.settings.maxParallelRequests)).onChange(async (value) => {
        const num = parseInt(value);
        if (!isNaN(num) && num >= 1 && num <= 5) {
          this.plugin.settings.maxParallelRequests = num;
          await this.plugin.saveSettings();
        }
      });
      text.inputEl.type = "number";
    });
    new obsidian.Setting(containerEl).setName("Enable offline queue").setDesc("Queue flashcards when Anki is offline and sync later.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.enableOfflineQueue).onChange(async (value) => {
        this.plugin.settings.enableOfflineQueue = value;
        await this.plugin.saveSettings();
      });
    });
    new obsidian.Setting(containerEl).setName("Maximum retries").setDesc("Maximum retry attempts for failed syncs (default: 3).").addText((text) => {
      text.setPlaceholder("3").setValue(String(this.plugin.settings.maxRetries)).onChange(async (value) => {
        const num = parseInt(value);
        if (!isNaN(num) && num >= 0 && num <= 10) {
          this.plugin.settings.maxRetries = num;
          await this.plugin.saveSettings();
        }
      });
      text.inputEl.type = "number";
    });
    new obsidian.Setting(containerEl).setName("Default tags").setDesc("Default tags to apply to flashcards (comma-separated).").addText((text) => {
      text.setPlaceholder("obsidian, review").setValue(this.plugin.settings.defaultTags.join(", ")).onChange(async (value) => {
        this.plugin.settings.defaultTags = value.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0);
        await this.plugin.saveSettings();
      });
      text.inputEl.addClass("obsicard-setting-input");
    });
    new obsidian.Setting(containerEl).setHeading().setName("Queue management");
    const queueStatus = this.plugin.ankiService.getQueueStatus();
    new obsidian.Setting(containerEl).setName("Sync queue").setDesc(`Currently ${queueStatus.count} flashcard(s) in queue.`).addButton((button) => {
      button.setButtonText("Process queue").onClick(async () => {
        const processButton = button.buttonEl;
        processButton.disabled = true;
        processButton.textContent = "Processing...";
        const synced = await this.plugin.ankiService.processQueue();
        if (synced > 0) {
          new obsidian.Notice(`Successfully synced ${synced} flashcard(s) from queue`);
        } else {
          new obsidian.Notice("No flashcards synced (queue empty or Anki unavailable)");
        }
        processButton.disabled = false;
        processButton.textContent = "Process queue";
        this.display();
      });
    }).addButton((button) => {
      button.setButtonText("Clear queue").setWarning().onClick(() => {
        const confirmModal = new ConfirmModal(
          this.app,
          `Clear ${queueStatus.count} item(s) from queue?`,
          () => {
            this.plugin.ankiService.clearQueue();
            new obsidian.Notice("Queue cleared");
            this.display();
          }
        );
        confirmModal.open();
      });
    });
    new obsidian.Setting(containerEl).setHeading().setName("Help & resources");
    const helpDiv = containerEl.createDiv("obsicard-help-section");
    helpDiv.createEl("p", {
      text: "📚 Getting started:"
    });
    const list = helpDiv.createEl("ul", "obsicard-help-list");
    list.createEl("li", {
      text: "1. Get a free Groq API key from https://console.groq.com"
    });
    list.createEl("li", {
      text: "2. Install Anki Desktop and the AnkiConnect add-on (ID: 2055492159)"
    });
    list.createEl("li", {
      text: '3. Select text or open a note, then right-click → "Generate flashcards"'
    });
    const linksDiv = containerEl.createDiv("obsicard-help-links");
    const groqLink = linksDiv.createEl("a", {
      text: "🔗 Groq console",
      href: "https://console.groq.com"
    });
    groqLink.addClass("obsicard-help-link");
    const ankiLink = linksDiv.createEl("a", {
      text: "🔗 AnkiConnect",
      href: "https://ankiweb.net/shared/info/2055492159"
    });
    ankiLink.addClass("obsicard-help-link");
  }
}
class ConfirmModal extends obsidian.Modal {
  constructor(app, message, onConfirm) {
    super(app);
    this.message = message;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("obsicard-confirm-modal");
    contentEl.createEl("p", { text: this.message });
    const buttonContainer = contentEl.createDiv("button-container");
    const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => this.close());
    const confirmButton = buttonContainer.createEl("button", {
      text: "Confirm",
      cls: "mod-cta mod-warning"
    });
    confirmButton.addEventListener("click", () => {
      this.onConfirm();
      this.close();
    });
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
class ObsiCardPlugin extends obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    console.debug("Loading ObsiCard plugin");
    await this.loadSettings();
    this.groqService = new GroqFlashcardService(this.settings);
    this.ankiService = new AnkiSyncService(this.settings, this.app);
    this.markdownWriter = new MarkdownWriter(this.app);
    this.addSettingTab(new ObsiCardSettingsTab(this.app, this));
    this.registerCommands();
    this.registerContextMenus();
    if (this.settings.enableOfflineQueue) {
      this.startQueueProcessing();
    }
    this.addRibbonIcon("brain", "Generate flashcards", () => {
      void this.generateFlashcardsFromActiveNote();
    });
    console.debug("ObsiCard plugin loaded successfully");
  }
  onunload() {
    console.debug("Unloading ObsiCard plugin");
    if (this.queueProcessInterval) {
      this.ankiService.stopAutoProcessing(this.queueProcessInterval);
    }
  }
  /**
   * Register plugin commands
   */
  registerCommands() {
    this.addCommand({
      id: "generate-flashcards-selection",
      name: "Generate flashcards from selection",
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (selection) {
          this.generateFlashcards(selection);
        } else {
          new obsidian.Notice("No text selected");
        }
      }
    });
    this.addCommand({
      id: "generate-flashcards-note",
      name: "Generate flashcards from current note",
      callback: () => {
        void this.generateFlashcardsFromActiveNote();
      }
    });
    this.addCommand({
      id: "process-sync-queue",
      name: "Process Anki sync queue",
      callback: async () => {
        const synced = await this.ankiService.processQueue();
        if (synced > 0) {
          new obsidian.Notice(`Synced ${synced} flashcard(s) to Anki`);
        } else {
          new obsidian.Notice("No flashcards synced");
        }
      }
    });
    this.addCommand({
      id: "view-queue-status",
      name: "View sync queue status",
      callback: () => {
        const status = this.ankiService.getQueueStatus();
        new obsidian.Notice(`${status.count} flashcard(s) in sync queue`);
      }
    });
    this.addCommand({
      id: "test-connections",
      name: "Test API connections",
      callback: async () => {
        new obsidian.Notice("Testing connections...");
        const groqTest = await this.groqService.testConnection();
        const ankiTest = await this.ankiService.testConnection();
        let message = "";
        message += groqTest.success ? "✓ Groq API" : `✗ Groq API: ${groqTest.message}`;
        message += "\n";
        message += ankiTest.success ? "✓ AnkiConnect" : `✗ AnkiConnect: ${ankiTest.message}`;
        new obsidian.Notice(message);
      }
    });
  }
  /**
   * Register context menu items
   */
  registerContextMenus() {
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        menu.addItem((item) => {
          item.setTitle("Generate flashcards with ObsiCard").setIcon("brain").onClick(() => {
            const selection = editor.getSelection();
            if (selection) {
              this.generateFlashcards(selection);
            } else {
              void this.generateFlashcardsFromActiveNote();
            }
          });
        });
      })
    );
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof obsidian.TFile && file.extension === "md") {
          menu.addItem((item) => {
            item.setTitle("Generate flashcards").setIcon("brain").onClick(async () => {
              const content = await this.app.vault.read(file);
              this.generateFlashcards(content, file);
            });
          });
        }
      })
    );
  }
  /**
   * Generate flashcards from active note
   */
  async generateFlashcardsFromActiveNote() {
    const activeView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    if (!activeView) {
      new obsidian.Notice("No active note");
      return;
    }
    const file = activeView.file;
    if (!file) {
      new obsidian.Notice("No file associated with active view");
      return;
    }
    const content = await this.app.vault.read(file);
    if (!content || content.trim().length === 0) {
      new obsidian.Notice("Note is empty");
      return;
    }
    this.generateFlashcards(content, file);
  }
  /**
   * Main flashcard generation workflow
   * @param content - Text content to generate from
   * @param file - Optional file to save flashcards to
   */
  generateFlashcards(content, file) {
    if (!this.settings.groqApiKey) {
      new obsidian.Notice("Please configure your Groq API key in settings");
      return;
    }
    const modal = new PreGenerationModal(
      this.app,
      this.settings.defaultTags,
      (mode, tags) => {
        void this.processGeneration(content, mode, tags, file);
      }
    );
    modal.open();
  }
  /**
   * Process flashcard generation
   * @param content - Content to generate from
   * @param mode - Generation mode
   * @param tags - Tags to use
   * @param file - Optional file to save to
   */
  async processGeneration(content, mode, tags, file) {
    const loadingNotice = new obsidian.Notice("Generating flashcards...", 0);
    try {
      const noteName = file?.basename;
      const flashcards = await this.groqService.generateFlashcards(
        content,
        mode,
        tags,
        noteName
      );
      loadingNotice.hide();
      if (!flashcards || flashcards.length === 0) {
        new obsidian.Notice("No flashcards generated");
        return;
      }
      const reviewModal = new ReviewModal(
        this.app,
        flashcards,
        (approved, deckName) => {
          void this.saveAndSyncFlashcards(approved, file, deckName);
        },
        this.settings.ankiDeckName
      );
      reviewModal.open();
    } catch (error) {
      loadingNotice.hide();
      const errorMessage = error instanceof Error ? error.message : String(error);
      new obsidian.Notice(`Failed to generate flashcards: ${errorMessage}`);
      console.error("Flashcard generation error:", error);
    }
  }
  /**
   * Save flashcards to note and sync to Anki
   * @param flashcards - Approved flashcards
   * @param file - File to save to
   * @param deckName - Anki deck name
   */
  async saveAndSyncFlashcards(flashcards, file, deckName) {
    if (!flashcards || flashcards.length === 0) {
      return;
    }
    const waitingNotice = new obsidian.Notice("Saving flashcards...", 0);
    try {
      let targetFile = file;
      if (!targetFile) {
        const activeView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (activeView && activeView.file) {
          targetFile = activeView.file;
        }
      }
      let noteSaveSuccess = false;
      if (targetFile) {
        noteSaveSuccess = await this.markdownWriter.writeFlashcardsToNote(targetFile, flashcards);
      }
      let ankiStatus = "";
      if (this.settings.autoSyncToAnki) {
        try {
          const ankiResult = await this.ankiService.syncFlashcards(flashcards, deckName);
          if (ankiResult.synced === flashcards.length) {
            ankiStatus = ` • ✅ Synced to Anki (${deckName})`;
          } else if (ankiResult.synced > 0) {
            ankiStatus = ` • ⚠️ ${ankiResult.synced} synced, ${ankiResult.queued} queued (${deckName})`;
          } else if (ankiResult.queued > 0) {
            ankiStatus = ` • ⏳ Queued for later sync (${deckName})`;
          } else if (ankiResult.errors > 0) {
            ankiStatus = ` • ❌ Anki sync failed`;
          }
        } catch (error) {
          console.error("Anki sync error:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          ankiStatus = ` • ❌ Anki sync failed: ${errorMessage}`;
        }
      }
      waitingNotice.hide();
      let resultMessage = "";
      if (noteSaveSuccess) {
        resultMessage += `✅ Saved ${flashcards.length} flashcard(s) to note`;
      } else {
        resultMessage += `❌ Failed to save flashcards to note`;
      }
      resultMessage += ankiStatus;
      new obsidian.Notice(resultMessage);
    } catch (error) {
      waitingNotice.hide();
      const errorMessage = error instanceof Error ? error.message : String(error);
      new obsidian.Notice(`❌ Error saving flashcards: ${errorMessage}`);
      console.error("Save and sync error:", error);
    }
  }
  /**
   * Start automatic queue processing
   */
  startQueueProcessing() {
    this.queueProcessInterval = this.ankiService.startAutoProcessing(3e5);
  }
  /**
   * Load plugin settings
   */
  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }
  /**
   * Save plugin settings
   */
  async saveSettings() {
    await this.saveData(this.settings);
    this.groqService.updateSettings(this.settings);
    this.ankiService.updateSettings(this.settings);
    this.ankiService.updateApp(this.app);
    if (this.queueProcessInterval) {
      this.ankiService.stopAutoProcessing(this.queueProcessInterval);
    }
    if (this.settings.enableOfflineQueue) {
      this.startQueueProcessing();
    }
  }
}
module.exports = ObsiCardPlugin;
