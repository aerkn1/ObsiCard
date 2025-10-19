/**
 * Mock AnkiConnect API responses for testing
 */

export const mockVersionResponse = {
  result: 6,
  error: null
};

export const mockDeckNamesResponse = {
  result: ['Default', 'ObsiCard', 'My Deck'],
  error: null
};

export const mockCreateDeckResponse = {
  result: 1234567890,
  error: null
};

export const mockAddNoteResponse = {
  result: 1234567890123,
  error: null
};

export const mockAddNoteErrorResponse = {
  result: null,
  error: 'Duplicate note'
};

export const mockConnectionError = {
  result: null,
  error: 'Connection failed'
};

export function createMockAnkiConnectFetch(response: any, shouldFail = false) {
  return async (url: string, options?: any) => {
    if (shouldFail) {
      throw new Error('Connection refused');
    }

    if (!url.includes('8765')) {
      throw new Error('Invalid URL');
    }

    return {
      ok: true,
      status: 200,
      json: async () => response,
      text: async () => JSON.stringify(response)
    };
  };
}

export function createMockAnkiConnectHandler() {
  const state = {
    decks: ['Default'],
    notes: [] as any[]
  };

  return async (url: string, options?: any) => {
    const body = JSON.parse(options.body);
    const action = body.action;

    switch (action) {
      case 'version':
        return {
          ok: true,
          json: async () => mockVersionResponse
        };

      case 'deckNames':
        return {
          ok: true,
          json: async () => ({
            result: state.decks,
            error: null
          })
        };

      case 'createDeck':
        if (!state.decks.includes(body.params.deck)) {
          state.decks.push(body.params.deck);
        }
        return {
          ok: true,
          json: async () => mockCreateDeckResponse
        };

      case 'addNote':
        state.notes.push(body.params.note);
        return {
          ok: true,
          json: async () => mockAddNoteResponse
        };

      default:
        return {
          ok: true,
          json: async () => ({
            result: null,
            error: 'Unknown action'
          })
        };
    }
  };
}

