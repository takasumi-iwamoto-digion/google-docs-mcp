# listIdの有無による違い

## listIdあり（現在のminimal）:
```markdown
1. プロジェクトA
<!-- paragraph-metadata: {"listId":"kix.abc123"} -->

2. プロジェクトB  
<!-- paragraph-metadata: {"listId":"kix.abc123"} -->

別のセクション...

3. プロジェクトC
<!-- paragraph-metadata: {"listId":"kix.abc123"} -->
```

## listIdなし:
```markdown
1. プロジェクトA

2. プロジェクトB

別のセクション...

3. プロジェクトC
```

### 問題点
- listIdなしでは、「プロジェクトC」が同じリストの続きなのか、新しいリストなのか判別不可
- Markdownの標準的な解釈では、間にテキストが入ると新しいリストとして扱われる
- Google Docsでは同じlistIdを持つため、本来は「3.」として継続される