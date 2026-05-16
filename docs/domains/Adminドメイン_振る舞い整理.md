# Adminドメイン 振る舞い整理

# ■ Adminの役割

Adminは、ECサイト全体の管理操作を行う権限を表す。

Phase1では単一店舗ECを前提とし、
出品者・マーケットプレイス構成は扱わない。

---

# ■ 基本方針

- 管理者専用テーブルは作らない
- User + Role による権限制御で管理する
- role に admin を付与することで管理者化する
- 管理者は商品・在庫・注文・レビューを管理できる

---

# ■ 権限管理

## user_roles

```txt
user_roles
- user_id
- role_id
```

---

## roles

```txt
roles
- id
- name
```

---

## Phase1 role

```txt
customer
admin
```

---

# ■ admin role

## 管理可能対象

- Product
- Stock
- Order
- Review
- Master

---

# ■ 商品管理

## 管理者ができること

- 商品登録
- 商品編集
- 商品一覧確認
- 商品詳細確認
- 商品販売停止
- 商品販売再開

---

## 商品状態

Phase1では:

```txt
active
stopped
```

のみ。

---

## draft

将来的な拡張候補。

---

# ■ 在庫管理

## 管理者ができること

- stock_quantity 更新
- low_stock_threshold 更新
- 在庫状態確認

---

## 管理者向け表示

管理者には実在庫数を表示する。

---

# ■ 注文管理

## 管理者ができること

- 注文一覧確認
- 注文詳細確認
- 注文キャンセル
- 退会済みユーザー注文確認

---

## 注文キャンセル

Phase1では:

```txt
order_status = ordered
```

の場合のみキャンセル可能。

---

## キャンセル時処理

- order_status を canceled に変更
- 在庫復元

---

# ■ レビュー管理

## 管理者ができること

- レビュー一覧確認
- レビュー詳細確認
- hidden化
- hidden解除

---

## hiddenレビュー

```txt
status = hidden
```

レビューは:

- 一般ユーザー非表示
- 平均評価対象外
- 管理者のみ確認可能

---

# ■ hidden理由

Phase1では hidden にするのみ。

---

## 将来的な追加候補

```txt
hidden_reason
hidden_by
hidden_at
```

---

# ■ マスタ管理

## 管理対象候補

- categories
- tax_rates

---

## Phase1

seed固定でもよい。

管理画面編集は後回し。

---

# ■ 管理者専用テーブル

## 方針

Phase1では不要。

```txt
admins
```

テーブルは作らない。

---

## 理由

- User + Role で十分
- 権限分離がシンプル
- 拡張しやすい

---

# ■ 管理者操作ログ

## Phase1

未実装。

---

## 将来的な候補

```txt
admin_audit_logs
- id
- admin_user_id
- action
- target_type
- target_id
- created_at
```

---

## 想定対象

- 商品価格変更
- 在庫更新
- 販売停止
- レビュー非表示
- 注文キャンセル

---

# ■ seller role

## 将来的な拡張候補

```txt
seller
```

---

## seller が持ちそうな権限

- 自分の商品登録
- 自分の商品編集
- 在庫更新
- 自分の商品注文確認

---

## Phase1でやらない理由

- 商品owner概念が必要
- マーケットプレイス化が必要
- 注文責務が複雑化する
- 売上分配等が発生する

---

# ■ 単一店舗前提

Phase1では:

```txt
単一EC店舗
```

として扱う。

---

# ■ Admin設計方針まとめ

- Adminは role ベース管理
- 管理者専用テーブルは作らない
- admin role のみで十分
- 管理者は Product / Stock / Order / Review を管理
- 商品状態は active / stopped
- 在庫は管理者のみ実数表示
- 管理者は注文キャンセル可能
- hiddenレビューを管理できる
- マスタ編集は後回し
- 管理ログは将来検討
- seller role は将来拡張
- Phase1は単一店舗EC前提
