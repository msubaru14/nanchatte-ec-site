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
│       ├── product
│       ├── router
│       └── shared
├── docs
└── frontend
    ├── app
    │   ├── api
    │   │   └── auth
    │   ├── login
    │   ├── products
    │   └── register
    ├── components
    │   └── layout
    ├── constants
    ├── contexts
    ├── features
    │   ├── auth
    │   │   ├── api
    │   │   │   ├── client
    │   │   │   ├── handler
    │   │   │   ├── schemas
    │   │   │   ├── server
    │   │   │   └── types
    │   │   ├── components
    │   │   └── utils
    │   └── products
    │       ├── api
    │       ├── components
    │       └── types
    ├── lib
    └── tests
        └── e2e
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
認証APIは Next.js Route Handler を BFF として経由し、Browser から Go API を直接呼び出しません。
`NEXT_PUBLIC_API_BASE_URL` は公開APIなど、Browser または frontend 側から直接 backend へ接続する実装で必要になった場合に使用します。

## Dockerで起動

```powershell
docker compose up --build -d
```

起動後の確認先:

- Frontend: http://localhost:3000
- ログイン画面: http://localhost:3000/login
- ユーザー登録画面: http://localhost:3000/register
- 商品一覧画面: http://localhost:3000/products
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

E2E:

Playwright は frontend 配下で実行します。事前に Docker Compose で backend / db を起動し、必要に応じて seed を投入します。

```powershell
docker compose up --build -d
docker compose exec backend go run ./cmd/seed
cd frontend
npx playwright install chromium
npm run test:e2e
```

UI モードで確認する場合:

```powershell
cd frontend
npm run test:e2e:ui
```

## 現在の実装状態

- `GET /api/health` の最小API
- auth API
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/me`
- auth BFF API
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - access token / refresh token を httpOnly cookie で管理
- 認証画面
  - `/login` と `/register` のフォーム表示
  - 認証成功時の `AuthContext` 反映
  - 内部パスに限定した `returnTo` 遷移
  - APIエラーおよび validation details の表示
- 共通 Header の認証導線
  - 未ログイン時のログイン・ユーザー登録導線表示
  - ログイン済み時のユーザー名・ログアウト導線表示
  - logout 後の `AuthContext` 更新と `/products` 遷移
  - logout API の失敗時も cookie 削除後は未ログイン状態へ更新
- product API
  - `GET /api/products`
  - `GET /api/products/:id`
- Next.js App Router によるトップページ
- 商品一覧画面
  - `GET /api/products` を利用した商品カード表示
  - loading / error / empty state
  - 商品詳細画面への導線
- Docker Compose による `db` / `backend` / `frontend` 起動
- `internal/auth` による auth domain 構成
- auth の repository 分離
- `internal/product` による product domain 構成
- `internal/shared` によるGo共通レスポンス・エラー基盤
- DB接続・migration実行基盤

## 注意

- `backend/.env` と `frontend/.env.local` はローカル用で、Git管理対象外です。
- `frontend/package.json` では `postcss` の脆弱性警告を避けるため `overrides` を設定しています。
