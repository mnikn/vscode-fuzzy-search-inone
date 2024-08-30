import * as vscode from 'vscode';
import * as fuzzysort from 'fuzzysort';

const presetOptions = {
  withSelection: true
}

const registerCommandSearchActiveEditor = (options = presetOptions) => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  // 获取文档中的所有行
  const document = editor.document;
  const lines = document.getText().split('\n');

  // 创建 QuickPick 实例
  const quickPick = vscode.window.createQuickPick();
  quickPick.placeholder = 'Input the content to search';

  if (options.withSelection) {
    // quickPick.value = editor.selection.active.character.toString();
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    // 设置 QuickPick 的初始值为选中的文本
    quickPick.value = selectedText;
  }

  // 创建一个装饰类型用于高亮当前行
  const highlightDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
    isWholeLine: false,
  });

  // 当输入变化时更新结果
  quickPick.onDidChangeValue(value => {
    if (value) {
      let results = fuzzysort.go(value, lines);

      const cursorPosition = editor.selection.active.line;
      results = (results as any).sort((a: any, b: any) => {
        const lineA = lines.indexOf(a.target);
        const lineB = lines.indexOf(b.target);
        return Math.abs(lineA - cursorPosition) - Math.abs(lineB - cursorPosition);
      });

      let searchItems = results.map(result => {
        return {
          label: `${lines.indexOf(result.target) + 1}: ${result.target}`,
          extraData: {
            lineIndexes: result.indexes.map((i) => {
              return {
                start: i,
                end: i + value.length
              }
            }),
          }
        }
      })
      // 使用 Set 对象来去重
      const uniqueSearchItems = Array.from(new Set(searchItems.map(item => item.label)))
        .map(label => searchItems.find(item => item.label === label) as any);
      // 将去重后的结果赋值回 searchItems
      searchItems = uniqueSearchItems;

      quickPick.items = searchItems;

      quickPick.activeItems = [quickPick.items[0]];
    } else {
      quickPick.items = [];
    }
  });

  quickPick.onDidChangeActive(([item]) => {
    if (item) {
      const lineNumber = parseInt(item.label.split(':')[0]) - 1;
      const range = new vscode.Selection(lineNumber, (item as any).extraData?.lineIndexes[0]?.start || 0, lineNumber, (item as any).extraData?.lineIndexes[0]?.end || 0);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

      editor.setDecorations(highlightDecorationType, [range]);
    } else {
      editor.setDecorations(highlightDecorationType, []);
    }
  });

  // 当确认选择时,跳转到选中行并关闭 QuickPick
  quickPick.onDidAccept(() => {
    const selectedItem = quickPick.activeItems[0];
    if (selectedItem) {
      const lineNumber = parseInt(selectedItem.label.split(':')[0]) - 1;
      const range = new vscode.Selection(lineNumber, (selectedItem as any).extraData?.lineIndexes[0]?.start || 0, lineNumber, (selectedItem as any).extraData?.lineIndexes[0]?.end || 0);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

      editor.selection = new vscode.Selection(range.start, range.start);
    }
    quickPick.hide();
  });

  quickPick.onDidHide(() => {
    // 清除高亮
    editor.setDecorations(highlightDecorationType, []);
  });

  quickPick.show();
}

export function activate(context: vscode.ExtensionContext) {
  const searchActiveEditorDisposable = vscode.commands.registerCommand('fuzzySearchInOne.searchActiveEditor', async () => {
    registerCommandSearchActiveEditor({ withSelection: false });
  });

  const searchActiveEditorWithSelectionDisposable = vscode.commands.registerCommand('fuzzySearchInOne.searchActiveEditorWithSelection', async () => {
    registerCommandSearchActiveEditor();
  });

  context.subscriptions.push(searchActiveEditorDisposable);
  context.subscriptions.push(searchActiveEditorWithSelectionDisposable);
}

export function deactivate() { }