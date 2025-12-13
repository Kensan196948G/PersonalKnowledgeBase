# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-13

### Phase 1 MVP 完了

個人向けメモ・ナレッジベースシステムの基本機能（MVP）を実装完了しました。

#### Added - 新機能

##### エディタ機能
- **TipTapリッチテキストエディタ** - WYSIWYG編集環境
  - 基本フォーマット: 太字、斜体、打ち消し線、インラインコード
  - 見出し: H1, H2, H3
  - リスト: 箇条書き、番号付きリスト、タスクリスト
  - ブロック: 引用、コードブロック、水平線
  - リンク機能
  - 履歴: 元に戻す、やり直す

##### 画像機能
- **クリップボード画像貼り付け（Ctrl+V）** - クリップボードからの直接画像挿入
- **画像アップロードAPI** - Multerによるファイルアップロード処理
- **画像プレビュー** - エディタ内での画像表示

##### ノート管理
- **ノート作成** - 新規ノート作成機能
- **ノート一覧表示** - カード形式の一覧表示
- **ノート検索** - リアルタイム全文検索（デバウンス300ms）
- **ノートソート** - 更新日時・作成日時・タイトルでのソート
- **ノート削除** - 確認ダイアログ付き削除機能
- **オートセーブ** - 1秒デバウンスによる自動保存
- **保存状態インジケーター** - 保存中/保存済みの視覚的フィードバック

##### UI/UX
- **Zustand状態管理** - グローバル状態管理（noteStore, uiStore）
- **トースト通知システム** - 操作成功・失敗の通知
- **リサイズ可能サイドバー** - サイドバーの幅調整
- **キーボードショートカット** - Cmd/Ctrl+\（サイドバートグル）、Cmd/Ctrl+K（検索フォーカス）
- **レスポンシブデザイン** - Tailwind CSSによるモダンなUI

#### Database
- **SQLiteデータベース** - ローカルファースト設計
- **Prisma ORM** - 型安全なデータベース操作
- **Prismaスキーマ定義** - Note, Tag, Folder, Attachment, NoteTagテーブル
- **初期マイグレーション** - データベース初期化完了
- **サンプルデータ投入** - 開発用サンプルノート

#### Backend API
- **GET /api/notes** - ノート一覧取得（検索・ソート対応）
- **GET /api/notes/:id** - ノート詳細取得
- **POST /api/notes** - ノート作成
- **PUT /api/notes/:id** - ノート更新
- **DELETE /api/notes/:id** - ノート削除
- **POST /api/upload** - 画像アップロード
- **CORS設定** - フロントエンドとの通信設定

#### Infrastructure
- **4並列SubAgent開発環境** - 高速並列開発体制
- **Hooks自動化機構** - ファイルロック、進捗記録、コンテキスト共有
- **GitHub Actions CI/CD** - 自動エラー検知・修復ワークフロー（30分間隔）
- **MCP統合** - SQLite, GitHub, Brave Search, Memory MCPとの連携

#### Developer Experience
- **TypeScript** - フロントエンド・バックエンド完全型付け
- **ESLint** - コード品質管理
- **Prettier** - コードフォーマット
- **Jest** - バックエンドユニットテスト
- **Playwright** - E2Eテスト準備完了

### Technical Details

#### 技術スタック
- **Frontend**: React 18 + TypeScript + TipTap + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite + Prisma ORM
- **State Management**: Zustand
- **Build Tool**: Vite
- **Package Manager**: npm

#### プロジェクト統計
- **総コード量**: 6,233行
- **ファイル数**: 45ファイル（TypeScript/JavaScript）
- **開発期間**: 2日（2025-12-12 - 2025-12-13）
- **SubAgent並列実行**: 4並列
- **ファイルロック競合**: 0件

#### パフォーマンス
- **ビルドサイズ**: 511KB（gzip: 164KB）
- **TypeScriptビルド**: ✅ 成功
- **バックエンドテスト**: ✅ 全パス

### Known Issues
- フロントエンドテストが未実装
- ESLint設定のv9.0対応が必要
- 画像ドラッグ&ドロップ未対応（Phase 2で実装予定）

### Next Phase (Phase 2: 整理機能)
- タグ管理システム
- フォルダ構造
- 高度検索（AND/OR検索、フィルタリング）

---

## [0.2.0] - 2025-12-13

### Phase 2: 整理機能 完了

#### Added - 新機能

##### タグ管理システム
- **タグCRUD API** - タグの作成、取得、更新、削除
  - POST /api/tags - タグ作成（名前、カラー）
  - GET /api/tags - タグ一覧取得
  - PUT /api/tags/:id - タグ更新（名前、カラー変更）
  - DELETE /api/tags/:id - タグ削除
- **ノート-タグ関連付けAPI**
  - POST /api/notes/:id/tags - ノートにタグ付与
  - DELETE /api/notes/:id/tags/:tagId - ノートからタグ削除
- **TagSelectorコンポーネント** - インライン編集対応のタグ選択UI
- **TagFilterSidebarコンポーネント** - タグフィルタリングサイドバー
- **タグStore（Zustand）** - タグデータのグローバル状態管理

##### フォルダ構造
- **フォルダCRUD API** - 階層構造対応、循環参照チェック
  - POST /api/folders - フォルダ作成（親フォルダ指定可能）
  - GET /api/folders - フォルダ一覧取得（階層構造）
  - PUT /api/folders/:id - フォルダ更新（名前、親フォルダ変更）
  - DELETE /api/folders/:id - フォルダ削除（子フォルダも削除）
- **FolderTreeコンポーネント** - 再帰的階層表示、展開/折りたたみ
- **FolderSelectorコンポーネント** - フォルダ選択ドロップダウン
- **FolderCreateModalコンポーネント** - フォルダ作成モーダル
- **フォルダStore（Zustand）** - フォルダデータのグローバル状態管理

##### 高度検索機能
- **タグ検索** - AND/OR切り替え対応
- **フォルダ絞り込み** - 特定フォルダ内検索
- **作成日範囲指定** - 日付範囲での絞り込み
- **ピン留め/お気に入りフィルタ** - 状態別フィルタリング
- **AdvancedSearchBarコンポーネント** - 高度検索UI
- **SearchFilterChipsコンポーネント** - アクティブフィルタのチップ表示
- **noteStore拡張** - 高度検索状態管理（searchFilters, tagOperator）

#### Technical Details

##### プロジェクト統計
- **総コード量**: 9,914行（Phase 1: 6,233行 + Phase 2: +3,681行）
- **ファイル数**: 53ファイル（Phase 1: 45ファイル + Phase 2: +8ファイル）
- **開発期間**: 1日（2025-12-13、Phase 1完了と同日）
- **SubAgent並列実行**: 5並列
- **ファイルロック競合**: 0件

##### パフォーマンス
- **TypeScriptビルド**: ✅ 成功（エラー0件）
- **バックエンドテスト**: ✅ 全パス

#### Changed - 変更
- **noteStore** - searchFilters, tagOperator追加
- **NoteCard** - タグ表示追加（最大3個＋残り件数）
- **MainLayout** - TagFilterSidebar、FolderTree統合

### Known Issues
- フロントエンドテストが未実装
- ESLint設定のv9.0対応が必要
- 画像ドラッグ&ドロップ未対応（Phase 3以降で実装予定）

### Next Phase (Phase 3: 知識化)
- ノート間リンク [[ノート名]]
- バックリンク表示
- 関連ノート提案

---

## [Unreleased]

### Planned for Phase 3 (知識化)
- ノート間リンク [[ノート名]] 記法パーサー
- リンク挿入UI、プレビュー、オートコンプリート
- バックリンク検出・表示
- 双方向ナビゲーション
- タグベース関連度計算
- 関連ノートUI
- 画像ドラッグ&ドロップ

### Planned for Phase 4 (AI連携)
- ベクトル検索
- 類似ノート検索
- AI要約・質問応答
- 自動タグ提案
- 自動要約生成

---

*このCHANGELOGは開発フェーズに応じて更新されます*
