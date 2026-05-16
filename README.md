# なんちゃってECサイト

学習・ポートフォリオ用のECサイトです。
実際の決済や配送は扱わず、ECサイトらしい設計、状態管理、ドメインモデリングを学ぶことを目的にしています。

## 技術スタック

- Frontend: Next.js / TypeScript
- Backend: Go / Gin
- Database: PostgreSQL
- Infrastructure: Docker / Docker Compose

## ディレクトリ構成

```txt
frontend/  Next.js App Router
backend/   Go + Gin API
db/        DB関連の作業領域
docs/      設計ドキュメント
```

設計資料の入口は [docs/設計ドキュメント索引.md](docs/設計ドキュメント索引.md) です。

## 初回セットアップ

Backend 用の環境変数ファイルを作成します。

```powershell
Copy-Item backend\.env.example backend\.env
```

必要に応じて frontend 用の環境変数ファイルも作成します。

```powershell
Copy-Item frontend\.env.local.example frontend\.env.local
```

## Dockerで起動

```powershell
docker compose up --build -d
```

起動後の確認先:

- Frontend: http://localhost:3000
- Backend health check: http://localhost:8080/api/health
- PostgreSQL: localhost:5432

状態確認:

```powershell
docker compose ps
```

停止:

```powershell
docker compose down
```

## ローカル開発コマンド

Backend:

```powershell
cd backend
go test ./...
go run .
```

Frontend:

```powershell
cd frontend
npm install
npm run build
npm run dev
```

## 現在の実装状態

- `GET /api/health` の最小API
- Next.js の最小トップページ
- Docker Compose による `db` / `backend` / `frontend` 起動
- Go共通レスポンス・エラー基盤
- DB接続・migration実行基盤

## 注意

- `backend/.env` と `frontend/.env.local` はローカル用で、Git管理対象外です。
- `frontend/package.json` では `postcss` の脆弱性警告を避けるため `overrides` を設定しています。
