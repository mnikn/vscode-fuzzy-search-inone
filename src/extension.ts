import * as vscode from 'vscode';
import * as fuzzysort from 'fuzzysort';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.fuzzySearch', async () => {
        // 获取当前打开的文档
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('没有打开的文档');
            return;
        }

        // 获取文档中的所有行
        const document = editor.document;
        const lines = document.getText().split('\n');

        // 创建 QuickPick 实例
        const quickPick = vscode.window.createQuickPick();
        quickPick.placeholder = '输入要搜索的内容';

        // 创建一个装饰类型用于高亮当前行
        const highlightDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            isWholeLine: true,
        });

        // 当输入变化时更新结果
        quickPick.onDidChangeValue(value => {
            if (value) {
                const results = fuzzysort.go(value, lines);
                quickPick.items = results.map(result => ({
                    label: `${lines.indexOf(result.target) + 1}: ${result.target}`,
                    description: `行 ${lines.indexOf(result.target) + 1}`
                }));
            } else {
                quickPick.items = [];
            }
        });

        // 当选择变化时跳转到相应行
        quickPick.onDidChangeActive(([item]) => {
            if (item) {
                const lineNumber = parseInt(item.label.split(':')[0]) - 1;
                const range = new vscode.Range(lineNumber, 0, lineNumber, 0);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                
                // 高亮当前行,但不选中文本
                editor.setDecorations(highlightDecorationType, [new vscode.Range(lineNumber, 0, lineNumber, item.label.length)]);
            } else {
                // 清除高亮
                editor.setDecorations(highlightDecorationType, []);
            }
        });

        // 当确认选择时,跳转到选中行并关闭 QuickPick
        quickPick.onDidAccept(() => {
            const selectedItem = quickPick.activeItems[0];
            if (selectedItem) {
                const lineNumber = parseInt(selectedItem.label.split(':')[0]) - 1;
                const range = new vscode.Range(lineNumber, 0, lineNumber, 0);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                
                // 将光标移动到行首,但不选中文本
                editor.selection = new vscode.Selection(range.start, range.start);
            }
            quickPick.hide();
        });

        quickPick.onDidHide(() => {
            // 清除高亮
            editor.setDecorations(highlightDecorationType, []);
        });

        quickPick.show();
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}