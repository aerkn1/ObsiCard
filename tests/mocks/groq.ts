/**
 * Mock Groq API responses for testing
 */

export const mockFlashcardResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify([
          {
            front: 'What is photosynthesis?',
            back: 'Photosynthesis is the process by which plants convert light energy into chemical energy.',
            tags: ['biology', 'science']
          },
          {
            front: 'What are the main products of photosynthesis?',
            back: 'The main products are glucose (sugar) and oxygen.',
            tags: ['biology', 'science']
          }
        ])
      }
    }
  ]
};

export const mockSummaryResponse = {
  choices: [
    {
      message: {
        content: 'This is a summary of the provided content focusing on key concepts.'
      }
    }
  ]
};

export const mockInvalidResponse = {
  choices: [
    {
      message: {
        content: 'Invalid response without proper JSON'
      }
    }
  ]
};

export const mockMalformedJsonResponse = {
  choices: [
    {
      message: {
        content: '[{front: "Question", back: "Answer"}]' // Missing quotes
      }
    }
  ]
};

export const mockEmptyResponse = {
  choices: [
    {
      message: {
        content: '[]'
      }
    }
  ]
};

export function createMockFetch(response: any, shouldFail = false) {
  return async (url: string, options?: any) => {
    if (shouldFail) {
      throw new Error('Network error');
    }

    return {
      ok: true,
      status: 200,
      json: async () => response,
      text: async () => JSON.stringify(response)
    };
  };
}

