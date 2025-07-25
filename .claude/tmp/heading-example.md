# headingIdの有無による違い

## headingIdあり（現在のminimal）:
```markdown
## 導入
<!-- paragraph-metadata: {"headingId":"h.intro123"} -->

詳細は[導入セクション](#h.intro123)を参照してください。

## 実装詳細
<!-- paragraph-metadata: {"headingId":"h.impl456"} -->
```

## headingIdなし:
```markdown
## 導入

詳細は[導入セクション](#導入)を参照してください。

## 実装詳細
```

### 違い
- headingIdありでは、見出しのテキストが変わってもリンクが維持される
- headingIdなしでは、見出しテキストの変更でリンクが切れる
- ただし、ドキュメント内リンクを使わない場合は不要