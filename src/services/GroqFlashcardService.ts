import { Notice, requestUrl } from 'obsidian';
import { Flashcard, GroqResponse, ObsiCardSettings, GenerationMode } from '../types';
import { TokenUtils } from '../utils/TokenUtils';
import { Validator } from './Validator';

/**
 * Service for generating flashcards using Groq API
 */
export class GroqFlashcardService {
  private settings: ObsiCardSettings;
  private readonly GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(settings: ObsiCardSettings) {
    this.settings = settings;
  }

  /**
   * Update service settings
   * @param settings - New settings
   */
  updateSettings(settings: ObsiCardSettings): void {
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
  async generateFlashcards(
    content: string,
    mode: GenerationMode,
    userTags: string[],
    noteName?: string
  ): Promise<Flashcard[]> {
    if (!this.settings.groqApiKey) {
      new Notice('Please configure your Groq API key in settings');
      throw new Error('Groq API key not configured');
    }

    if (!content || content.trim().length === 0) {
      new Notice('No content provided for flashcard generation');
      throw new Error('Empty content');
    }

    try {
      // Chunk the content
      const chunkingResult = TokenUtils.chunkText(content, this.settings.maxChunkSize);
      
      // If content is very large, summarize first
      if (chunkingResult.requiresSummarization) {
        new Notice('Content is large, summarizing first...');
        content = await this.summarizeContent(content);
        // Re-chunk the summarized content
        const newChunking = TokenUtils.chunkText(content, this.settings.maxChunkSize);
        return await this.processChunks(newChunking.chunks, mode, userTags, noteName);
      }

      // Process chunks in parallel (limited by maxParallelRequests)
      return await this.processChunks(chunkingResult.chunks, mode, userTags, noteName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      new Notice(`Failed to generate flashcards: ${errorMessage}`);
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
  private async processChunks(
    chunks: Array<{ content: string; tokenCount: number; index: number }>,
    mode: GenerationMode,
    userTags: string[],
    noteName?: string
  ): Promise<Flashcard[]> {
    const allFlashcards: Flashcard[] = [];
    const maxParallel = this.settings.maxParallelRequests;

    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += maxParallel) {
      const batch = chunks.slice(i, i + maxParallel);
      const batchPromises = batch.map(chunk => 
        this.generateFromChunk(chunk.content, mode, userTags, noteName)
      );

      const results = await Promise.allSettled(batchPromises);
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allFlashcards.push(...result.value);
        } else {
          console.error('Chunk processing failed:', result.reason);
        }
      }

      // Brief delay between batches to respect rate limits
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
  private async generateFromChunk(
    content: string,
    mode: GenerationMode,
    userTags: string[],
    noteName?: string
  ): Promise<Flashcard[]> {
    const prompt = this.buildPrompt(content, mode, userTags);
    const response = await this.callGroqAPI(prompt);
    
    // Validate and repair response
    const validation = Validator.validateGroqResponse(response);
    
    if (!validation.isValid) {
      console.warn('Groq response validation failed:', validation.errors);
      // Try repair
      if (validation.repaired && validation.repaired.length > 0) {
        return this.addMetadata(validation.repaired, noteName);
      }
      throw new Error('Failed to generate valid flashcards');
    }

    return this.addMetadata(validation.repaired || [], noteName);
  }

  /**
   * Summarize large content
   * @param content - Content to summarize
   * @returns Summarized content
   */
  private async summarizeContent(content: string): Promise<string> {
    const prompt = TokenUtils.createSummaryPrompt(content);
    
    try {
      const response = await this.callGroqAPI(prompt, true);
      return typeof response === 'string' ? response : JSON.stringify(response);
    } catch (error) {
      console.error('Summarization failed:', error);
      // Fallback: truncate content
      return TokenUtils.truncateToTokenLimit(content, 8000);
    }
  }

  /**
   * Build prompt for Groq API
   * @param content - Content to generate flashcards from
   * @param mode - Generation mode
   * @param tags - Tags to use
   * @returns Formatted prompt
   */
  private buildPrompt(content: string, mode: GenerationMode, tags: string[]): string {
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

${mode === GenerationMode.DYNAMIC ? 
  'Suggest relevant tags based on the content.' : 
  `Use these tags: ${tags.join(', ')}`}

JSON array:`;

    return basePrompt;
  }

  /**
   * Call Groq API
   * @param prompt - Prompt to send
   * @param isSummary - Whether this is a summary request
   * @returns API response
   */
  private async callGroqAPI(prompt: string, isSummary = false): Promise<unknown> {
    const response = await requestUrl({
      url: this.GROQ_API_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.groqApiKey}`
      },
      body: JSON.stringify({
        model: this.settings.groqModel,
        messages: [
          {
            role: 'system',
            content: isSummary 
              ? 'You are a helpful assistant that creates concise summaries.'
              : 'You are a helpful assistant that creates educational flashcards. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: isSummary ? 2000 : 4000
      })
    });

    if (response.status !== 200) {
      const errorText = response.text;
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }

    const data = response.json as { choices?: Array<{ message?: { content?: string } }> };
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Groq API');
    }

    const content = data.choices[0].message.content;
    
    if (!content) {
      throw new Error('No content in response from Groq API');
    }
    
    if (isSummary) {
      return content;
    }

    // Try to extract JSON from response
    return this.extractJSON(content);
  }

  /**
   * Extract JSON from response text
   * @param text - Response text that may contain JSON
   * @returns Parsed JSON
   */
  private extractJSON(text: string): unknown {
    // Try direct parse first
    try {
      return JSON.parse(text);
    } catch {
      // Try to extract JSON array from text
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error('Could not extract valid JSON from response');
        }
      }
      throw new Error('No JSON found in response');
    }
  }

  /**
   * Add metadata to flashcards
   * @param flashcards - Flashcards to add metadata to
   * @param noteName - Source note name
   * @returns Flashcards with metadata
   */
  private addMetadata(flashcards: Flashcard[], noteName?: string): Flashcard[] {
    return flashcards.map(card => ({
      ...card,
      source: noteName || card.source
    }));
  }

  /**
   * Delay execution
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test API connection with detailed error reporting
   * @returns Connection test result with details
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: Record<string, unknown> }> {
    try {
      // Check if API key is provided
      if (!this.settings.groqApiKey || this.settings.groqApiKey.trim() === '') {
        return {
          success: false,
          message: 'Groq API key is not configured'
        };
      }

      // Check API key format (should start with 'gsk_')
      if (!this.settings.groqApiKey.startsWith('gsk_')) {
        return {
          success: false,
          message: 'Invalid API key format. Groq API keys should start with "gsk_"'
        };
      }

      const response = await requestUrl({
        url: this.GROQ_API_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.groqApiKey}`
        },
        body: JSON.stringify({
          model: this.settings.groqModel,
          messages: [
            {
              role: 'user',
              content: 'Test'
            }
          ],
          max_tokens: 10
        })
      });

      if (response.status !== 200) {
        const errorText = response.text;
        let errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData && typeof errorData === 'object' && 'error' in errorData) {
            const error = errorData.error as { message?: string; type?: string };
            errorMessage = error.message || error.type || errorMessage;
          }
        } catch {
          // Use the raw error text if JSON parsing fails
          errorMessage = errorText || errorMessage;
        }

        return {
          success: false,
          message: `Groq API error: ${errorMessage}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            response: errorText
          }
        };
      }

      const data = response.json;
      
      return {
        success: true,
        message: 'Successfully connected to Groq API',
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

