/**
 * Manager for webview panel creation and interaction
 */

import * as vscode from 'vscode';
import { IconFontData, WebviewMessage } from '../types';
import { EXTENSION_CONFIG, WEBVIEW_CONFIG } from '../constants';
import { ExtensionStateManager } from '../state/ExtensionStateManager';

export class WebviewPanelManager {
  private isInsertingIcon = false; // 标志是否正在插入图标
  private insertAfterClose: { editor: vscode.TextEditor; position: vscode.Position } | null = null; // 插入后需要设置的光标位置

  constructor(private stateManager: ExtensionStateManager) {}

  /**
   * Create and configure the icon panel
   */
  createIconPanel(
    extensionUri: vscode.Uri,
    iconFontJson: IconFontData,
    iconFontTtf?: Uint8Array,
    savedEditor?: vscode.TextEditor | null,
    savedPosition?: vscode.Position | null
  ): vscode.WebviewPanel {
    // Dispose existing panel if any
    if (this.stateManager.currentPanel) {
      this.stateManager.currentPanel.dispose();
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      EXTENSION_CONFIG.PANEL.ID,
      EXTENSION_CONFIG.PANEL.TITLE,
      vscode.ViewColumn.Beside,
      {
        enableScripts: WEBVIEW_CONFIG.ENABLE_SCRIPTS,
        retainContextWhenHidden: WEBVIEW_CONFIG.RETAIN_CONTEXT_WHEN_HIDDEN,
      }
    );

    // Set HTML content
    panel.webview.html = this.getWebviewContent(iconFontJson, iconFontTtf);

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      (message: WebviewMessage) => this.handleWebviewMessage(message, savedEditor, savedPosition, panel)
    );

    // Handle panel disposal
    panel.onDidDispose(() => {
      // 只有在不是插入图标的情况下才恢复光标位置
      if (!this.isInsertingIcon) {
        this.restoreCursorPosition();
      } else if (this.insertAfterClose) {
        // 如果是插入图标，设置插入后的光标位置
        this.setCursorPosition(this.insertAfterClose.editor, this.insertAfterClose.position);
        this.insertAfterClose = null;
      }
      // 重置插入标志
      this.isInsertingIcon = false;
      this.stateManager.clearPanel();
    });

    // Update state
    this.stateManager.setCurrentPanel(panel);
    this.stateManager.setSavedEditor(savedEditor || null, savedPosition || null);

    return panel;
  }

  /**
   * Handle messages from webview
   */
  private handleWebviewMessage(
    message: WebviewMessage,
    savedEditor: vscode.TextEditor | null | undefined,
    savedPosition: vscode.Position | null | undefined,
    panel: vscode.WebviewPanel
  ): void {
    console.log('收到WebView消息:', message);

    switch (message.command) {
      case 'copyIcon':
        this.handleCopyIcon(message.text || '');
        break;
      case 'insertIcon':
        this.handleInsertIcon(message.text || '', savedEditor, savedPosition, panel);
        break;
      case 'closePanel':
        this.handleClosePanel(panel);
        break;
      default:
        console.warn('Unknown webview message command:', message.command);
    }
  }

  /**
   * Handle copy icon command
   */
  private handleCopyIcon(text: string): void {
    vscode.env.clipboard.writeText(text);
    vscode.window.showInformationMessage(`${EXTENSION_CONFIG.MESSAGES.COPY_SUCCESS}${text}`);
  }

  /**
   * Handle close panel command
   */
  private handleClosePanel(panel: vscode.WebviewPanel): void {
    // 恢复指针状态到保存的编辑器位置
    this.restoreCursorPosition();
    panel.dispose();
  }

  /**
   * Restore cursor position to saved editor (moved one character forward)
   */
  private restoreCursorPosition(): void {
    const savedEditor = this.stateManager.savedEditor;
    const savedPosition = this.stateManager.savedPosition;
    
    if (savedEditor && savedPosition) {
      // 恢复光标位置时向后移动一个字符
      const restoredPosition = new vscode.Position(savedPosition.line, savedPosition.character + 1);
      this.setCursorPosition(savedEditor, restoredPosition);
    }
  }

  /**
   * Set cursor position in editor
   */
  private setCursorPosition(editor: vscode.TextEditor, position: vscode.Position): void {
    // 激活编辑器
    vscode.window.showTextDocument(editor.document, {
      viewColumn: editor.viewColumn,
      preserveFocus: false,
      selection: new vscode.Selection(position, position)
    }).then(() => {
      // 设置光标位置
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    });
  }

  /**
   * Handle insert icon command
   */
  private handleInsertIcon(
    text: string,
    savedEditor: vscode.TextEditor | null | undefined,
    savedPosition: vscode.Position | null | undefined,
    panel: vscode.WebviewPanel
  ): void {
    savedPosition = savedPosition || new vscode.Position(0, 0);
    savedPosition = new vscode.Position(savedPosition.line, savedPosition.character+1);
    console.log('保存的编辑器:', savedEditor ? '存在' : '不存在');

    console.log('保存的位置:', savedPosition.line);
    console.log('插入内容:', text);

    if (!savedEditor || !savedPosition) {
      vscode.window.showErrorMessage(EXTENSION_CONFIG.MESSAGES.NO_SAVED_EDITOR);
      return;
    }

    savedEditor.edit((editBuilder: vscode.TextEditorEdit) => {
      editBuilder.insert(savedPosition!, text);
    }).then(
      (success: boolean) => {
        console.log('插入结果:', success);
        if (success) {
          vscode.window.showInformationMessage(`${EXTENSION_CONFIG.MESSAGES.INSERT_SUCCESS}${text}`);
          
          // 计算插入后的光标位置
          const insertedTextLength = text.length;
          const newPosition = new vscode.Position(savedPosition!.line, savedPosition!.character + insertedTextLength);
          
          // 保存插入后的光标位置，在面板关闭后设置
          this.insertAfterClose = {
            editor: savedEditor,
            position: newPosition
          };
          
          // 标记正在插入图标，关闭面板时不恢复原来的光标位置
          this.isInsertingIcon = true;
          panel.dispose();
        } else {
          vscode.window.showErrorMessage(EXTENSION_CONFIG.MESSAGES.INSERT_FAILED);
        }
      },
      (error: any) => {
        console.error('插入错误:', error);
        vscode.window.showErrorMessage(`${EXTENSION_CONFIG.MESSAGES.INSERT_ERROR}${error}`);
      }
    );
  }

  /**
   * Generate webview HTML content
   */
  private getWebviewContent(iconFontJson: IconFontData, fontBuffer?: Uint8Array): string {
    const glyphs = iconFontJson.glyphs || [];
    const fontFamily = iconFontJson.font_family || 'iconfont';
    const cssPrefix = iconFontJson.css_prefix_text || 'icon-';

    // Convert font to base64
    let fontBase64 = '';
    if (fontBuffer) {
      fontBase64 = Buffer.from(fontBuffer).toString('base64');
    }

    return this.generateHTML(fontFamily, cssPrefix, glyphs, fontBase64);
  }

  /**
   * Generate the complete HTML content for the webview
   */
  private generateHTML(fontFamily: string, cssPrefix: string, glyphs: any[], fontBase64: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Icon Font 图标面板</title>
    <style>
        ${this.generateCSS(fontFamily, fontBase64)}
    </style>
</head>
<body>
    ${this.generateBodyHTML(fontFamily, cssPrefix, glyphs, fontBase64)}
    <script>
        ${this.generateJavaScript(cssPrefix)}
    </script>
</body>
</html>`;
  }

  /**
   * Generate CSS styles
   */
  private generateCSS(fontFamily: string, fontBase64: string): string {
    return `
        ${fontBase64 ? `
        @font-face {
            font-family: '${fontFamily}';
            src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
            font-weight: normal;
            font-style: normal;
        }
        ` : ''}
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        
        .header {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 24px;
            color: var(--vscode-foreground);
        }
        
        .header .info {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
        }
        
        .search-box {
            width: 100%;
            padding: 8px 12px;
            margin-bottom: 15px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-size: 14px;
            outline: none;
        }
        
        .search-box:focus {
            border-color: var(--vscode-focusBorder);
        }
        
        .icon-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .icon-item {
            display: flex;
            align-items: flex-start;
            padding: 10px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            background-color: var(--vscode-list-hoverBackground);
            cursor: pointer;
            transition: all 0.2s ease;
            min-height: 60px;
        }
        
        .icon-item:hover {
            background-color: var(--vscode-list-activeSelectionBackground);
            border-color: var(--vscode-focusBorder);
        }
        
        .icon-item.selected {
            background-color: var(--vscode-list-activeSelectionBackground);
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 1px var(--vscode-focusBorder);
        }
        
        .icon-preview {
            width: 36px;
            height: 36px;
            margin-right: 12px;
            margin-top: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            background-color: var(--vscode-button-background);
            border-radius: 4px;
            color: var(--vscode-button-foreground);
            font-family: '${fontFamily}', sans-serif;
            flex-shrink: 0;
        }
        
        .icon-info {
            flex: 1;
            min-width: 0;
        }
        
        .icon-name {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
            color: var(--vscode-foreground);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .icon-class {
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 12px;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 2px;
        }
        
        .icon-unicode {
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        
        .actions {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-left: 8px;
            margin-top: 2px;
        }
        
        .btn {
            padding: 3px 6px;
            border: 1px solid var(--vscode-button-border);
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-radius: 3px;
            font-size: 10px;
            cursor: pointer;
            outline: none;
            white-space: nowrap;
            min-width: 40px;
        }
        
        .btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .btn:active {
            background-color: var(--vscode-button-background);
        }
        
        .help-text {
            margin-top: 15px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            background-color: var(--vscode-textBlockQuote-background);
            padding: 8px 10px;
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
            text-align: center;
        }
        
        .no-results {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            margin-top: 40px;
        }
        
        /* 滚动条样式 */
        .icon-list::-webkit-scrollbar {
            width: 8px;
        }
        
        .icon-list::-webkit-scrollbar-track {
            background: var(--vscode-scrollbarSlider-background);
        }
        
        .icon-list::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-activeBackground);
            border-radius: 4px;
        }
        
        .icon-list::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-hoverBackground);
        }
    `;
  }

  /**
   * Generate body HTML
   */
  private generateBodyHTML(fontFamily: string, cssPrefix: string, glyphs: any[], fontBase64: string): string {
    return `
    <div class="header">
        <h1>Icon Font 图标面板</h1>
        <div class="info">
            字体族: ${fontFamily} | 
            CSS前缀: ${cssPrefix} | 
            图标数量: ${glyphs.length} | 
            ${fontBase64 ? '<span style="color: var(--vscode-testing-iconPassed);">✅ 字体已加载</span>' : '<span style="color: var(--vscode-testing-iconFailed);">❌ 字体未加载</span>'}
        </div>
    </div>
    
    <input type="text" class="search-box" id="searchBox" placeholder="搜索图标名称或类名...">
    
    <div class="icon-list" id="iconList">
        ${glyphs.map((glyph: any, index: number) => `
            <div class="icon-item" data-index="${index}" data-class="${cssPrefix}${glyph.font_class}">
                <div class="icon-preview">
                    ${fontBase64 ? `&#x${glyph.unicode};` : `<span style="font-size: 12px; color: var(--vscode-descriptionForeground);">\\u${glyph.unicode}</span>`}
                </div>
                <div class="icon-info">
                    <div class="icon-name">${glyph.name}</div>
                    <div class="icon-class">${cssPrefix}${glyph.font_class}</div>
                    <div class="icon-unicode">\\u${glyph.unicode} (${glyph.unicode_decimal})</div>
                </div>
                <div class="actions">
                    <button class="btn" onclick="copyIcon('${cssPrefix}${glyph.font_class}')">复制</button>
                    <button class="btn" onclick="insertIcon('${cssPrefix}${glyph.font_class}')">插入</button>
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="help-text">
        使用 ↑↓ 键选择图标 | Enter 插入并关闭 | ESC 关闭面板 | Backspace 关闭面板 | 点击按钮操作
    </div>
    `;
  }

  /**
   * Generate JavaScript code
   */
  private generateJavaScript(cssPrefix: string): string {
    return `
        const vscode = acquireVsCodeApi();
        let selectedIndex = 0;
        let filteredItems = [];
        
        function updateFilteredItems() {
            const items = document.querySelectorAll('.icon-item');
            filteredItems = Array.from(items).filter(item => 
                item.style.display !== 'none'
            );
        }
        
        function updateSelection() {
            const items = document.querySelectorAll('.icon-item');
            items.forEach((item, index) => {
                item.classList.remove('selected');
            });
            
            if (filteredItems.length > 0) {
                if (selectedIndex >= filteredItems.length) {
                    selectedIndex = 0;
                } else if (selectedIndex < 0) {
                    selectedIndex = filteredItems.length - 1;
                }
                
                filteredItems[selectedIndex].classList.add('selected');
                filteredItems[selectedIndex].scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
            }
        }
        
        function copyIcon(className) {
            vscode.postMessage({
                command: 'copyIcon',
                text: className
            });
        }
        
        function insertIcon(className) {
            // 去掉CSS前缀，只保留字体类名
            const fontClass = className.replace('${cssPrefix}', '');
            alert(fontClass);
            console.log('发送插入消息:', fontClass);
            vscode.postMessage({
                command: 'insertIcon',
                text: fontClass
            });
        }
        
        function closePanel() {
            vscode.postMessage({
                command: 'closePanel'
            });
        }
        
        // 搜索功能
        document.getElementById('searchBox').addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.icon-item');
            let visibleCount = 0;
            
            items.forEach(item => {
                const name = item.querySelector('.icon-name').textContent.toLowerCase();
                const className = item.querySelector('.icon-class').textContent.toLowerCase();
                
                if (name.includes(searchTerm) || className.includes(searchTerm)) {
                    item.style.display = 'flex';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                }
            });
            
            updateFilteredItems();
            selectedIndex = 0;
            updateSelection();
            
            // 显示无结果提示
            let noResults = document.querySelector('.no-results');
            if (visibleCount === 0 && searchTerm) {
                if (!noResults) {
                    noResults = document.createElement('div');
                    noResults.className = 'no-results';
                    noResults.textContent = '没有找到匹配的图标';
                    document.getElementById('iconList').appendChild(noResults);
                }
            } else if (noResults) {
                noResults.remove();
            }
        });
        
        // 键盘事件监听
        document.addEventListener('keydown', function(e) {
            const searchBox = document.getElementById('searchBox');
            const isSearchBoxFocused = document.activeElement === searchBox;
            
            // 如果是字母或数字键，激活搜索框
            if (!isSearchBoxFocused && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
                searchBox.focus();
                searchBox.value += e.key;
                searchBox.dispatchEvent(new Event('input'));
                e.preventDefault();
                return;
            }
            
            // 处理特殊按键，无论焦点在哪里都要处理
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    selectedIndex--;
                    updateSelection();
                    // 移除搜索框焦点
                    searchBox.blur();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    selectedIndex++;
                    updateSelection();
                    // 移除搜索框焦点
                    searchBox.blur();
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredItems.length > 0) {
                        const selectedItem = filteredItems[selectedIndex];
                        const className = selectedItem.dataset.class;
                        // 直接插入CSS类名（不需要Ctrl键）
                        insertIcon(className);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    // ESC键关闭面板
                    closePanel();
                    break;
                case 'Backspace':
                    // Backspace键关闭面板（无论焦点在哪里）
                    e.preventDefault();
                    closePanel();
                    break;
            }
        });
        
        // 鼠标点击选择
        document.querySelectorAll('.icon-item').forEach((item, index) => {
            item.addEventListener('click', function() {
                selectedIndex = filteredItems.indexOf(this);
                updateSelection();
            });
        });
        
        // 初始化
        updateFilteredItems();
        updateSelection();
    `;
  }
}
