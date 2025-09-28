/**
 * Completion provider for icon font classes
 */

import * as vscode from 'vscode';
import { IconFontData } from '../types';
import { EXTENSION_CONFIG } from '../constants';

export class IconFontCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private iconFontData: IconFontData | null) {}

  /**
   * Update the icon font data
   */
  updateIconFontData(data: IconFontData | null): void {
    this.iconFontData = data;
  }

  /**
   * Provide completion items
   */
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    if (!this.iconFontData) {
      return [];
    }

    const completionItems: vscode.CompletionItem[] = [];

    // Add icon font class completions
    this.iconFontData.glyphs.forEach(glyph => {
      const className = `${this.iconFontData!.css_prefix_text}${glyph.font_class}`;
      
      const completionItem = new vscode.CompletionItem(
        className,
        vscode.CompletionItemKind.Class
      );
      
      completionItem.detail = `Icon: ${glyph.name}`;
      completionItem.documentation = new vscode.MarkdownString(
        `**${glyph.name}**\n\n` +
        `- Class: \`${className}\`\n` +
        `- Unicode: \\u${glyph.unicode}\n` +
        `- Decimal: ${glyph.unicode_decimal}`
      );
      
      completionItem.insertText = className;
      completionItem.sortText = glyph.name;
      
      completionItems.push(completionItem);
    });

    return completionItems;
  }

  /**
   * Resolve completion item
   */
  resolveCompletionItem?(
    item: vscode.CompletionItem,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CompletionItem> {
    // Additional resolution logic can be added here if needed
    return item;
  }
}
