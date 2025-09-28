/**
 * Service for loading and managing icon font files
 */

import * as vscode from 'vscode';
import { IconFontData, FontFileResult, LoadFontResult } from '../types';
import { EXTENSION_CONFIG } from '../constants';

export class FontLoaderService {
  /**
   * Find icon font files in the workspace
   */
  async findFontFiles(): Promise<FontFileResult> {
    try {
      const [ttfFiles, jsonFiles] = await Promise.all([
        vscode.workspace.findFiles(EXTENSION_CONFIG.FILES.ICONFONT_TTF),
        vscode.workspace.findFiles(EXTENSION_CONFIG.FILES.ICONFONT_JSON),
      ]);

      return {
        ttfFile: ttfFiles[0],
        jsonFile: jsonFiles[0],
      };
    } catch (error) {
      console.error('Error finding font files:', error);
      return {};
    }
  }

  /**
   * Load icon font data from files
   */
  async loadFontData(files: FontFileResult): Promise<LoadFontResult> {
    try {
      if (!files.jsonFile) {
        return {
          success: false,
          error: 'No iconfont.json file found',
        };
      }

      // Load JSON data
      const jsonContent = await vscode.workspace.fs.readFile(files.jsonFile);
      const iconFontData: IconFontData = JSON.parse(jsonContent.toString());

      // Load TTF data if available
      let fontBuffer: Uint8Array | undefined;
      if (files.ttfFile) {
        fontBuffer = await vscode.workspace.fs.readFile(files.ttfFile);
      }

      return {
        success: true,
        data: iconFontData,
        fontBuffer,
      };
    } catch (error) {
      console.error('Error loading font data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Load icon font from workspace
   */
  async loadFont(): Promise<LoadFontResult> {
    try {
      const files = await this.findFontFiles();
      
      if (!files.jsonFile && !files.ttfFile) {
        return {
          success: false,
          error: 'No icon font files found in workspace',
        };
      }

      return await this.loadFontData(files);
    } catch (error) {
      console.error('Error loading font:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate icon font data
   */
  validateIconFontData(data: IconFontData): boolean {
    return (
      typeof data === 'object' &&
      typeof data.font_family === 'string' &&
      typeof data.css_prefix_text === 'string' &&
      Array.isArray(data.glyphs) &&
      data.glyphs.every(glyph => 
        typeof glyph.font_class === 'string' &&
        typeof glyph.unicode === 'string' &&
        typeof glyph.unicode_decimal === 'number' &&
        typeof glyph.name === 'string'
      )
    );
  }
}
