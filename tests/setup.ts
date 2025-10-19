/**
 * Vitest setup file
 */

import { vi } from 'vitest';

// Mock Obsidian API
vi.mock('obsidian', () => {
  const mocks = require('./mocks/obsidian');
  return mocks;
});

// Mock global fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

global.localStorage = localStorageMock as any;

// Mock window methods
global.setInterval = vi.fn((callback, delay) => {
  return 123 as any;
});

global.clearInterval = vi.fn();

// Setup DOM
if (typeof document === 'undefined') {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.document = dom.window.document;
  global.window = dom.window as any;
}

