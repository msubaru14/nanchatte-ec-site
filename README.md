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
.
├── backend
│   ├── cmd
│   │   └── api
│   ├── db
│   └── internal
│       ├── auth
│       ├── health
│       ├── middleware
│       ├── router
│       └── shared
├── db
├── docs
└── frontend
    └── app
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

`API_BASE_URL` は Next.js の Server Component など、frontend サーバー側から backend へ接続するためのURLです。
Docker Compose では `http://backend:8080` を使用します。
`NEXT_PUBLIC_API_BASE_URL` はブラウザ側から backend へ接続する実装で使用します。

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

## DB migration / seed

Migration は backend 起動時に自動実行されます。

```powershell
docker compose up --build -d
```

ローカルで backend を直接起動する場合も、起動時に migration が実行されます。

```powershell
cd backend
go run ./cmd/api
```

Seed は migration とは分けて、必要なタイミングで手動実行します。
Docker Compose 起動中は、backend コンテナから実行します。

```powershell
docker compose exec backend go run ./cmd/seed
```

backend をローカルで直接実行する環境では、backend ディレクトリから実行します。

```powershell
cd backend
go run ./cmd/seed
```

Seed は再実行可能な作りにしており、既に存在する初期データは重複投入しません。

## ローカル開発コマンド

Backend:

```powershell
cd backend
go test ./...
go run ./cmd/api
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
- auth API
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/me`
- Next.js の最小トップページ
- Docker Compose による `db` / `backend` / `frontend` 起動
- `internal/auth` による auth domain 構成
- auth の repository 分離
- `internal/shared` によるGo共通レスポンス・エラー基盤
- DB接続・migration実行基盤

## 注意

- `backend/.env` と `frontend/.env.local` はローカル用で、Git管理対象外です。
- `frontend/package.json` では `postcss` の脆弱性警告を避けるため `overrides` を設定しています。
