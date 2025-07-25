# Git安全設定のまとめ

## 実施した設定

### 1. ✅ upstreamへのpush無効化
```bash
git remote set-url --push upstream no_push
```
- upstreamへのpushが物理的に不可能になります
- `git push upstream` を実行すると "no_push" というURLへのpushを試みて失敗します

### 2. ✅ pre-pushフックの設定
- ファイル: `.git/hooks/pre-push`
- a-bonus/google-docs-mcpへのpushを検出して拒否します
- エラーメッセージでフォークへのpushを促します

### 3. ✅ GitHub CLI設定
- ファイル: `.github/config.yml`
- デフォルトリポジトリをフォークに設定

## 追加の推奨設定

### 4. git configでpushのデフォルト動作を制限
```bash
git config push.default current
git config push.autoSetupRemote false
```

### 5. エイリアスの設定
```bash
git config alias.push-fork 'push origin'
git config alias.pr-fork '!gh pr create --repo takasumi-iwamoto-digion/google-docs-mcp'
```

## 安全な作業フロー

1. **ブランチ作成**: `git checkout -b feature/new-feature`
2. **コミット**: `git commit -m "feat: new feature"`
3. **フォークへpush**: `git push origin feature/new-feature`
4. **PR作成**: 
   - フォーク内: `gh pr create --repo takasumi-iwamoto-digion/google-docs-mcp`
   - 元のリポジトリへは作成しない

## テスト方法
```bash
# これは失敗するはず
git push upstream main

# これは成功するはず
git push origin main
```