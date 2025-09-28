/**
 * Main extension class that orchestrates all components
 */

import * as vscode from 'vscode';
import { ExtensionStateManager } from './state/ExtensionStateManager';
import { FontLoaderService } from './services/FontLoaderService';
import { WebviewPanelManager } from './panels/WebviewPanelManager';
import { IconFontCompletionProvider } from './providers/IconFontCompletionProvider';
import { EXTENSION_CONFIG } from './constants';

export class SmartIconFontExtension {
  private stateManager: ExtensionStateManager;
  private fontLoader: FontLoaderService;
  private panelManager: WebviewPanelManager;
  private completionProvider: IconFontCompletionProvider;
  private textChangeListener: vscode.Disposable | null = null;

  constructor(private context: vscode.ExtensionContext) {
    this.stateManager = new ExtensionStateManager();
    this.fontLoader = new FontLoaderService();
    this.panelManager = new WebviewPanelManager(this.stateManager);
    this.completionProvider = new IconFontCompletionProvider(null);
  }

  /**
   * Initialize the extension
   */
  async initialize(): Promise<void> {
    console.log('activate');
    console.log(EXTENSION_CONFIG.MESSAGES.ACTIVATION_SUCCESS);

    // Register commands
    this.registerCommands();

    // Register completion provider
    this.registerCompletionProvider();

    // Register text change listener
    this.registerTextChangeListener();
  }

  /**
   * Register all commands
   */
  private registerCommands(): void {
    // Hello World command
    const helloWorldCommand = vscode.commands.registerCommand(
      EXTENSION_CONFIG.COMMANDS.HELLO_WORLD,
      () => {
        vscode.window.showInformationMessage('Hello World from smartdsdaIconfont!');
      }
    );

    // Load Font command
    const loadFontCommand = vscode.commands.registerCommand(
      EXTENSION_CONFIG.COMMANDS.LOAD_FONT,
      () => this.handleLoadFont()
    );

    // Show Icon Panel command
    const showIconPanelCommand = vscode.commands.registerCommand(
      EXTENSION_CONFIG.COMMANDS.SHOW_ICON_PANEL,
      () => this.handleShowIconPanel()
    );

    // Add to subscriptions
    this.context.subscriptions.push(helloWorldCommand);
    this.context.subscriptions.push(loadFontCommand);
    this.context.subscriptions.push(showIconPanelCommand);
  }

  /**
   * Register completion provider
   */
  private registerCompletionProvider(): void {
    const provider = vscode.languages.registerCompletionItemProvider(
      EXTENSION_CONFIG.COMPLETION.LANGUAGE_ID,
      this.completionProvider,
      EXTENSION_CONFIG.COMPLETION.TRIGGER_CHARACTER
    );

    this.context.subscriptions.push(provider);
  }

  /**
   * Register text change listener for auto-showing panel
   */
  private registerTextChangeListener(): void {
    this.textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
      this.handleTextChange(event);
    });

    this.context.subscriptions.push(this.textChangeListener);
  }

  /**
   * Handle load font command
   */
  private async handleLoadFont(): Promise<void> {
    try {
      const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      vscode.window.showInformationMessage(`scan work space: ${workspacePath}`);

      const result = await this.fontLoader.loadFont();

      if (result.success && result.data) {
        // Validate the data
        if (!this.fontLoader.validateIconFontData(result.data)) {
          vscode.window.showErrorMessage('Invalid icon font data format');
          return;
        }

        // Update state
        this.stateManager.setIconFontData(result.data, result.fontBuffer || null);
        
        // Update completion provider
        this.completionProvider.updateIconFontData(result.data);

        console.log('jsonFileContent:', result.data);
        vscode.window.showInformationMessage(EXTENSION_CONFIG.MESSAGES.FONT_LOADED_SUCCESS);
      } else {
        vscode.window.showInformationMessage(
          result.error || EXTENSION_CONFIG.MESSAGES.FONT_NOT_FOUND
        );
      }
    } catch (error) {
      console.error('Error loading font:', error);
      vscode.window.showErrorMessage(`Error loading font: ${error}`);
    }
  }

  /**
   * Handle show icon panel command
   */
  private handleShowIconPanel(): void {
    if (!this.stateManager.hasValidFontData()) {
      vscode.window.showErrorMessage(EXTENSION_CONFIG.MESSAGES.LOAD_FONT_FIRST);
      return;
    }

    // Save current editor and position
    const editor = vscode.window.activeTextEditor;
    const position = editor?.selection.active;

    // Create panel
    this.panelManager.createIconPanel(
      this.context.extensionUri,
      this.stateManager.iconFontJson!,
      this.stateManager.iconFontTtf!,
      editor,
      position
    );
  }

  /**
   * Handle text change events for auto-showing panel
   */
  private handleTextChange(event: vscode.TextDocumentChangeEvent): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    const position = editor.selection.active;

    // Check characters before cursor
    const startPosition = position.with(
      position.line,
      Math.max(0, position.character - EXTENSION_CONFIG.TEXT_DETECTION.LOOKBACK_CHARS)
    );
    const range = new vscode.Range(startPosition, position);
    const textBeforeCursor = document.getText(range);

    if (textBeforeCursor.includes(EXTENSION_CONFIG.TEXT_DETECTION.TRIGGER_WORD)) {
      // Show panel if not already open and font data is available
      if (!this.stateManager.currentPanel && this.stateManager.hasValidFontData()) {
        // Save current editor and position
        this.stateManager.setSavedEditor(editor, position);
        
        // Create panel
        this.panelManager.createIconPanel(
          this.context.extensionUri,
          this.stateManager.iconFontJson!,
          this.stateManager.iconFontTtf!,
          editor,
          position
        );
      }
    } else {
      // Hide panel
      if (this.stateManager.currentPanel) {
        this.stateManager.clearPanel();
      }
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stateManager.reset();
    this.textChangeListener?.dispose();
  }
}
