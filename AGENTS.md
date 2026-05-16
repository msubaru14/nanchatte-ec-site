# AGENTS.md

この文書は、このリポジトリで Codex が作業する際のルールを定義する。

## 目的

- 安全な変更を行う
- 設計ドキュメントと実装の整合性を保つ
- レビューしやすい差分にする
- 不要な調査やスコープ拡大を避ける
- 変更後に必要な検証と報告を行う

## プロジェクト概要

このリポジトリは、学習・ポートフォリオ用の「なんちゃってECサイト」である。

- 実際の決済・配送・メール送信は初期段階では扱わない
- ECサイトらしい商品、カート、注文、レビュー、認証、管理機能を段階的に作る
- Go backend + Next.js frontend のフロント・バック分離構成を採用する
- 軽量DDDと部分的なTDDを試す

詳細な設計資料の入口は `docs/設計ドキュメント索引.md` とする。

## 技術スタック

- Backend: Go / Gin / GORM
- Frontend: Next.js / TypeScript
- Database: PostgreSQL
- Infrastructure: Docker / Docker Compose
- API: JSON-based REST API

## ディレクトリ構成

```txt
.
├── backend
│   ├── controller
│   ├── db
│   ├── pkg
│   └── router
├── db
├── docs
│   ├── api
│   ├── database
│   ├── domains
│   └── ui
└── frontend
    └── app
```

今後 backend は必要に応じて以下の層を追加する。

- `domain`
- `service` または `application`
- `repository`
- `dto`
- `middleware`

## 基本原則

1. タスクの目的を守る
2. 変更を小さく保つ
3. スコープ外を変更しない
4. 関心事を混ぜない
5. 推測で進めない
6. 不明点を報告する
7. 作業後に結果を報告する

補足:

- 変更量を減らすこと自体を目的にしない
- 現在のタスクを安全で読みやすく、検証しやすい形にする
- 設計ドキュメントと実装が衝突する場合は、より具体的なタスク指示を優先し、不明点を確認する

## 設計ドキュメント参照ルール

実装・調査・レビューでは、まず `docs/設計ドキュメント索引.md` を入口にする。

主な参照先:

- プロジェクト概要: `docs/構想メモ.md`
- 初期設計: `docs/基本設計_初期案.md`
- API: `docs/api/API.md`
- 画面: `docs/ui/画面一覧.md`
- DB: `docs/database/DB制約整理.md`, `docs/database/dbdiagram.dbml`, `docs/database/ER.md`
- ドメインルール: `docs/domains/*_ドメイン_振る舞い整理.md`

実装対象に応じて、索引に記載された読み順に従う。

## 調査ルール

- 無関係なファイルは読まない
- 影響範囲を特定するための検索は許容する
- 検索結果から読むファイルは、現在のタスクに関係するものに絞る
- 「念のため」だけで無関係なファイルを開かない
- 調査はタスク目的に対して必要十分にする

必要な場合は、検索・確認した範囲を報告する。

## タスクスコープルール

- 1 branch = 1 目的
- 変更前に目的、対象範囲、変更種別を確認する
- 仕様変更、実装変更、docs更新を混ぜる場合は同じ目的に直接関係する範囲に限る
- 変更が大きくなり始めたら作業を止めて報告する
- 現在のタスクを直接支える小さな補助的整理は許容する

許容しない変更:

- 無関係なリファクタリング
- feature をまたぐ大規模再設計
- 広範囲な package 再編
- 目的外のUI変更
- 目的外の依存追加

## Backend 実装ルール

- API入口は `controller`
- ルーティングは `router`
- 共通レスポンスは `pkg/response`
- 共通エラーは `pkg/apperror`
- DB接続・migration基盤は `db`
- 業務ロジックが増えたら `domain` / `service` / `repository` を分ける
- 業務ルールは controller に寄せすぎない
- DB制約とアプリ側で守るルールの切り分けは `docs/database/DB制約整理.md` を確認する

Goファイル変更後は原則として以下を実行する。

```powershell
cd backend
go test ./...
```

## Frontend 実装ルール

- Next.js App Router を使う
- 画面実装前に `docs/ui/画面一覧.md` と関連API・ドメイン資料を確認する
- API通信のベースURLは `NEXT_PUBLIC_API_BASE_URL` を使う
- 業務ロジックはできるだけ Go API 側へ寄せる
- UI状態管理と表示責務を frontend に置く
- 生成物の `.next`、`node_modules` はコミットしない

Frontend変更後は、内容に応じて以下を実行する。

```powershell
cd frontend
npm run build
npm audit --audit-level=moderate
```

## Docker / 環境構築ルール

ローカル起動は Docker Compose を基本とする。

```powershell
docker compose up --build -d
docker compose ps
```

確認先:

- Frontend: `http://localhost:3000`
- Backend health check: `http://localhost:8080/api/health`
- PostgreSQL: `localhost:5432`

環境変数:

- `backend/.env` は `backend/.env.example` から作る
- `frontend/.env.local` は必要に応じて `frontend/.env.local.example` から作る
- `.env` 系のローカルファイルはコミットしない

## Git ワークフロールール

- 作業前に現在ブランチと差分を確認する
- 1 branch = 1 目的
- 古いブランチを安易に再利用しない
- 作業を行った場合、原則としてコミット前で止める
- commit、push、PR作成は、Commander から明示的に依頼された場合のみ行う
- コミット前に `git status` と staged diff を確認する
- 無関係なファイルを commit しない
- ユーザーが作った未コミット変更を勝手に戻さない

## Issue / PR テンプレートルール

Issue または PR を作成する場合は、事前に対応するテンプレートを確認する。

- PR作成時: `.github/pull_request_template.md`
- タスクIssue作成時: `.github/ISSUE_TEMPLATE/task.md`
- バグIssue作成時: `.github/ISSUE_TEMPLATE/bug_report.md`

テンプレートの項目をできるだけ埋める。
該当しない項目がある場合は、空欄にせず「該当なし」または理由を記載する。

## ファイル移動ルール

- 指定されたファイルだけ移動する
- 移動とロジック変更を混ぜない
- 移動後に参照パスや索引を確認する
- 無関係なファイルを削除しない

## 依存関係ルール

- 新しいライブラリを導入する前に目的と必要性を確認する
- 既存依存で実現できる場合は追加しない
- 依存追加後は lock file と audit 結果を確認する
- `go mod tidy`、`npm install` による差分は内容を確認してからコミットする

## 検証ルール

変更内容に応じて必要な検証を選ぶ。

- Backend: `go test ./...`
- Frontend: `npm run build`
- Frontend dependency: `npm audit --audit-level=moderate`
- Docker起動: `docker compose up --build -d`
- API疎通: `GET http://localhost:8080/api/health`
- Frontend疎通: `GET http://localhost:3000`

docs-only 変更の場合:

- Markdownの表示崩れ、リンク、記述整合性を確認する
- 実装やAPIに触れていない場合、テスト実行は必須ではない
- 未実施の検証がある場合は理由を報告する

## 報告ルール

作業完了後、必要に応じて以下を報告する。

- 目的
- 変更内容
- 変更ファイル
- 影響範囲
- 検証結果
- 懸念点
- 未実施の検証と理由

## エンコーディングルール

- Markdown、TypeScript、JavaScript、CSS、JSON、Go files は UTF-8 とする
- 日本語を含む可能性がある text file を PowerShell で読む場合は `Get-Content -Encoding UTF8` を使う
- Terminal output の mojibake は、UTF-8 で再読込するまで file corruption と判断しない
- 改行コードは `.gitattributes` に従い LF を基本とする

## 禁止事項

- 無関係なリファクタリング
- タスク目的に含まれない挙動変更
- 無関係なファイルの読み取り
- 要件の推測
- 不要な依存関係の追加
- 目的外のUI変更
- 関心事の混在
- ユーザーの未コミット変更の勝手な破棄

## 迷った場合

推測しない。

代わりに以下を報告する。

- 何が不明か
- なぜ重要か
- 考えられる選択肢
- 最も安全な推奨案

## タスク指示の優先

より具体的なタスク指示がある場合、その指示はこの文書より優先される。
