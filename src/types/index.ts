/**
 * Type definitions for the Smart Iconfont extension
 */
import type * as vscode from 'vscode';

export interface IconFontGlyph {
  font_class: string;
  unicode: string;
  unicode_decimal: number;
  name: string;
}

export interface IconFontData {
  font_family: string;
  css_prefix_text: string;
  glyphs: IconFontGlyph[];
}

export interface ExtensionState {
  iconFontJson: IconFontData | null;
  iconFontTtf: Uint8Array | null;
  isOpen: boolean;
  currentPanel: vscode.WebviewPanel | null;
  savedEditor: vscode.TextEditor | null;
  savedPosition: vscode.Position | null;
}

export interface WebviewMessage {
  command: 'copyIcon' | 'insertIcon' | 'closePanel';
  text?: string;
}

export interface FontFileResult {
  jsonFile?: vscode.Uri;
  ttfFile?: vscode.Uri;
}

export interface LoadFontResult {
  success: boolean;
  data?: IconFontData;
  fontBuffer?: Uint8Array;
  error?: string;
}
