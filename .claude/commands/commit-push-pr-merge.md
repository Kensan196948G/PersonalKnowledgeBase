# Git: コミット → プッシュ → PR作成 → マージ

以下の手順を実行してください：

## 1. 変更確認
- `git status` で変更ファイルを確認
- `git diff` で差分を確認
- `git log --oneline -3` で最近のコミットスタイルを確認

## 2. コミット
- 全ての変更をステージング (`git add -A`)
- 変更内容を分析して適切なコミットメッセージを作成
- プレフィックス: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- コミットメッセージは日本語可
- フッターに以下を追加:
  ```
  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
  ```

## 3. ブランチ作成 & プッシュ
- 現在mainにいる場合は、feature/xxx ブランチを作成
- リモートにプッシュ (`git push -u origin <branch>`)

## 4. PR作成
- `gh pr create` でPRを作成
- タイトル: コミットメッセージと同様
- 本文:
  ```
  ## Summary
  - 変更内容を箇条書き

  ## Test plan
  - テスト内容

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  ```

## 5. マージ
- `gh pr merge --merge --delete-branch` でマージ
- mainブランチに戻る (`git checkout main && git pull`)

## 6. 完了報告
- マージ完了後、PRのURLを報告
