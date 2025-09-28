/**
 * Constants and configuration for the Smart Iconfont extension
 */

export const EXTENSION_CONFIG = {
  COMMANDS: {
    HELLO_WORLD: 'sb-kt-smarticonfont.helloWorld',
    LOAD_FONT: 'sb-kt-smarticonfont.loadFont',
    SHOW_ICON_PANEL: 'sb-kt-smarticonfont.showIconPanel',
  },
  PANEL: {
    ID: 'iconPanel',
    TITLE: 'Icon Font 图标面板',
    VIEW_COLUMN: 'Beside' as const,
  },
  FILES: {
    ICONFONT_TTF: '**/iconfont.ttf',
    ICONFONT_JSON: '**/iconfont.json',
  },
  COMPLETION: {
    TRIGGER_CHARACTER: 'H',
    LANGUAGE_ID: 'html',
  },
  TEXT_DETECTION: {
    TRIGGER_WORD: 'icon',
    LOOKBACK_CHARS: 4,
  },
  MESSAGES: {
    ACTIVATION_SUCCESS: 'Congratulations, your extension "sb-kt-smarticonfont" is now active!',
    FONT_LOADED_SUCCESS: 'Font loaded successfully',
    FONT_NOT_FOUND: 'iconFontJson or iconFontTtf not found',
    LOAD_FONT_FIRST: '请先加载 iconFont！',
    INSERT_SUCCESS: '已插入: ',
    INSERT_FAILED: '插入失败',
    INSERT_ERROR: '插入错误: ',
    NO_SAVED_EDITOR: '没有保存的编辑器或位置',
    COPY_SUCCESS: '已复制: ',
  },
} as const;

export const WEBVIEW_CONFIG = {
  ENABLE_SCRIPTS: true,
  RETAIN_CONTEXT_WHEN_HIDDEN: true,
} as const;
