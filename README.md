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
│       ├── cart
│       ├── health
│       ├── middleware
│       ├── order
│       ├── product
│       ├── review
│       ├── router
│       └── shared
├── docs
└── frontend
    ├── app
    │   ├── admin
    │   │   ├── login
    │   │   ├── products
    │   │   └── reviews
    │   ├── api
    │   │   ├── admin
    │   │   ├── auth
    │   │   ├── cart
    │   │   ├── me
    │   │   ├── orders
    │   │   └── products
    │   ├── cart
    │   ├── login
    │   ├── me
    │   ├── orders
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
    │   ├── cart
    │   │   ├── api
    │   │   │   ├── client
    │   │   │   ├── handler
    │   │   │   ├── server
    │   │   │   └── types
    │   │   └── utils
    │   ├── order
    │   │   ├── api
    │   │   │   ├── client
    │   │   │   ├── handler
    │   │   │   ├── server
    │   │   │   └── types
    │   │   └── utils
    │   ├── products
    │   │   ├── api
    │   │   ├── components
    │   │   └── types
    │   └── reviews
    │       └── api
    │           ├── client
    │           ├── handler
    │           ├── server
    │           └── types
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
Browser から Go API を利用する機能は Next.js Route Handler を BFF として経由し、Go API を直接呼び出しません。
現在の BFF 経由機能では `NEXT_PUBLIC_API_BASE_URL` を使用しません。

## Dockerで起動

```powershell
docker compose up --build -d
```

起動後の確認先:

- Frontend: http://localhost:3000
- ログイン画面: http://localhost:3000/login
- ユーザー登録画面: http://localhost:3000/register
- 商品一覧画面: http://localhost:3000/products
- カート画面: http://localhost:3000/cart
- マイページ: http://localhost:3000/me
- 自分のレビュー一覧画面: http://localhost:3000/me/reviews
- 管理者ログイン画面: http://localhost:3000/admin/login
- 管理者トップ画面: http://localhost:3000/admin
- 管理者商品一覧画面: http://localhost:3000/admin/products
- 管理者商品登録画面: http://localhost:3000/admin/products/new
- 管理者商品編集画面: http://localhost:3000/admin/products/{id}/edit
- 管理者レビュー一覧画面: http://localhost:3000/admin/reviews
- 注文確認画面: http://localhost:3000/orders/confirm
- 注文完了画面: http://localhost:3000/orders/complete
- 注文履歴一覧画面: http://localhost:3000/orders
- Backend health check: http://localhost:8080/api/health
- API仕様（Swagger UI）: http://localhost:8081
- PostgreSQL: localhost:5432

状態確認:

```powershell
docker compose ps
```

停止:

```powershell
docker compose down
```

## API仕様の確認

API仕様は Swagger UI で閲覧できます。以下のコマンドで `swagger-ui` コンテナを含む環境を起動します。

```powershell
docker compose up --build -d
```

起動後、http://localhost:8081 を開くと `docs/api/openapi.yaml` に記載された実装済みAPIの request / response / error 仕様を確認できます。

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
- BFF API
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `GET /api/cart`
  - `POST /api/cart/items`
  - `PATCH /api/cart/items/:productId`
  - `DELETE /api/cart/items/:productId`
  - `DELETE /api/cart/items`
  - `POST /api/orders`
  - `GET /api/orders`
  - `GET /api/orders/:id`
  - `GET /api/products/:productId/reviews`
  - `GET /api/products/:productId/reviews/summary`
  - `POST /api/products/:productId/reviews`
  - `GET /api/me/reviews`
  - `GET /api/me/reviews/:id`
  - `PATCH /api/me/reviews/:id`
  - `POST /api/me/reviews/:id/publish`
  - `DELETE /api/me/reviews/:id`
  - `GET /api/admin/products`
  - `GET /api/admin/products/:id`
  - `POST /api/admin/products`
  - `PATCH /api/admin/products/:id`
  - `POST /api/admin/products/:id/stop-selling`
  - `POST /api/admin/products/:id/resume-selling`
  - `GET /api/admin/reviews`
  - `POST /api/admin/reviews/:id/hide`
  - `POST /api/admin/reviews/:id/publish`
  - access token / refresh token を httpOnly cookie で管理
  - 認証対象 API では 401 時に refresh retry を行う
  - backend の response / error code を Browser 向けにも維持する
- 認証画面
  - `/login` と `/register` のフォーム表示
  - 認証成功時の `AuthContext` 反映
  - 内部パスに限定した `returnTo` 遷移
  - APIエラーおよび validation details の表示
- 共通 Header の認証導線
  - 未ログイン時のログイン・ユーザー登録導線表示
  - ログイン済み時のユーザー名リンク・ログアウト導線表示
  - ユーザー名リンクからマイページへ進む導線
  - ログイン済み時のCart導線と、商品がある場合の数量合計バッジ表示
  - Cart追加・数量変更・削除後のCart件数再取得
  - logout 後の `AuthContext` 更新と `/products` 遷移
  - logout API の失敗時も cookie 削除後は未ログイン状態へ更新
- マイページ
  - Headerのユーザー名リンクから `/me` へ遷移
  - 注文履歴一覧への導線
  - 自分のレビュー一覧への導線
  - 未ログイン時の returnTo 付きログイン遷移
- product API
  - `GET /api/products`
  - `GET /api/products/:id`
- cart API
  - `GET /api/cart`
  - `POST /api/cart/items`
  - `PATCH /api/cart/items/:productId`
  - `DELETE /api/cart/items/:productId`
  - `DELETE /api/cart/items`
  - `customer` role の認証済みユーザー向けに、表示・追加・数量変更・削除を提供
  - 追加・数量変更では販売状態と在庫を確認し、同時操作時の数量超過を防ぐ
- order API
  - `POST /api/orders`
  - `GET /api/orders`
  - `GET /api/orders/:id`
  - `customer` role の認証済みユーザー向けに、Cart内容から注文を作成
  - 注文確定時に商品状態・在庫・価格・税率を再確認
  - 注文成功時に在庫減算、order_items作成、cart_items削除を同一transactionで実行
  - 注文履歴一覧ではログインユーザー自身の注文概要と商品数量合計を返す
  - 注文履歴詳細では order_items に保存した注文時点のスナップショットを返す
- review API
  - `GET /api/products/:productId/reviews`
  - `GET /api/products/:productId/reviews/summary`
  - `POST /api/products/:productId/reviews`
  - `GET /api/me/reviews`
  - `GET /api/me/reviews/:id`
  - `PATCH /api/me/reviews/:id`
  - `POST /api/me/reviews/:id/publish`
  - `DELETE /api/me/reviews/:id`
  - 購入済みユーザーのみレビューを作成可能
  - 1ユーザー1商品1レビュー制約を適用
  - published のみ公開一覧・平均評価対象にする
  - draft レビューのみ編集・公開可能
- admin review API
  - `GET /api/admin/reviews`
  - `POST /api/admin/reviews/:id/hide`
  - `POST /api/admin/reviews/:id/publish`
  - `admin` role の認証済みユーザー向けに、全ユーザーのレビュー一覧を提供
  - draft / published / hidden を管理者一覧に含める
  - レビューを hidden にすると公開一覧・平均評価対象から除外する
  - hidden レビューを published に戻すと公開一覧・平均評価対象に再反映する
- admin product API
  - `GET /api/admin/products`
  - `GET /api/admin/products/:id`
  - `POST /api/admin/products`
  - `PATCH /api/admin/products/:id`
  - `POST /api/admin/products/:id/stop-selling`
  - `POST /api/admin/products/:id/resume-selling`
  - `admin` role の認証済みユーザー向けに、販売中・販売停止の商品一覧と詳細を提供
  - 商品登録・編集では商品名、税抜価格、税率、カテゴリ、在庫数、残りわずか閾値を validation する
  - 販売停止・販売再開は冪等に扱う
  - 一般ユーザー向けの商品一覧・詳細では、引き続き active 商品のみ返す
- 注文確認 / 注文完了画面
  - Cart画面から注文確認画面への導線
  - Cart BFFを利用した注文前確認
  - Order BFFを利用した注文確定
  - 注文確定中の二重送信防止
  - `EMPTY_CART` / `OUT_OF_STOCK` / `VALIDATION_ERROR` の表示
  - 注文完了画面で注文番号と合計金額を表示
  - 注文完了画面から注文履歴詳細・注文履歴一覧へ進む導線
- 注文履歴画面
  - `GET /api/orders` BFFを利用した注文履歴一覧表示
  - `GET /api/orders/:id` BFFを利用した注文履歴詳細表示
  - マイページから注文履歴一覧への導線
  - 一覧から詳細への導線
  - 注文0件表示
  - `UNAUTHORIZED` 時の returnTo 付きログイン遷移
  - `NOT_FOUND` / `INVALID_REQUEST` の案内表示
  - 注文履歴詳細の商品ごとに、商品詳細画面のレビュー投稿フォームへ進む導線を表示
- 自分のレビュー一覧画面
  - `GET /api/me/reviews` BFFを利用した自分のレビュー一覧表示
  - `GET /api/me/reviews/:id` BFFを利用した自分のレビュー編集フォーム初期表示
  - `PATCH /api/me/reviews/:id` BFFを利用した下書きレビュー編集
  - `DELETE /api/me/reviews/:id` BFFを利用した自分のレビュー削除
  - draft / published / hidden を含むレビュー表示
  - status のユーザー向け表示名変換
  - title / comment 未入力レビュー表示
  - レビュー0件表示
  - 取得失敗時のエラー表示と再読み込み導線
  - 未ログイン時の returnTo 付きログイン遷移
  - 商品詳細画面への導線
  - 下書きレビューの編集画面への導線
  - 公開中・非表示レビューの編集不可表示
  - 削除前の確認ダイアログと削除失敗時のエラー表示
- 管理者商品一覧画面
  - `GET /api/admin/products` BFFを利用した管理者商品一覧表示
  - 管理者商品登録画面への導線
  - 管理者商品編集画面への導線
  - `POST /api/admin/products/:id/stop-selling` BFFを利用した販売停止
  - `POST /api/admin/products/:id/resume-selling` BFFを利用した販売再開
  - 管理者トップから商品管理への導線
  - active / stopped の管理者向け表示名変換
  - 在庫あり / 残りわずか / 在庫なしの表示
  - description 未入力商品表示
  - 商品0件表示
  - 取得失敗時のエラー表示と再読み込み導線
  - 未ログイン時の returnTo 付き管理者ログイン遷移
  - customerユーザーの権限エラー表示
  - 操作前の確認ダイアログと操作失敗時のエラー表示
- 管理者商品登録 / 編集画面
  - `GET /api/admin/products/:id` BFFを利用した編集フォーム初期表示
  - `POST /api/admin/products` BFFを利用した商品登録
  - `PATCH /api/admin/products/:id` BFFを利用した商品編集
  - 商品登録時の active / stopped 選択
  - 商品編集時は status を直接編集しない
  - description 空欄、stockQuantity = 0、lowStockThreshold = 0 に対応
  - backend validation error の form / field 表示
  - 登録・編集成功後の管理者商品一覧への遷移と成功メッセージ表示
  - 未ログイン時の returnTo 付き管理者ログイン遷移
  - customerユーザーの権限エラー表示
  - 編集対象取得失敗時のエラー表示と再読み込み導線
  - 存在しない商品IDの Not Found 表示
- Next.js App Router によるトップページ
- 商品一覧画面
  - `GET /api/products` を利用した商品カード表示
  - loading / error / empty state
  - 商品詳細画面への導線
- 商品詳細画面
  - `GET /api/products/:id` を利用した商品詳細表示
  - 数量ステッパーからの Cart追加
  - 在庫不足時の購入可能数量による再追加提案
  - 未ログイン時のログイン画面への復帰導線
  - Review BFFを利用した平均評価・レビュー件数・公開レビュー一覧表示
  - レビュー0件表示、title / comment 未設定レビュー表示、レビュー取得失敗時の部分エラー表示
  - 注文履歴詳細から `review=1` 付きで遷移した場合のみ、レビュー投稿フォームを表示
  - レビュー投稿フォームでは5段階のスターレーティング、タイトル、コメントを入力可能
  - 投稿時は draft レビュー作成後に公開APIを呼び出し、成功後にフォーム初期化とレビュー一覧再取得を行う
- Docker Compose による `db` / `backend` / `frontend` 起動
- `internal/auth` による auth domain 構成
- auth の repository 分離
- `internal/product` による product domain 構成
- `internal/cart` による cart domain 構成
- `internal/review` による review domain 構成
- `internal/shared` によるGo共通レスポンス・エラー基盤
- DB接続・migration実行基盤

## 注意

- `backend/.env` と `frontend/.env.local` はローカル用で、Git管理対象外です。
- `frontend/package.json` では `postcss` の脆弱性警告を避けるため `overrides` を設定しています。
