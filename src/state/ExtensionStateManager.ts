/**
 * Centralized state management for the Smart Iconfont extension
 */

import * as vscode from 'vscode';
import { ExtensionState, IconFontData } from '../types';

export class ExtensionStateManager {
  private state: ExtensionState;

  constructor() {
    this.state = {
      iconFontJson: null,
      iconFontTtf: null,
      isOpen: false,
      currentPanel: null,
      savedEditor: null,
      savedPosition: null,
    };
  }

  // Getters
  get iconFontJson(): IconFontData | null {
    return this.state.iconFontJson;
  }

  get iconFontTtf(): Uint8Array | null {
    return this.state.iconFontTtf;
  }

  get isOpen(): boolean {
    return this.state.isOpen;
  }

  get currentPanel(): vscode.WebviewPanel | null {
    return this.state.currentPanel;
  }

  get savedEditor(): vscode.TextEditor | null {
    return this.state.savedEditor;
  }

  get savedPosition(): vscode.Position | null {
    return this.state.savedPosition;
  }

  // Setters
  setIconFontData(json: IconFontData | null, ttf: Uint8Array | null): void {
    this.state.iconFontJson = json;
    this.state.iconFontTtf = ttf;
    this.state.isOpen = json !== null && ttf !== null;
  }

  setCurrentPanel(panel: vscode.WebviewPanel | null): void {
    this.state.currentPanel = panel;
  }

  setSavedEditor(editor: vscode.TextEditor | null, position: vscode.Position | null): void {
    this.state.savedEditor = editor;
    this.state.savedPosition = position;
  }

  // Utility methods
  clearPanel(): void {
    if (this.state.currentPanel) {
      this.state.currentPanel.dispose();
    }
    this.state.currentPanel = null;
    this.state.savedEditor = null;
    this.state.savedPosition = null;
  }

  hasValidFontData(): boolean {
    return this.state.iconFontJson !== null && this.state.iconFontTtf !== null;
  }

  reset(): void {
    this.clearPanel();
    this.state.iconFontJson = null;
    this.state.iconFontTtf = null;
    this.state.isOpen = false;
  }
}
