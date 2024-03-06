import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
const readline = require("readline");

/**
 * 拡張機能をアクティブ化します。
 * 拡張機能は、コマンドが初めて実行されたときにアクティブ化されます。
 *
 * @param context - VS Code の拡張機能コンテキスト
 */
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider("markdown", {
      async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
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

        const completionItems = await Promise.all(
          markdownFiles.map(async (file) => {
            const filePath = path.join(dirPath, file);
            const fileName = path.parse(file).name;

            // 先頭10行までの内容を取得して補完候補とする
            const frontmatterHeader = "---";
            const maxLineCount = 10;
            const title = await readMarkdownFrontMatterContents(
              filePath,
              frontmatterHeader,
              maxLineCount,
            );
            const completionItem = new vscode.CompletionItem(
              title || file,
              vscode.CompletionItemKind.File,
            );
            completionItem.detail = file;
            completionItem.insertText = fileName;
            // completionItem.documentation = content.join("\n");

            return completionItem;
          }),
        );
        const filteredCompletionItems = completionItems.filter(
          (item): item is vscode.CompletionItem => item !== undefined,
        );

        return filteredCompletionItems;
      },
    }),
  );
}

/**
 * 拡張機能を無効化する関数です。
 */
export function deactivate() {}

async function readMarkdownFrontMatterContents(
  filePath: string,
  frontmatterHeader: string,
  maxLineCount: number,
): Promise<string | undefined> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = -1;
  let title = "";
  for await (const line of rl) {
    lineCount++;
    if (lineCount > maxLineCount) {
      break;
    }

    const lineContent = line.trim();
    if (lineCount === 0 && lineContent !== frontmatterHeader) {
      // front matterで始まっていなければ終了
      rl.close();
      fileStream.close();
      return undefined;
    }
    if (lineCount === 0 && lineContent === frontmatterHeader) {
      // front matterのヘッダーなのでデータとしては破棄
      continue;
    }
    if (lineContent !== 0 && lineContent === frontmatterHeader) {
      // front matterの終わりなのでコンテンツの読み込み終了
      break;
    }

    if (lineContent.startsWith("title: ") === false) {
      continue;
    }

    title = lineContent.substring("title: ".length);
    break;
  }
  rl.close();
  fileStream.close();

  return title;
}
