# Userドメイン 振る舞い整理

# ■ Userの役割

Userは、ECサイトを利用する認証主体を表す。

「一般ユーザー」と「管理者」は排他的な種類ではなく、
Userが持つ権限（Role）として扱う。

管理者も通常ユーザー機能を利用可能とする。

---

# ■ User情報

## users

```txt
users
- id
- name
- email
- password_hash
- deleted_at nullable
- created_at
- updated_at
```

---

# ■ Role管理

## roles

```txt
roles
- id
- name
- created_at
- updated_at
```

---

## user_roles

```txt
user_roles
- user_id
- role_id
```

---

## Role例

```txt
customer
admin
```

---

## customer

- 商品閲覧
- カート利用
- 注文
- レビュー投稿

---

## admin

- 商品登録
- 商品編集
- 在庫更新
- 販売停止
- 注文一覧確認

---

# ■ Role設計方針

Roleは排他的な種類ではなく、
複数付与可能な権限として扱う。

例:

```txt
UserA
- customer

UserB
- customer
- admin
```

---

## 将来的な拡張候補

```txt
premium_customer
support_admin
super_admin
review_moderator
```

---

# ■ 一意性

## id

- ユーザーを一意に識別する
- システム内部で利用する
- 重複不可
- 自動採番

---

## email

- ログインIDとして利用する
- 重複不可
- 1メールアドレスにつき1ユーザー
- 大文字小文字は区別しない

例:

```txt
test@example.com
TEST@example.com
Test@Example.com
```

これらは同一メールアドレスとして扱う。

---

## name

- 表示名として扱う
- 重複許可
- unique制約は付けない
- 本名である必要はない
- レビュー表示などに利用する

例:

```txt
Alice
たろう
GadgetFan99
キーボード好き
```

---

# ■ name の扱い

## 用途

- レビュー投稿者表示
- マイページ表示
- UI上の表示名

---

## 制約

- 空文字不可
- trimを行う
- 最大文字数制限を持つ

例:

```txt
"  Alice  "
↓
"Alice"
```

---

## 大文字小文字

```txt
Alice
alice
ALICE
```

これらは別nameとして扱ってよい。

---

## 将来的な拡張

本名管理が必要になった場合は、
別テーブルまたはprofile情報として管理する。

例:

```txt
user_profiles
- user_id
- display_name
- real_name
```

ただしPhase1では不要。

---

# ■ emailの扱い

## Phase1方針

Phase1では email は平文保存する。

### 理由

- ログイン検索に利用する
- unique制約を扱いやすい
- 開発中の確認が容易
- Phase1では決済・住所・電話番号を扱わない

---

## 注意点

email は個人情報として扱う。

- password_hash と同時に返さない
- ログへ出力しない
- エラー詳細へ含めない
- 不要なAPIレスポンスへ含めない
- 管理画面で不用意に一覧表示しない

---

## 将来的な拡張

本番EC寄りにする場合は、
以下構成への移行を検討する。

```txt
users
- email_encrypted
- email_hash
```

### email_encrypted

- 表示用
- メール送信用
- 復号可能

### email_hash

- ログイン検索用
- 重複確認用
- unique制約用

---

## 将来移行しやすくする方針

- email正規化処理を共通化する
- email検索をRepositoryへ閉じ込める
- Service層でSQLを直接書かない
- User公開DTOを分離する

---

# ■ パスワード

- 平文保存しない
- password_hash として保存する
- 登録時にハッシュ化する
- ログイン時に照合する
- APIレスポンスには含めない

---

# ■ 認証方針

Phase1では以下を採用する。

- access token
- refresh token
- refresh tokenのDB保存
- refresh token失効管理
- logout時のrefresh token revoke
- Next.js BFF による httpOnly cookie 管理

---

## access token

- JWT形式
- 短命
- DB保存しない
- API認証に利用する

payload例:

```json
{
  "userId": 1,
  "roles": ["customer"]
}
```

管理者例:

```json
{
  "userId": 2,
  "roles": ["customer", "admin"]
}
```

---

## refresh token

- 長命
- access token再発行用
- DB保存する
- revoke可能
- 一定期間後に物理削除する

---

## BFF / cookie 管理

Browser は Go API を直接呼び出さず、Next.js Route Handler を BFF として経由する。

```txt
Browser
↓
Next.js Route Handler(BFF)
↓
Go API
```

access token / refresh token は Browser JavaScript から直接参照しない。
BFF が Go API の認証レスポンスを受け取り、以下の httpOnly cookie として管理する。

```txt
access_token
- httpOnly: true
- sameSite: lax
- path: /
- secure: productionのみtrue

refresh_token
- httpOnly: true
- sameSite: lax
- path: /
- secure: productionのみtrue
```

frontend の認証状態は token の有無ではなく、BFF の `GET /api/auth/me` の成功可否で判断する。

---

## refresh_tokens

```txt
refresh_tokens
- id
- user_id
- token_hash
- expires_at
- revoked_at nullable
- created_at
- updated_at
```

---

# ■ 認証フロー

## ログイン

1. email / password を受け取る
2. emailを正規化する
3. password_hashを照合する
4. UserのRole一覧を取得する
5. access token を発行する
6. refresh token を発行する
7. refresh token hash をDB保存する
8. BFF が access token / refresh token を httpOnly cookie に保存する

---

## 通常APIアクセス

1. Browser は BFF API を呼び出す
2. BFF が `access_token` cookie から access token を取得する
3. BFF が Go API へ Authorization header を付与して呼び出す
4. Go API が JWTを検証する
5. Go API が user_id / roles を取得する
6. Go API が認証・認可を行う

---

## access token期限切れ

1. BFF が access token で Go API を呼び出す
2. Go API が 401 を返した場合、BFF が `refresh_token` cookie で refresh を実行する
3. Go API が token_hash を照合する
4. Go API が revoked_at / expires_at を確認する
5. Go API が新しい access token を発行する
6. BFF が `access_token` cookie を更新する
7. BFF が元の Go API 呼び出しを1回だけ再実行する
8. refresh 失敗時は BFF が認証 cookie を削除する

---

## ログアウト

1. Browser が BFF の logout API を呼び出す
2. BFF が cookie から refresh token を取得する
3. BFF が Go API の logout API へ refresh token を送信する
4. Go API が対象 refresh token を revoke する
5. BFF は Go API の成功/失敗に関わらず認証 cookie を削除する
6. revoke 失敗時は BFF が Go API の HTTP status / error を返し、UI 側はログアウト済み状態へ遷移してよい

---

# ■ 認可方針

## 認証

「誰か」を確認する。

- JWT検証
- user_id取得
- ログイン状態確認

---

## 認可

「何をしてよいか」を確認する。

---

## customer role

- 自分のカートのみ操作可能
- 自分の注文のみ閲覧可能
- レビュー投稿可能

---

## admin role

- 管理者API利用可能
- 商品管理可能
- 注文一覧確認可能

---

# ■ API権限

## 公開API

```txt
GET /api/products
GET /api/products/:id
GET /api/categories
GET /api/products/:productId/reviews
GET /api/products/:productId/reviews/summary
```

---

## customer role 必須API

```txt
GET /api/me

GET /api/cart
POST /api/cart/items
PATCH /api/cart/items/:productId
DELETE /api/cart/items/:productId

POST /api/orders
GET /api/orders
GET /api/orders/:id

POST /api/products/:productId/reviews
GET /api/me/reviews
GET /api/me/reviews/:id
PATCH /api/me/reviews/:id
POST /api/me/reviews/:id/publish
DELETE /api/me/reviews/:id
```

---

## admin role 必須API

```txt
POST /api/admin/products
PATCH /api/admin/products/:id
PATCH /api/admin/products/:id/stock
PATCH /api/admin/products/:id/status

GET /api/admin/orders
```

---

# ■ ユーザー登録

- name / email / password を受け取る
- email重複確認を行う
- email正規化を行う
- nameをtrimする
- passwordをハッシュ化する
- 初期Roleとして customer を付与する
- admin role は通常登録APIからは付与しない

---

# ■ 管理者ユーザー

- admin role を持つUserとして扱う
- customer role も併せて持つことを許可する
- seed または内部処理で admin role を付与する
- 管理者APIは admin role 必須

---

# ■ User削除方針

## users

Userは論理削除とする。

```txt
deleted_at nullable
```

### 理由

- 注文履歴整合性維持
- レビュー整合性維持
- 誤削除復旧
- 監査対応

### 振る舞い

- deleted_at があるUserはログイン不可
- 削除済みUserは新規注文不可
- 注文履歴は保持する

---

# ■ refresh token削除方針

refresh_tokens は一定期間後に物理削除する。

---

## revoke

```txt
revoked_at nullable
```

- revoked_at があるtokenは利用不可
- expires_at 超過tokenは利用不可

---

## 定期削除対象

以下をバッチ削除対象とする。

- expires_at切れ
- revoked_at が一定期間より古いtoken

例:

```txt
expires_at < now() - interval '7 days'
or revoked_at < now() - interval '7 days'
```

---

# ■ Phase1では扱わないもの

- MFA
- SMS認証
- メール認証
- パスワードリセット
- 電話番号
- 住所
- 決済手段
- 通知設定
- ログイン履歴
- お気に入り

---

# ■ 将来的な拡張候補

## shipping_addresses

```txt
shipping_addresses
- id
- user_id
- recipient_name
- postal_code
- prefecture
- city
- address_line1
- address_line2
- phone_number
- is_default
```

---

## payment_methods

```txt
payment_methods
- id
- user_id
- provider
- provider_customer_id
- provider_payment_method_id
- brand
- last4
- exp_month
- exp_year
- is_default
```

---

## user_profiles

```txt
user_profiles
- user_id
- display_name
- real_name
- phone_number_encrypted
- phone_number_hash
- phone_verified_at
```

---

# ■ User設計方針まとめ

- Userは認証主体として最小限に保つ
- Roleは排他的種類ではなく権限として扱う
- user_roles により複数Role付与可能とする
- 管理者も通常ユーザー機能を利用可能とする
- access token + refresh token構成を採用する
- refresh tokenはDB管理する
- usersは論理削除
- refresh_tokensは物理削除前提
- emailはPhase1では平文保存する
- emailは個人情報として扱い、ログ・不要レスポンスへ露出しない
- 将来的に email_encrypted + email_hash 構成へ移行可能な設計を意識する
- name は本名ではなく表示名（ニックネーム）として扱う
- 個人情報は将来的に別テーブルへ分離する
- Phase1では過剰実装を避ける
