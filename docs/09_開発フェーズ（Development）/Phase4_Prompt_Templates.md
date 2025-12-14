# Phase 4: AI機能プロンプトテンプレート集

## 概要

Llama 3.2向けに最適化されたプロンプトテンプレート集。
2025年のベストプラクティスに基づいた高品質なプロンプトエンジニアリング。

---

## プロンプトエンジニアリング原則（Llama 3.2）

### 1. 明確な役割定義

```typescript
// ❌ 悪い例
const prompt = "この文章を要約して";

// ✅ 良い例
const prompt = "あなたは優れた要約者です。以下のノートを簡潔に要約してください。";
```

### 2. 具体的なルール提示

```typescript
// ❌ 悪い例
const prompt = "要約してください";

// ✅ 良い例
const prompt = `
【要約ルール】
- 50文字以内
- 最も重要なポイントのみ
- 結論を優先
- 箇条書きは使わない
`;
```

### 3. Few-Shot Examples（必要に応じて）

```typescript
const prompt = `
【例1】
入力: 「TypeScriptは型安全性を提供するJavaScriptのスーパーセットです...」
出力: 「TypeScript: 型安全なJavaScript拡張」

【例2】
入力: 「Reactは宣言的なUIライブラリで...」
出力: 「React: 宣言的UIライブラリ」

【あなたのタスク】
入力: {content}
出力:
`;
```

### 4. 出力フォーマット明記

```typescript
const prompt = `
【出力フォーマット（JSON）】
必ず以下の形式で出力してください：
{
  "summary": "要約文",
  "keyPoints": ["ポイント1", "ポイント2"]
}
`;
```

---

## 1. 要約プロンプト

### 1.1 Short Summary（超短文要約）

```typescript
export const SUMMARY_PROMPT_SHORT = `
あなたは優れた要約専門家です。以下のノートを1-2文で極めて簡潔に要約してください。

【要約ルール】
- 最大50文字以内
- 最も核心的な情報のみ
- 結論や主張を優先
- 完結した文章（箇条書き禁止）
- 「〜について」「〜に関して」などの曖昧表現を避ける

【ノート内容】
{content}

【要約（50文字以内）】
`.trim();

// 使用例
const examples = {
  input: "TypeScriptは静的型付けを提供するJavaScriptのスーパーセット。開発時の型チェックにより、バグを早期発見でき、大規模開発に適している。",
  output: "TypeScript: 型安全な大規模JavaScript開発向け言語"
};
```

### 1.2 Medium Summary（中文要約）

```typescript
export const SUMMARY_PROMPT_MEDIUM = `
あなたは優れた要約専門家です。以下のノートを3-5文で要約してください。

【要約ルール】
- 100-150文字程度
- 主要なポイントを網羅
- 論理的な流れを保持
- 重要な詳細も含める
- 結論と理由を明確に

【ノート内容】
{content}

【要約（100-150文字）】
`.trim();

// 使用例
const examples = {
  input: "Reactは...",
  output: "Reactは宣言的なUIライブラリ。コンポーネントベースの設計により再利用性が高く、仮想DOMによる高速レンダリングが特徴。大規模アプリ開発に最適で、豊富なエコシステムを持つ。"
};
```

### 1.3 Long Summary（詳細要約）

```typescript
export const SUMMARY_PROMPT_LONG = `
あなたは優れた要約専門家です。以下のノートを詳細に要約してください。

【要約ルール】
- 300-500文字程度
- 全体の構造を保持
- すべての重要ポイントを含む
- 必要に応じてセクション分け（## 見出し使用可）
- 具体例や数値も含める
- 論理的な流れを維持

【ノート内容】
{content}

【詳細要約（300-500文字）】
`.trim();
```

### 1.4 Bullet Points（箇条書き要約）

```typescript
export const SUMMARY_PROMPT_BULLETS = `
あなたは優れた要約専門家です。以下のノートを箇条書きで要約してください。

【要約ルール】
- 3-7個の箇条書き
- 各項目は1文で簡潔に
- 重要度順に並べる
- 「-」で箇条書き開始
- 具体的で明確な表現

【ノート内容】
{content}

【箇条書き要約】
`.trim();

// 使用例
const examples = {
  output: `
- TypeScript: 静的型付けJavaScript拡張
- 開発時の型チェックでバグ早期発見
- 大規模プロジェクトに最適
- 豊富な開発ツールサポート
- JavaScriptとの完全互換性
`
};
```

---

## 2. タグ提案プロンプト

### 2.1 基本タグ提案

```typescript
export const TAG_SUGGESTION_PROMPT = `
あなたはナレッジベース分類の専門家です。以下のノート内容を分析し、適切なタグを{maxTags}個提案してください。

【既存タグリスト】
{existingTags}

【タグ提案ルール】
1. 既存タグを優先的に使用（新規タグは最小限）
2. 1-3単語の短いタグ
3. 具体的で検索に役立つタグ
4. 階層構造は不要（フラットなタグ）
5. 同義語・重複を避ける
6. 日本語タグを使用

【ノート内容】
{content}

【出力フォーマット（JSON）】
必ず以下のJSON形式で出力してください：
\`\`\`json
{
  "tags": [
    {
      "tag": "タグ名",
      "confidence": 0.95,
      "reason": "このタグを提案する理由",
      "isExisting": true
    }
  ]
}
\`\`\`

【タグ提案】
`.trim();

// 使用例
const examples = {
  existingTags: ["プログラミング", "Web開発", "TypeScript", "React"],
  output: {
    tags: [
      {
        tag: "TypeScript",
        confidence: 0.95,
        reason: "TypeScriptに関する技術的な内容が多く含まれています",
        isExisting: true
      },
      {
        tag: "Web開発",
        confidence: 0.88,
        reason: "Web開発に関連する技術について言及されています",
        isExisting: true
      },
      {
        tag: "型システム",
        confidence: 0.82,
        reason: "型システムに関する詳細な説明があります",
        isExisting: false
      }
    ]
  }
};
```

### 2.2 コンテキストベースタグ提案

```typescript
export const TAG_SUGGESTION_WITH_CONTEXT = `
あなたはナレッジベース分類の専門家です。以下のノートとユーザーの使用履歴を考慮し、最適なタグを{maxTags}個提案してください。

【既存タグリスト】
{existingTags}

【よく使われるタグ（頻度順）】
{frequentTags}

【最近使用されたタグ】
{recentTags}

【タグ提案ルール】
1. ユーザーの使用パターンを重視
2. 既存タグを最優先
3. よく使われるタグから選択
4. 一貫性のある分類を心がける
5. 検索性を最優先

【ノート内容】
{content}

【出力フォーマット（JSON）】
\`\`\`json
{
  "tags": [
    {
      "tag": "タグ名",
      "confidence": 0.95,
      "reason": "提案理由",
      "isExisting": true,
      "frequency": 45
    }
  ]
}
\`\`\`

【タグ提案】
`.trim();
```

---

## 3. 文章校正プロンプト

### 3.1 日本語文章校正

```typescript
export const PROOFREAD_PROMPT_JA = `
あなたは日本語文章の校正専門家です。以下のテキストを校正し、改善提案を行ってください。

【チェック項目】
{checkTypes}

【校正ルール】
1. 文法ミス、誤字脱字を修正
2. わかりにくい表現を指摘
3. より自然な言い回しを提案
4. 重複表現を削除
5. 敬体/常体の統一
6. 助詞の誤用を修正
7. 冗長な表現を簡潔に

【元のテキスト】
{content}

【出力フォーマット（JSON）】
必ず以下のJSON形式で出力してください：
\`\`\`json
{
  "corrected": "校正後の全文",
  "suggestions": [
    {
      "type": "grammar",
      "severity": "high",
      "position": {"start": 0, "end": 10},
      "original": "間違った表現",
      "suggestion": "正しい表現",
      "explanation": "修正理由の詳細説明"
    }
  ],
  "stats": {
    "totalIssues": 5,
    "grammarIssues": 2,
    "spellingIssues": 1,
    "styleIssues": 2
  }
}
\`\`\`

【校正結果】
`.trim();

// checkTypes options
const checkTypes = {
  grammar: "文法チェック",
  spelling: "誤字脱字チェック",
  style: "文体チェック",
  clarity: "明瞭性チェック"
};
```

### 3.2 英語文章校正

```typescript
export const PROOFREAD_PROMPT_EN = `
You are an expert English proofreader. Please proofread the following text and provide improvement suggestions.

【Check Items】
{checkTypes}

【Proofreading Rules】
1. Fix grammar and spelling errors
2. Improve unclear expressions
3. Suggest more natural phrasing
4. Remove redundant expressions
5. Ensure consistent tone
6. Fix punctuation errors
7. Improve sentence flow

【Original Text】
{content}

【Output Format (JSON)】
Please output in the following JSON format:
\`\`\`json
{
  "corrected": "Corrected full text",
  "suggestions": [
    {
      "type": "grammar",
      "severity": "high",
      "position": {"start": 0, "end": 10},
      "original": "incorrect expression",
      "suggestion": "correct expression",
      "explanation": "Detailed explanation of the correction"
    }
  ],
  "stats": {
    "totalIssues": 5,
    "grammarIssues": 2,
    "spellingIssues": 1,
    "styleIssues": 2
  }
}
\`\`\`

【Proofreading Result】
`.trim();
```

---

## 4. 文章展開プロンプト

### 4.1 Elaborate（詳細化）

```typescript
export const EXPAND_ELABORATE_PROMPT = `
あなたは優れたライターです。以下の簡潔なアイデアを詳細に展開してください。

【展開ルール】
1. 元のアイデアの核心を保持
2. 具体例や詳細を追加
3. 論理的な構造を保つ
4. 3-5倍の文量に拡張
5. 自然で読みやすい文章
6. 必要に応じて見出しを使用

【展開の視点】
- なぜそれが重要なのか？
- 具体的にはどういうことか？
- どのような利点・欠点があるか？
- 実例やケーススタディは？

【元のアイデア】
{content}

【詳細に展開された文章】
`.trim();

// 使用例
const examples = {
  input: "TypeScriptは型安全性を提供する",
  output: `TypeScriptは型安全性を提供することで、開発者に多くの利点をもたらします。

## なぜ型安全性が重要か
JavaScriptでは実行時まで型エラーが検出されませんが、TypeScriptはコンパイル時に型チェックを行うため、バグを早期に発見できます。これにより、本番環境でのエラーを大幅に減らせます。

## 具体的な利点
1. IDEの補完機能が向上し、開発効率が上がります
2. リファクタリングが安全に行えます
3. チーム開発での型の整合性が保たれます

## 実例
大規模なWebアプリケーション開発では、TypeScriptの型システムにより、数千行のコード変更でも安心してリファクタリングできます。`
};
```

### 4.2 Brainstorm（アイデア出し）

```typescript
export const EXPAND_BRAINSTORM_PROMPT = `
あなたは創造的なアイデア発想者です。以下のトピックに関連するアイデアを{ideaCount}個ブレインストーミングしてください。

【ブレインストーミングルール】
1. 多様な視点からアイデアを出す
2. 実現可能性は問わない（自由発想）
3. 具体的で明確なアイデア
4. ユニークで創造的な提案
5. 各アイデアに1-2文の説明を付ける

【発想の視点】
- 既存のものを改善するには？
- 全く新しいアプローチは？
- 逆転の発想は？
- 他の分野から応用できるものは？
- 極端な例を考えると？

【トピック】
{content}

【アイデア一覧】
以下の形式で出力してください：

1. **アイデアタイトル**
   説明文。具体的な内容や利点を記述。

2. **次のアイデアタイトル**
   説明文...
`.trim();

// 使用例
const examples = {
  input: "個人のナレッジベースシステムの新機能",
  output: `
1. **AIによる自動関連付け**
   ノートを保存すると、AIが自動的に関連するノートを検出し、リンクを提案。知識のネットワークが自動構築される。

2. **音声入力メモ機能**
   会議中や移動中に音声でメモを取り、自動でテキスト化＋タグ付け。思いついたアイデアを即座に記録。

3. **学習進捗トラッキング**
   特定のトピックについてどれだけ学んだか、どの分野が不足しているかを可視化。

...
`
};
```

### 4.3 Outline（アウトライン化）

```typescript
export const EXPAND_OUTLINE_PROMPT = `
あなたは文書構造化の専門家です。以下の断片的な内容を体系的なアウトラインに整理してください。

【アウトライン化ルール】
1. Markdown形式の階層構造（# ## ###）
2. 論理的な順序で整理
3. 各セクションに簡潔な説明
4. 重複を排除
5. 拡張可能な構造
6. 必要に応じてサブセクション追加

【構造化の視点】
- 論理的な順序は？
- グルーピングできる項目は？
- 階層関係は？
- 欠けている要素は？

【元の内容】
{content}

【アウトライン】
以下のMarkdown形式で出力してください：

# メインタイトル

## セクション1
セクションの説明

### サブセクション1.1
詳細説明

### サブセクション1.2
詳細説明

## セクション2
...
`.trim();

// 使用例
const examples = {
  input: "TypeScript, 型システム, コンパイラ, ジェネリクス, インターフェース, tsconfig.json設定",
  output: `
# TypeScript 学習ガイド

## 基礎知識
TypeScriptの基本概念と導入方法

### TypeScriptとは
静的型付けを提供するJavaScriptのスーパーセット

### 環境セットアップ
tsconfig.json設定とコンパイラの使い方

## 型システム
TypeScriptの型機能を詳しく学ぶ

### 基本的な型
プリミティブ型、配列、タプル、enum

### インターフェース
オブジェクトの型定義と拡張

### ジェネリクス
型の再利用性を高める高度な機能

## 実践
実際のプロジェクトでの活用方法
`
};
```

---

## 5. 関連ノート提案プロンプト

### 5.1 基本関連ノート提案

```typescript
export const RELATED_NOTES_PROMPT = `
あなたはナレッジベース分析の専門家です。以下の基準ノートと他のノートを比較し、関連性の高いノートを{maxResults}個提案してください。

【基準ノート】
タイトル: {currentTitle}
内容: {currentContent}
タグ: {currentTags}

【候補ノートリスト】
{candidateNotes}

【関連性判定ルール】
1. トピックの類似性（最重要）
2. 共通タグの数
3. キーワードの一致度
4. 文脈の関連性
5. 補完的な情報の有無

【出力フォーマット（JSON）】
必ず以下のJSON形式で出力してください：
\`\`\`json
{
  "relatedNotes": [
    {
      "noteId": "uuid",
      "title": "ノートタイトル",
      "similarity": 0.87,
      "reason": "関連性の詳細な説明",
      "relationshipType": "similar|complementary|prerequisite|followup",
      "sharedTags": ["tag1", "tag2"],
      "keyMatches": ["キーワード1", "キーワード2"]
    }
  ]
}
\`\`\`

【関連ノート提案】
`.trim();
```

### 5.2 学習パス提案

```typescript
export const LEARNING_PATH_PROMPT = `
あなたは学習パス設計の専門家です。以下のノートを起点として、効果的な学習順序を提案してください。

【現在のノート】
タイトル: {currentTitle}
内容: {currentContent}

【利用可能なノート】
{availableNotes}

【学習パス提案ルール】
1. 前提知識から段階的に
2. 基礎→応用→実践の順序
3. 関連トピックをグループ化
4. 重複を避ける
5. 実践的な例を優先

【出力フォーマット（JSON）】
\`\`\`json
{
  "learningPath": [
    {
      "step": 1,
      "noteId": "uuid",
      "title": "ノートタイトル",
      "reason": "このステップで学ぶ理由",
      "estimatedTime": "30分"
    }
  ],
  "totalEstimatedTime": "3時間"
}
\`\`\`

【学習パス】
`.trim();
```

---

## 6. チェーン・オブ・ソート（Chain-of-Thought）プロンプト

### 6.1 複雑な分析タスク

```typescript
export const COMPLEX_ANALYSIS_PROMPT = `
あなたは優れた分析者です。以下のノートを段階的に分析してください。

【分析対象ノート】
{content}

【分析ステップ】
ステップ1: まず、ノートの主要トピックを特定してください
ステップ2: 次に、含まれる概念や技術を列挙してください
ステップ3: それらの関連性を分析してください
ステップ4: 最後に、総合的な要約を作成してください

【分析プロセス】
各ステップの思考過程を明記しながら分析を進めてください。

ステップ1の分析:
（主要トピックの特定）

ステップ2の分析:
（概念・技術の列挙）

ステップ3の分析:
（関連性の分析）

ステップ4の分析:
（総合要約）

【最終出力（JSON）】
\`\`\`json
{
  "mainTopics": ["トピック1", "トピック2"],
  "concepts": ["概念1", "概念2"],
  "relationships": "関連性の説明",
  "summary": "総合要約"
}
\`\`\`
`.trim();
```

---

## 7. Self-Consistency（自己整合性）プロンプト

### 7.1 重要な判断タスク

```typescript
export const SELF_CONSISTENCY_PROMPT = `
あなたは優れた判断者です。以下のノートに最適なタグを決定してください。
正確性を高めるため、3つの異なる視点から分析し、最も一貫した結果を選んでください。

【ノート内容】
{content}

【分析1: トピック中心の視点】
このノートの主要トピックに基づいてタグを提案してください。

【分析2: キーワード頻度の視点】
出現キーワードの頻度に基づいてタグを提案してください。

【分析3: 文脈・意図の視点】
ノート全体の文脈と意図に基づいてタグを提案してください。

【統合判断】
3つの分析結果を比較し、最も一貫して推奨されるタグを選んでください。

【最終タグ提案（JSON）】
\`\`\`json
{
  "finalTags": ["タグ1", "タグ2", "タグ3"],
  "confidence": 0.92,
  "reasoning": "3つの視点で一貫して推奨された理由"
}
\`\`\`
`.trim();
```

---

## 8. RAG（Retrieval-Augmented Generation）プロンプト

### 8.1 知識ベース強化生成

```typescript
export const RAG_ENHANCED_PROMPT = `
あなたは知識ベースを活用した回答生成の専門家です。
以下の関連ノート情報を参照しながら、ユーザーの質問に答えてください。

【関連ノート情報】
{retrievedNotes}

【ユーザーの質問】
{userQuestion}

【回答生成ルール】
1. 関連ノートの情報を最大限活用
2. 情報源を明記（どのノートから得た情報か）
3. 複数のノートを統合して包括的な回答
4. ノートにない情報は推測しない
5. 不足している情報があれば明記

【回答】
（関連ノートに基づいた詳細な回答）

【参照したノート】
- ノートID: {noteId1} - "{noteTitle1}"
- ノートID: {noteId2} - "{noteTitle2}"

【追加で必要な情報】
（もしあれば）
`.trim();
```

---

## 9. プロンプトバリエーション管理

### 9.1 プロンプトバージョン管理

```typescript
interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  template: string;
  variables: string[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    author: string;
    description: string;
    performanceScore?: number;  // A/Bテスト結果
  };
}

const PROMPT_REGISTRY: Record<string, PromptTemplate> = {
  "summary-short-v1": {
    id: "summary-short-v1",
    name: "Short Summary",
    version: "1.0.0",
    template: SUMMARY_PROMPT_SHORT,
    variables: ["content"],
    metadata: {
      createdAt: new Date("2025-12-14"),
      updatedAt: new Date("2025-12-14"),
      author: "System",
      description: "超短文要約プロンプト",
      performanceScore: 0.92
    }
  }
};
```

### 9.2 プロンプトA/Bテスト

```typescript
interface PromptVariant {
  variantId: string;
  prompt: string;
  weight: number;  // トラフィック配分（0-1）
}

const AB_TEST_CONFIG = {
  testId: "summary-ab-test-001",
  variants: [
    {
      variantId: "control",
      prompt: SUMMARY_PROMPT_SHORT,
      weight: 0.5
    },
    {
      variantId: "variant-a",
      prompt: SUMMARY_PROMPT_SHORT_V2,
      weight: 0.5
    }
  ],
  metrics: ["quality_score", "processing_time", "user_satisfaction"]
};
```

---

## 10. プロンプト最適化チェックリスト

### 実装前チェック

- [ ] 役割定義は明確か？
- [ ] ルールは具体的で数値化されているか？
- [ ] 出力フォーマットは明記されているか？
- [ ] Few-Shot例は必要か？（複雑なタスクの場合）
- [ ] 言語は統一されているか？
- [ ] トークン数は適切か？（コンテキスト長以内）

### 品質改善チェック

- [ ] あいまいな表現を排除したか？
- [ ] 矛盾する指示はないか？
- [ ] エッジケースを考慮したか？
- [ ] エラーハンドリングは適切か？
- [ ] バージョン管理されているか？
- [ ] パフォーマンステスト済みか？

---

## 参考資料

- [Llama 3 Prompt Engineering Guide](https://www.promptingguide.ai/models/llama-3)
- [Prompt Engineering with Llama 2 & 3 - DeepLearning.AI](https://www.deeplearning.ai/short-courses/prompt-engineering-with-llama-2/)
- [Best Practices for Prompt Engineering](https://www.lakera.ai/blog/prompt-engineering-guide)
- [Mastering Prompt Engineering with LLaMA 3.2](https://medium.com/@divatejaswi001/mastering-prompt-engineering-with-llama-3-2-a-hands-on-guide-using-jupyter-notebook-f24189bc15a0)
