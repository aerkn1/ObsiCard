/**
 * Mock implementations for Obsidian API
 */

export class Notice {
  message: string;
  timeout: number;

  constructor(message: string, timeout?: number) {
    this.message = message;
    this.timeout = timeout || 5000;
  }

  hide(): void {
    // Mock implementation
  }
}

export class Plugin {
  app: App;
  manifest: unknown;

  loadData(): Promise<unknown> {
    return Promise.resolve({});
  }

  saveData(data: unknown): Promise<void> {
    return Promise.resolve();
  }

  addCommand(command: unknown): void {
    // Mock implementation
  }

  addSettingTab(tab: unknown): void {
    // Mock implementation
  }

  addRibbonIcon(icon: string, title: string, callback: () => void): unknown {
    return {};
  }

  registerEvent(event: unknown): void {
    // Mock implementation
  }
}

export class TFile {
  path: string;
  basename: string;
  extension: string;

  constructor(path: string) {
    this.path = path;
    this.basename = path.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    this.extension = path.split('.').pop() || '';
  }
}

export class Modal {
  app: App;
  contentEl: HTMLDivElement;

  constructor(app: App) {
    this.app = app;
    this.contentEl = document.createElement('div');
  }

  open(): void {
    this.onOpen();
  }

  close(): void {
    this.onClose();
  }

  onOpen(): void {
    // Override in subclass
  }

  onClose(): void {
    // Override in subclass
  }
}

export class Setting {
  settingEl: HTMLDivElement;

  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement('div');
    containerEl.appendChild(this.settingEl);
  }

  setName(name: string): this {
    return this;
  }

  setDesc(desc: string): this {
    return this;
  }

  addText(callback: (text: { inputEl: HTMLInputElement; setPlaceholder: (placeholder: string) => unknown; setValue: (value: string) => unknown; onChange: (callback: (value: string) => void) => unknown }) => void): this {
    const text = {
      inputEl: document.createElement('input'),
      setPlaceholder: (placeholder: string) => text,
      setValue: (value: string) => text,
      onChange: (callback: (value: string) => void) => text
    };
    callback(text);
    return this;
  }

  addToggle(callback: (toggle: { setValue: (value: boolean) => unknown; onChange: (callback: (value: boolean) => void) => unknown }) => void): this {
    const toggle = {
      setValue: (value: boolean) => toggle,
      onChange: (callback: (value: boolean) => void) => toggle
    };
    callback(toggle);
    return this;
  }

  addDropdown(callback: (dropdown: { addOption: (value: string, text: string) => unknown; setValue: (value: string) => unknown; onChange: (callback: (value: string) => void) => unknown }) => void): this {
    const dropdown = {
      addOption: (value: string, text: string) => dropdown,
      setValue: (value: string) => dropdown,
      onChange: (callback: (value: string) => void) => dropdown
    };
    callback(dropdown);
    return this;
  }

  addButton(callback: (button: { buttonEl: HTMLButtonElement; setButtonText: (text: string) => unknown; onClick: (callback: () => void) => unknown; setWarning: () => unknown }) => void): this {
    const button = {
      buttonEl: document.createElement('button'),
      setButtonText: (text: string) => button,
      onClick: (callback: () => void) => button,
      setWarning: () => button
    };
    callback(button);
    return this;
  }
}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLDivElement;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }

  display(): void {
    // Override in subclass
  }
}

export class MarkdownView {
  file: TFile | null = null;

  getViewType(): string {
    return 'markdown';
  }
}

export class Menu {
  addItem(callback: (item: { setTitle: (title: string) => unknown; setIcon: (icon: string) => unknown; onClick: (callback: () => void) => unknown }) => void): this {
    const item = {
      setTitle: (title: string) => item,
      setIcon: (icon: string) => item,
      onClick: (callback: () => void) => item
    };
    callback(item);
    return this;
  }
}

export class App {
  vault: { read: (file: TFile) => Promise<string>; modify: (file: TFile, content: string) => Promise<void> };
  workspace: { getActiveViewOfType: (type: unknown) => unknown; on: (event: string, callback: unknown) => void };

  constructor() {
    this.vault = {
      read: (file: TFile) => Promise.resolve(''),
      modify: (file: TFile, content: string) => Promise.resolve()
    };

    this.workspace = {
      getActiveViewOfType: (type: unknown) => null,
      on: (event: string, callback: unknown) => {}
    };
  }
}

