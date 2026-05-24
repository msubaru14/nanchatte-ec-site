# DB制約整理

dbdiagram.io / migration 作成前に、ER図と各ドメイン資料からDB制約を整理する。

## 前提

- DBは PostgreSQL を想定する
- 主キーは基本的に `bigint` の自動採番
- `created_at` / `updated_at` は原則 `NOT NULL`
- 金額は整数で保持する
- enumはDB enumまたはCHECK制約で表現する
- アプリケーション側validationも併用する

---

## users

| カラム | 制約 |
| --- | --- |
| id | PK |
| name | NOT NULL, 空文字不可, trim後最大文字数制限 |
| email | NOT NULL, UNIQUE, 大文字小文字を区別しない運用 |
| password_hash | NOT NULL |
| deleted_at | NULL |
| created_at | NOT NULL |
| updated_at | NOT NULL |

### 検討制約

- `email` は小文字正規化して保存する前提なら通常のUNIQUEでよい
- DB側で大文字小文字を吸収するなら `UNIQUE (lower(email))` 相当を検討する
- `deleted_at IS NOT NULL` のユーザーはログイン不可だが、これはアプリケーション側ルール

---

## roles

| カラム | 制約 |
| --- | --- |
| id | PK |
| name | NOT NULL, UNIQUE |
| created_at | NOT NULL |
| updated_at | NOT NULL |

### 値

- `customer`
- `admin`

---

## user_roles

| カラム | 制約 |
| --- | --- |
| user_id | NOT NULL, FK -> users.id |
| role_id | NOT NULL, FK -> roles.id |

### 複合制約

- UNIQUE: `(user_id, role_id)`

### 削除方針

- users削除時は、論理削除運用のため通常は物理削除されない
- roles削除は基本的に想定しない

---

## refresh_tokens

| カラム | 制約 |
| --- | --- |
| id | PK |
| user_id | NOT NULL, FK -> users.id |
| token_hash | NOT NULL, UNIQUE |
| expires_at | NOT NULL |
| revoked_at | NULL |
| created_at | NOT NULL |
| updated_at | NOT NULL |

### 補足

- 期限切れ・revoke済みtokenは一定期間後に物理削除する
- `revoked_at IS NOT NULL` または `expires_at < now()` は利用不可

---

## categories

| カラム | 制約 |
| --- | --- |
| id | PK |
| name | NOT NULL |
| created_at | NOT NULL |
| updated_at | NOT NULL |

### 制約方針

- Phase1では単一カテゴリ所属のみ
- `name` にUNIQUE制約は付けない
- Phase1ではアプリケーション側・seed側で重複しないように管理する
- 将来的にカテゴリ階層を持つ場合、同名カテゴリが別階層に存在し得る

---

## tax_rates

| カラム | 制約 |
| --- | --- |
| id | PK |
| name | NOT NULL |
| rate | NOT NULL, 0以上 |
| created_at | NOT NULL |
| updated_at | NOT NULL |

### 検討制約

- `rate >= 0`
- Phase1では税率マスタを参照し、注文時に `order_items.tax_rate` へスナップショット保存する
- `name` にUNIQUE制約は付けない
- 将来的に適用開始日・適用終了日を持つ税率履歴管理を検討する

### 将来候補

```txt
tax_rates
- id
- name
- rate
- effective_from
- effective_to
```

---

## products

| カラム | 制約 |
| --- | --- |
| id | PK |
| name | NOT NULL, 空文字不可, trim後最大文字数制限 |
| description | NULL, プレーンテキストのみ |
| price_excluding_tax | NOT NULL, 0以上 |
| tax_rate_id | NOT NULL, FK -> tax_rates.id |
| category_id | NOT NULL, FK -> categories.id |
| maker_name | NULL, trim後最大文字数制限 |
| model_number | NULL, trim後最大文字数制限 |
| stock_quantity | NOT NULL, 0以上 |
| low_stock_threshold | NOT NULL, 0以上 |
| status | NOT NULL |
| image_url | NULL |
| released_at | NULL |
| created_at | NOT NULL |
| updated_at | NOT NULL |

### 値

`status`

- `active`
- `stopped`

### 制約方針

- 商品名にUNIQUE制約は付けない
- `maker_name` / `model_number` にUNIQUE制約は付けない
- 商品は物理削除しない
- Phase1では `deleted_at` を持たない

### 検討制約

- `price_excluding_tax >= 0`
- `stock_quantity >= 0`
- `low_stock_threshold >= 0`
- `status IN ('active', 'stopped')`

---

## carts

| カラム | 制約 |
| --- | --- |
| id | PK |
| user_id | NOT NULL, FK -> users.id, UNIQUE |
| created_at | NOT NULL |
| updated_at | NOT NULL |

### 制約方針

- 1ユーザー1カート
- carts自体は注文確定後も残す

---

## cart_items

| カラム | 制約 |
| --- | --- |
| id | PK |
| cart_id | NOT NULL, FK -> carts.id |
| product_id | NOT NULL, FK -> products.id |
| quantity | NOT NULL, 1以上 |
| created_at | NOT NULL |
| updated_at | NOT NULL |

### 複合制約

- UNIQUE: `(cart_id, product_id)`

### 検討制約

- `quantity >= 1`
- `quantity <= stock_quantity` は在庫変動を伴うためアプリケーション側で検証する

### 削除方針

- ユーザーが削除したcart_itemsは物理削除
- 注文確定成功後、購入対象のcart_itemsは物理削除

---

## orders

| カラム | 制約 |
| --- | --- |
| id | PK |
| order_number | NOT NULL, UNIQUE |
| user_id | NOT NULL, FK -> users.id |
| order_status | NOT NULL |
| total_excluding_tax | NOT NULL, 0以上 |
| total_tax | NOT NULL, 0以上 |
| total_including_tax | NOT NULL, 0以上 |
| ordered_at | NOT NULL |
| canceled_at | NULL |
| created_at | NOT NULL |
| updated_at | NOT NULL |

### 値

`order_status`

- `ordered`
- `canceled`

### 検討制約

- `order_status IN ('ordered', 'canceled')`
- `total_excluding_tax >= 0`
- `total_tax >= 0`
- `total_including_tax >= 0`
- `canceled_at` と `order_status` の整合性はDB CHECKを入れず、アプリケーション側で保証する

---

## order_items

| カラム | 制約 |
| --- | --- |
| id | PK |
| order_id | NOT NULL, FK -> orders.id |
| product_id | NOT NULL, FK -> products.id |
| product_name | NOT NULL |
| product_image_url | NULL |
| maker_name | NULL |
| model_number | NULL |
| unit_price_excluding_tax | NOT NULL, 0以上 |
| tax_rate | NOT NULL, 0以上 |
| unit_price_including_tax | NOT NULL, 0以上 |
| quantity | NOT NULL, 1以上 |
| subtotal_excluding_tax | NOT NULL, 0以上 |
| subtotal_tax | NOT NULL, 0以上 |
| subtotal_including_tax | NOT NULL, 0以上 |
| created_at | NOT NULL |

### 制約方針

- 注文時点の商品情報・価格情報をスナップショット保存する
- 注文履歴表示では現在の商品情報ではなくスナップショットを優先する

### 検討制約

- `quantity >= 1`
- 各金額カラムは `>= 0`
- subtotal整合性は計算順や丸めを含むため、アプリケーション側で保証する

---

## reviews

| カラム | 制約 |
| --- | --- |
| id | PK |
| user_id | NOT NULL, FK -> users.id |
| product_id | NOT NULL, FK -> products.id |
| rating | NOT NULL, 1〜5の整数 |
| title | NULL, trim後最大文字数制限 |
| comment | NULL, プレーンテキストのみ |
| status | NOT NULL |
| created_at | NOT NULL |
| updated_at | NOT NULL |

### 複合制約

- UNIQUE: `(user_id, product_id)`

### 値

`status`

- `draft`
- `published`
- `hidden`

### 検討制約

- `rating BETWEEN 1 AND 5`
- `status IN ('draft', 'published', 'hidden')`
- CHECK: `comment IS NULL OR title IS NOT NULL`
- trim後空文字や最大文字数はアプリケーション側validationで見る

### 制約方針

- レビューは物理削除
- 平均評価・件数は `status = 'published'` のみを対象に都度集計する
- 購入済み判定は orders / order_items を参照するアプリケーション側ルール

---

## インデックス候補

### products

- `products(category_id)`
- `products(tax_rate_id)`
- `products(status)`
- `products(released_at)`
- `products(status, category_id, price_excluding_tax)`
- 商品検索用に `name`, `maker_name`, `model_number` の検索方法を実装時に検討

### orders

- `orders(user_id)`
- `orders(order_status)`
- `orders(ordered_at)`

### order_items

- `order_items(order_id)`
- `order_items(product_id)`

### reviews

- `reviews(product_id)`
- `reviews(product_id, status, created_at)`

### refresh_tokens

- `refresh_tokens(user_id)`

---

## DBだけでは守らない業務ルール

- カート投入時・数量変更時に商品が `active` か確認する
- カート投入時・数量変更時に、カート単位の更新ロックを用いたトランザクション内で数量が在庫数以下か確認する
- 注文確定時に商品状態・在庫・価格・税率を再確認する
- 注文確定、在庫減算、cart_items削除は同一トランザクションで行う
- 注文キャンセル時の在庫復元は同一トランザクションで行う
- レビュー投稿時に購入済み注文が存在するか確認する
- `deleted_at` があるユーザーはログイン不可にする
- emailやpassword_hashを不要なレスポンス・ログへ出さない
