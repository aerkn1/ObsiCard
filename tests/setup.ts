/**
 * Vitest setup file
 */

import { vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock Obsidian API - handled by vite config alias

// Mock global fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

global.localStorage = localStorageMock as Storage;

// Mock window methods
global.setInterval = vi.fn((callback, delay) => {
  return 123 as NodeJS.Timeout;
});

global.clearInterval = vi.fn();

// Setup DOM
if (typeof document === 'undefined') {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.document = dom.window.document;
  global.window = dom.window as Window & typeof globalThis;
}

