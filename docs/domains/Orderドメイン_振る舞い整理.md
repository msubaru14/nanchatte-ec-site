# Orderドメイン 振る舞い整理

# ■ Orderの役割

Orderは、ユーザーによる購入確定済みの注文を表す。

Cartが「購入予定」を表すのに対し、
Orderは「購入確定後の履歴」を表す。

---

# ■ 基本方針

- Orderは注文確定時に作成する
- Cartとは別概念として扱う
- 注文時点の商品情報・価格情報をスナップショット保存する
- 注文作成と在庫減算は同一トランザクションで行う
- 注文履歴は永続保持する

---

# ■ 注文作成タイミング

## 方針

Orderは注文確定時に作成する。

---

## 理由

- Cartは購入予定情報であるため
- 注文確定前の未確定注文管理を避けるため
- Phase1では決済・配送を扱わないため
- 疑似注文として十分自然なため

---

# ■ orders

## orders

```txt
orders
- id
- order_number
- user_id
- order_status
- total_excluding_tax
- total_tax
- total_including_tax
- ordered_at
- canceled_at nullable
- created_at
- updated_at
```

---

# ■ order_items

## order_items

```txt
order_items
- id
- order_id
- product_id
- product_name
- product_image_url nullable
- maker_name nullable
- model_number nullable
- unit_price_excluding_tax
- tax_rate
- unit_price_including_tax
- quantity
- subtotal_excluding_tax
- subtotal_tax
- subtotal_including_tax
- created_at
```

---

# ■ 注文番号

## order_number

- ユーザー向け注文番号
- unique制約を付ける
- 内部IDとは別管理
- 注文履歴・問い合わせ・管理画面で利用する

---

## order_number形式

Phase1では以下形式を採用する。

```txt
ORD-YYYYMMDD-XXXXXX
```

例:

```txt
ORD-20260515-A8K3D2
```

---

## 構成

- ORD: 注文番号prefix
- YYYYMMDD: 注文日
- XXXXXX: ランダム英数字

---

## idとの違い

### id

- DB内部識別子
- 外部公開しない

### order_number

- 外部表示用
- 問い合わせ用

---

# ■ 注文ステータス

## Phase1方針

Phase1では以下の2状態のみ。

```txt
ordered
canceled
```

---

## ordered

注文済み状態。

### 振る舞い

- 注文履歴に表示される
- 注文詳細を閲覧できる
- キャンセル条件を満たせばキャンセル可能

---

## canceled

キャンセル済み状態。

### 振る舞い

- 注文履歴に表示される
- 注文詳細を閲覧できる
- orderedへ戻さない

---

# ■ 状態遷移

```txt
ordered
  ↓
canceled
```

---

# ■ 将来的な状態分離

本番EC寄りへ拡張する場合は、
以下を分離して管理する可能性がある。

```txt
order_status
payment_status
shipment_status
```

---

## 例

```txt
order_status:
- ordered
- canceled

payment_status:
- unpaid
- paid
- refunded

shipment_status:
- unshipped
- shipped
- delivered
```

---

## Phase1でやらないもの

- 決済待ち
- 決済済み
- 配送中
- 配送済み
- 返品
- 返金
- 交換
- キャンセル申請

---

# ■ スナップショット方針

## 基本方針

注文確定時点の商品情報・価格情報を、
order_items にスナップショット保存する。

---

## スナップショット対象

- 商品名
- 商品画像
- メーカー名
- 型番
- 税抜単価
- 税率
- 税込単価
- 数量
- 小計

---

## 理由

注文後に以下が変更されても、
注文履歴を変えないため。

- 商品名変更
- 商品画像変更
- メーカー変更
- 型番変更
- 商品価格変更
- 税率変更
- 商品販売停止

---

# ■ product_id を残す理由

スナップショットだけでなく、
元商品への参照も保持する。

---

## 用途

- 商品詳細リンク
- 管理者調査
- レビュー導線
- 再購入導線

---

## 表示方針

注文履歴表示では、
現在の商品情報ではなくスナップショット情報を優先する。

---

# ■ totals

## orders

```txt
total_excluding_tax
total_tax
total_including_tax
```

を保持する。

---

## order_items

```txt
subtotal_excluding_tax
subtotal_tax
subtotal_including_tax
```

を保持する。

---

## 理由

### orders 側

- 注文一覧表示を軽くする
- 集計をしやすくする
- 履歴表示を簡単にする

### order_items 側

- 注文明細を完全保存する
- 税率変更後も履歴を保護する

---

# ■ 税額計算

## 税込単価

```txt
floor(unit_price_excluding_tax * (1 + tax_rate))
```

Phase1では小数点以下切り捨て。

---

## subtotal

```txt
subtotal_excluding_tax
  = unit_price_excluding_tax * quantity

subtotal_including_tax
  = unit_price_including_tax * quantity

subtotal_tax
  = subtotal_including_tax - subtotal_excluding_tax
```

---

# ■ 在庫減算

## 方針

Phase1では、
注文作成時に在庫を減算する。

---

## 注文確定処理

1. カート内容取得
2. 購入可能商品抽出
3. 商品状態確認
4. 在庫確認
5. 税率・価格取得
6. orders 作成
7. order_items 作成
8. products.stock_quantity 減算
9. cart_items 削除
10. 注文完了

---

# ■ トランザクション

以下を同一トランザクションで行う。

- orders 作成
- order_items 作成
- 在庫減算
- cart_items 削除

部分成功は禁止。

---

# ■ 購入不可商品の扱い

## 基本方針

購入可能な商品のみ注文対象にする。

---

## 購入不可ケース

- 商品販売停止
- 在庫不足
- 在庫切れ

---

## 振る舞い

- 購入可能商品のみ order_items 作成
- 購入不可商品は cart_items に残す
- ユーザーへ警告表示する

---

## 全商品購入不可

注文作成不可。

```txt
注文可能な商品がありません。
```

---

# ■ キャンセル

## 基本方針

Phase1ではキャンセル機能を持つ。

---

## キャンセル条件

```txt
order_status = ordered
```

の場合のみキャンセル可能。

---

## キャンセル時処理

1. order_status を canceled に変更
2. order_items.quantity 分だけ在庫復元
3. canceled_at を設定

---

## トランザクション

以下を同一トランザクションで行う。

- order_status 更新
- 在庫復元

---

# ■ User削除との関係

Userは論理削除のため、
注文履歴は保持される。

---

## 管理画面

退会済みユーザー注文として扱えるようにする。

---

# ■ 注文履歴表示

## 表示方針

注文履歴では、
現在の商品情報ではなく、
注文時点のスナップショットを表示する。

---

## 例

表示対象:

- 注文時商品名
- 注文時画像
- 注文時価格
- 注文時税率

---

# ■ 疑似決済

Phase1では決済ステータスを持たない。

注文確定 = 注文成功として扱う。

---

# ■ Phase1で持たないもの

- payment_status
- shipment_status
- 配送先
- 配送料
- 決済情報
- クーポン
- ポイント
- 追跡番号
- 備考
- ギフト情報
- 返品
- 返金
- 交換

---

# ■ 将来的な追加候補

## orders

```txt
payment_status
shipment_status
shipping_fee
coupon_discount
payment_method_id
shipping_address_id
tracking_number
```

---

## order_items

```txt
shipment_status
returned_at
refund_amount
```

---

# ■ Order設計方針まとめ

- Orderは購入確定済み履歴を表す
- 注文作成は注文確定時
- OrderとCartは別概念
- order_status は ordered / canceled
- 将来的に payment / shipment 状態分離を検討する
- order_items に注文時点情報をスナップショット保存する
- 注文履歴表示はスナップショット優先
- 在庫減算は注文作成時
- キャンセル時は在庫復元する
- 注文番号は内部IDと別管理
- orders / order_items 両方に totals を持つ
- 注文確定処理はトランザクション必須
- 疑似決済のため payment_status は持たない