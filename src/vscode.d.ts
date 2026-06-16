declare module "vscode" {
  export type Disposable = {
    dispose(): void;
  };

  export type OutputChannel = Disposable & {
    appendLine(value: string): void;
  };

  export type ExtensionContext = {
    subscriptions: Disposable[];
    globalStorageUri: Uri;
  };

  export type WorkspaceFolder = {
    uri: Uri;
    name: string;
    index: number;
  };

  export class Uri {
    fsPath: string;
    static joinPath(base: Uri, ...pathSegments: string[]): Uri;
  }

  export namespace commands {
    function registerCommand(command: string, callback: (...args: unknown[]) => unknown): Disposable;
  }

  export namespace window {
    function createOutputChannel(name: string): OutputChannel;
    function showErrorMessage(message: string): Thenable<string | undefined>;
    function showInformationMessage(message: string): Thenable<string | undefined>;
    function showInputBox(options?: {
      title?: string;
      prompt?: string;
      validateInput?: (value: string) => string | null | undefined | Thenable<string | null | undefined>;
    }): Thenable<string | undefined>;
    function showOpenDialog(options?: {
      title?: string;
      canSelectFiles?: boolean;
      canSelectFolders?: boolean;
      canSelectMany?: boolean;
      filters?: Record<string, string[]>;
    }): Thenable<Uri[] | undefined>;
    function showSaveDialog(options?: { defaultUri?: Uri; filters?: Record<string, string[]> }): Thenable<Uri | undefined>;
    function showTextDocument(document: TextDocument, options?: { preview?: boolean }): Thenable<TextEditor>;
  }

  export namespace workspace {
    const workspaceFolders: readonly WorkspaceFolder[] | undefined;
    const fs: {
      writeFile(uri: Uri, content: Uint8Array): Thenable<void>;
    };
    function getConfiguration(section?: string): {
      get<T>(key: string): T | undefined;
    };
    function openTextDocument(options: { language?: string; content: string }): Thenable<TextDocument>;
  }

  export type TextDocument = unknown;
  export type TextEditor = unknown;
}
