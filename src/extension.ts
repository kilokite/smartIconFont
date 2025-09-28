// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SmartIconFontExtension } from './SmartIconFontExtension';

// Global extension instance
let extension: SmartIconFontExtension | null = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	try {
		extension = new SmartIconFontExtension(context);
		await extension.initialize();
	} catch (error) {
		console.error('Failed to activate extension:', error);
		vscode.window.showErrorMessage(`Failed to activate extension: ${error}`);
	}
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (extension) {
		extension.dispose();
		extension = null;
	}
}
