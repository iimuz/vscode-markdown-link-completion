import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

/**
 * 拡張機能をアクティブ化します。
 * 拡張機能は、コマンドが初めて実行されたときにアクティブ化されます。
 *
 * @param context - VS Code の拡張機能コンテキスト
 */
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider("markdown", {
      provideCompletionItems(
        document: vscode.TextDocument,
        // position: vscode.Position,
        // token: vscode.CancellationToken,
        // context: vscode.CompletionContext,
      ) {
        // カーソルの位置がリンクテキストの中にない場合は何もしない
        const linePrefix = document
          .lineAt(position)
          .text.substring(0, position.character);
        const linkRegex = /\]\(([^)]*)$/; // "](..."で閉じ括弧の前にいることを検出
        if (!linkRegex.test(linePrefix)) {
          return undefined;
        }

        // 補完候補となるmarkdownファイルの一覧を取得
        const dirPath = path.dirname(document.fileName);
        const files = fs.readdirSync(dirPath);
        const markdownFiles = files.filter((file) => file.endsWith(".md"));

        const completionItems = markdownFiles.map((file) => {
          const filePath = path.join(dirPath, file);
          const content = fs.readFileSync(filePath, "utf-8");
          const lines = content.split("\n");
          const firstLine = lines[0].trim();
          const completionItem = new vscode.CompletionItem(
            firstLine,
            vscode.CompletionItemKind.File,
          );
          completionItem.detail = file;
          completionItem.insertText = file;
          completionItem.documentation = content;
          return completionItem;
        });

        return completionItems;
      },
    }),
  );
}

/**
 * 拡張機能を無効化する関数です。
 */
export function deactivate() {}
