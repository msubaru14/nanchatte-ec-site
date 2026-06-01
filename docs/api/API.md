# API役割整理 初期案

## 権限分類

### 公開API

認証なしで利用できるAPI。

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/categories`
- `GET /api/products/:productId/reviews`
- `GET /api/products/:productId/review-summary`

### 特殊API

access token は不要だが、refresh token が必要。

- `POST /api/auth/refresh`

### customer必須API

ログイン済みユーザー向けAPI。`customer` role が必要。

- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:productId`
- `DELETE /api/cart/items/:productId`
- `DELETE /api/cart/items`
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders/:id/cancel`
- `POST /api/products/:productId/reviews`
- `GET /api/me/reviews`
- `GET /api/me/reviews/:id`
- `PATCH /api/me/reviews/:id`
- `POST /api/me/reviews/:id/publish`
- `DELETE /api/me/reviews/:id`

### admin必須API

管理者向けAPI。`admin` role が必要。

- `GET /api/admin/products`
- `GET /api/admin/products/:id`
- `POST /api/admin/products`
- `PATCH /api/admin/products/:id`
- `PATCH /api/admin/products/:id/status`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `POST /api/admin/orders/:id/cancel`
- `GET /api/admin/reviews`
- `GET /api/admin/reviews/:id`
- `POST /api/admin/reviews/:id/hide`
- `POST /api/admin/reviews/:id/publish`
- `GET /api/admin/categories`
- `GET /api/admin/tax-rates`

---

## Browser向けBFF共通方針

Browser から Go API を利用する機能は、Next.js Route Handler の BFF API を経由して実装する。

```txt
Browser
↓
Next.js Route Handler(BFF)
↓
Go API
```

認証を要する BFF API は `access_token` cookie を利用して Go API を呼び出し、access token の期限切れ時は `refresh_token` cookie を利用した refresh retry を適用する。
frontend は token を直接保持しない。
BFF は Go API の HTTP status と response / error code を維持して Browser へ返す。

---

## 認証

### 認証BFF固有の扱い

BFF は Go API から受け取った access token / refresh token を以下の httpOnly cookie に保存する。

- `access_token`
- `refresh_token`

認証状態は BFF の `GET /api/auth/me` の成功可否で判断する。

BFF の auth API は Browser 向けに以下を提供する。

```txt
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

Go API の `GET /api/me` は BFF 側では `GET /api/auth/me` として公開する。

---

### POST /api/auth/register

ユーザー登録を行う。

- name / email / password を受け取る
- email重複確認
- password hash化
- customer role付与
- cart作成
- access token / refresh token発行
- BFF 経由では register 成功後に login を実行し、token を httpOnly cookie に保存する
- BFF レスポンスでは token を Browser JavaScript へ返さない

---

### POST /api/auth/login

ログインを行う。

- email / password を受け取る
- 認証成功時に access token / refresh token を発行
- user情報とrole一覧を返す
- BFF 経由では token を httpOnly cookie に保存する
- BFF レスポンスでは token を Browser JavaScript へ返さない

---

### POST /api/auth/refresh

access tokenを再発行する。

- refresh token を受け取る
- token hash照合
- revoked / expires確認
- 新しいaccess tokenを返す
- BFF 経由では `refresh_token` cookie を利用する
- refresh 成功時は `access_token` cookie を更新する
- refresh 失敗時は認証 cookie を削除する

---

### POST /api/auth/logout

ログアウトする。

- refresh token をrevokeする
- BFF 経由では cookie から refresh token を取得する
- BFF は Go API の成功/失敗に関わらず認証 cookie を削除する
- revoke 失敗時は Go API の HTTP status / error を返す
- UI 側は logout 体験を壊さず、ログアウト済み状態へ遷移してよい

---

### GET /api/me

ログイン中ユーザー情報を取得する。

- id
- name
- email
- roles
- BFF 経由では `GET /api/auth/me` として公開する

---

# 商品 / カテゴリ

## GET /api/products

一般ユーザー向けの商品一覧を取得する。

- status = active の商品のみ
- 在庫0商品も含める
- 検索・絞り込み・並び替え・ページネーション対応
- stock_quantity は返さず stock_status を返す
- 税込価格を返す

---

## GET /api/products/:id

一般ユーザー向けの商品詳細を取得する。

- status = active の商品のみ取得可能
- stopped 商品はNot Found扱い
- stock_status を返す
- 税込価格を返す
- レビュー概要も含めるかは要検討

---

## GET /api/categories

商品カテゴリ一覧を取得する。

- 商品一覧の絞り込みに利用する
- Phase1では公開APIでよい

---

# 管理者商品API

## GET /api/admin/products

管理者向けの商品一覧を取得する。

- active / stopped 両方を取得可能
- stock_quantity を返す
- low_stock_threshold を返す
- 検索・絞り込み・ページネーション対応

---

## GET /api/admin/products/:id

管理者向けの商品詳細を取得する。

- stopped 商品も取得可能
- 編集フォーム初期値として利用する
- 税抜価格・税率・在庫数を返す

---

## POST /api/admin/products

商品を新規登録する。

- 商品名
- 商品説明
- 税抜価格
- 税率
- カテゴリ
- メーカー名
- 型番
- 在庫数
- 残りわずか閾値
- 商品状態
- 画像URL
- 発売日

を受け取る。

---

## PATCH /api/admin/products/:id

商品情報を更新する。

- 商品フォーム画面から利用する
- 基本情報・価格・在庫・状態を更新可能

---

## PATCH /api/admin/products/:id/status

商品状態を変更する。

- active / stopped を切り替える
- 商品一覧から販売停止・再開を行う場合に利用する

※ PATCH /api/admin/products/:id に統合してもよい。

---

# カート

以下のAPIは `customer` role を持つ認証済みユーザーのみ利用できる。
request / response / error の詳細仕様は `docs/api/openapi.yaml` を参照する。

## GET /api/cart

ログインユーザーのカート内容を取得する。

- 現在の価格・在庫状態・購入可否・合計金額を返す
- 数量操作の上限制御用に `maxSelectableQuantity` を返す
- Phase1では `maxSelectableQuantity` は現在在庫数と同値だが、実在庫数表示には利用しない
- 投入後に購入不可となった商品も自動削除しない

---

## POST /api/cart/items

商品をカートに追加する。

- `productId` と `quantity` を受け取る
- 同じ商品が既にある場合は数量を加算する
- 販売停止商品と在庫不足の商品は追加不可
- 在庫不足の場合は `OUT_OF_STOCK` と、今回追加可能な数量 `availableQuantity` を返す

---

## PATCH /api/cart/items/:productId

カート内商品の数量を変更する。

- `quantity` で指定数量を上書きする
- 販売停止商品と在庫不足となる変更は不可
- 在庫不足の場合は `OUT_OF_STOCK` と、設定可能な数量 `availableQuantity` を返す

---

## DELETE /api/cart/items/:productId

カート内の商品を削除する。

- 対象 `cart_item` を物理削除する

---

## DELETE /api/cart/items

カート内商品をすべて削除する。

- `cart_items` を全削除し、`carts` 自体は残す

---

# 注文

## POST /api/orders

カート内容から注文を作成する。

- request body は持たない
- 商品状態・在庫・価格・税率を最終確認
- 1件でも購入不可商品があれば注文作成せずエラーを返す
- orders / order_items 作成
- 在庫減算
- 注文成功後に対象 cart_items を物理削除する
- 注文番号、合計金額、注文日時、注文明細を返す
- 注文確定処理は transaction 内で行い、部分成功させない
- BFF 経由では `POST /api/orders` として公開し、Browser から Go API を直接呼ばない
- BFF は `access_token` cookie を利用して Go API を呼び出し、期限切れ時は refresh retry を適用する
- BFF は Go API の HTTP status と response / error code を維持して Browser へ返す
- BFF レスポンスでは token を Browser JavaScript へ返さない

主なエラー:

- `EMPTY_CART`: Cartが空の場合。HTTP status は `400 Bad Request`
- `OUT_OF_STOCK`: 注文確定時点で在庫不足になっている商品がある場合。HTTP status は `409 Conflict`
- `VALIDATION_ERROR`: 販売停止商品など、注文対象として不正な商品が含まれる場合。HTTP status は `400 Bad Request`

---

## GET /api/orders

ログインユーザーの注文履歴一覧を取得する。

- 自分の注文のみ
- order_number
- order_status
- total_including_tax
- ordered_at
- item_count

を返す。

---

## GET /api/orders/:id

ログインユーザーの注文詳細を取得する。

- 自分の注文のみ取得可能
- order_items はスナップショット情報を返す
- 他ユーザーの注文IDを指定した場合も NOT_FOUND を返す
- orderId が数値でない場合は INVALID_REQUEST を返す

---

## POST /api/orders/:id/cancel

ログインユーザーが自分の注文をキャンセルする。

- order_status = ordered の場合のみ可能
- order_status を canceled にする
- 在庫復元
- canceled_at 設定

---

# 管理者注文API

## GET /api/admin/orders

管理者向けの注文一覧を取得する。

- 全ユーザーの注文を取得可能
- status / ordered_at などで絞り込み可能
- 退会済みユーザー注文も表示する

---

## GET /api/admin/orders/:id

管理者向けの注文詳細を取得する。

- 全注文を取得可能
- 注文者情報
- order_items
- キャンセル状態

を返す。

---

## POST /api/admin/orders/:id/cancel

管理者が注文をキャンセルする。

- order_status = ordered の場合のみ可能
- 在庫復元
- canceled_at 設定

---

# レビュー

## GET /api/products/:productId/reviews

商品レビュー一覧を取得する。

- published のみ
- 新しい順
- 将来的に rating filter 対応
- hidden / draft は返さない

---

## GET /api/products/:productId/review-summary

商品レビュー概要を取得する。

- averageRating
- reviewCount

を返す。

---

## POST /api/products/:productId/reviews

レビューを作成する。

- 購入者限定
- 1ユーザー1商品1レビュー
- rating 必須
- title / comment 任意
- comment がある場合 title 必須
- 初期statusは draft

---

## GET /api/me/reviews

ログインユーザー自身のレビュー一覧を取得する。

- draft / published / hidden を含めるか要検討
- 自分のレビュー管理用

---

## GET /api/me/reviews/:id

自分のレビュー詳細を取得する。

- 編集画面初期値として利用する

---

## PATCH /api/me/reviews/:id

自分のレビューを編集する。

- draft 状態のみ編集可能
- rating / title / comment を更新する

---

## POST /api/me/reviews/:id/publish

draftレビューを公開する。

- status を published にする
- published が平均評価対象になる

---

## DELETE /api/me/reviews/:id

自分のレビューを削除する。

- 物理削除
- unique(user_id, product_id) が解放される

---

# 管理者レビューAPI

## GET /api/admin/reviews

管理者向けレビュー一覧を取得する。

- published / hidden / draft を確認可能にするか要検討
- product / status / rating で絞り込み可能

---

## GET /api/admin/reviews/:id

管理者向けレビュー詳細を取得する。

---

## POST /api/admin/reviews/:id/hide

レビューを hidden にする。

- 一般非表示
- 平均評価対象外

---

## POST /api/admin/reviews/:id/publish

hidden レビューを published に戻す。

---

# マスタ

## GET /api/admin/categories

管理者向けカテゴリ一覧を取得する。

- 商品フォームの選択肢に利用する

---

## GET /api/admin/tax-rates

管理者向け税率一覧を取得する。

- 商品フォームの選択肢に利用する
