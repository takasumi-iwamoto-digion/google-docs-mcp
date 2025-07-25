# フォークリポジトリでのPR作成について

## 現状
- **元のリポジトリへのPR**: https://github.com/a-bonus/google-docs-mcp/pull/14 (作成済み)
- **フォークリポジトリ**: https://github.com/takasumi-iwamoto-digion/google-docs-mcp
- **ブランチ**: `feature/simplify-markdown-formats`

## フォーク内でPRを作成する方法

### オプション1: ブラウザで作成
以下のURLにアクセスしてPRを作成できます：
```
https://github.com/takasumi-iwamoto-digion/google-docs-mcp/compare/main...feature/simplify-markdown-formats
```

### オプション2: 別のブランチを作成
```bash
# 現在のfeatureブランチから別のブランチを作成
git checkout -b feature/markdown-formats-backup
git push origin feature/markdown-formats-backup

# その後PRを作成
gh pr create --repo takasumi-iwamoto-digion/google-docs-mcp \
  --base feature/simplify-markdown-formats \
  --head feature/markdown-formats-backup \
  --title "Backup: Markdown format changes"
```

## 注意事項
通常、フォークリポジトリ内でのPRは以下の場合に作成します：
1. チーム内でのレビュー用
2. 変更履歴の記録用
3. 元のリポジトリにPRを送る前のテスト用

既に元のリポジトリへのPR（#14）が作成されているため、フォーク内でのPRは必須ではありません。