# Productドメイン 振る舞い整理

# ■ Productの役割

Productは、ECサイト上で販売対象となる商品を表す。

一般ユーザーは商品を閲覧し、在庫がある商品をカートへ追加できる。  
管理者は商品を登録・編集・在庫更新・販売停止できる。

---

# ■ Product情報

## products

```txt
products
- id
- name
- description nullable
- price_excluding_tax
- tax_rate_id
- category_id
- maker_name nullable
- model_number nullable
- stock_quantity
- low_stock_threshold
- status
- image_url nullable
- released_at nullable
- created_at
- updated_at
```

---

# ■ 商品名

## name

- 必須
- 空文字不可
- trimする
- 最大文字数制限を持つ
- unique制約は付けない

---

# ■ 商品説明

## description

- 任意
- nullable許可
- プレーンテキストのみ
- HTML不可
- Markdown不可

### 理由

- 商品説明がなくてもシステム上は商品として成立する
- HTML / Markdown は表示崩れやXSS対策が必要になる
- Phase1ではリッチな説明文は不要
- リッチな訴求は商品画像側に寄せられる

---

# ■ 商品画像

## image_url

- Phase1では1枚のみ対応
- nullable許可
- 画像アップロードは行わない
- seedデータ、外部URL、固定画像URLを利用する

### image_url がある場合

- 商品一覧に表示する
- 商品詳細に表示する

### image_url がない場合

- デフォルト画像を表示する
- 「画像がありません」相当のプレースホルダーを表示する

### 将来的な拡張

複数画像が必要になった場合は `product_images` へ分離する。

```txt
product_images
- id
- product_id
- image_url
- sort_order
```

---

# ■ 価格・税率

## 基本方針

商品価格は税抜価格で保持する。

税込価格は表示時・注文金額計算時に計算する。

---

## products

```txt
products
- price_excluding_tax
- tax_rate_id
```

---

## tax_rates

```txt
tax_rates
- id
- name
- rate
- created_at
- updated_at
```

---

## 税込価格計算

```txt
税込価格 = floor(price_excluding_tax * (1 + tax_rate.rate))
```

Phase1では小数点以下切り捨て。

---

## APIレスポンス

一般ユーザー向けAPIでは税込価格を返す。

```json
{
  "id": 1,
  "name": "Sample Keyboard",
  "priceIncludingTax": 11000
}
```

管理者向けAPIでは税抜価格・税率・税込価格を返してよい。

```json
{
  "priceExcludingTax": 10000,
  "taxRate": 0.10,
  "priceIncludingTax": 11000
}
```

---

## 注文時スナップショット

注文確定時には、価格・税率をOrderItemへスナップショット保存する。

```txt
order_items
- unit_price_excluding_tax
- tax_rate
- unit_price_including_tax
```

### 理由

- 商品価格変更後も過去注文履歴を保護するため
- 税率変更後も注文時点の金額を保持するため

---

# ■ 税率マスタ運用

Phase1では税率マスタを参照し、
注文時に税率値をスナップショット保存する。

税率マスタの詳細運用は将来検討とする。

検討候補:

- 既存税率レコードを変更する
- 新しい税率レコードを追加する
- 適用開始日 / 適用終了日を持つ

---

# ■ カテゴリ

## category_id

- 商品は1カテゴリに所属する
- category_id は必須
- 複数カテゴリ指定はPhase1では行わない

---

## カテゴリ絞り込み

Phase1では単一カテゴリ指定とする。

```txt
category=keyboard
```

### 将来的な拡張

複数カテゴリ指定を検討する。

```txt
categories=keyboard,mouse
```

---

# ■ メーカー

## maker_name

- 任意
- nullable許可
- trimする
- 最大文字数制限を持つ
- unique制約なし
- Phase1では文字列で持つ
- メーカーマスタ化は将来検討

---

# ■ 型番

## model_number

- 任意
- nullable許可
- trimする
- 最大文字数制限を持つ
- unique制約なし
- 検索対象に含める

### 理由

- 型番はメーカー側が定義するもの
- システム側が一意性を保証する責務ではない
- 別メーカーで同一型番が存在し得る
- 型番未設定商品もあり得る

---

# ■ 商品状態

## status

Phase1では以下の2状態とする。

```txt
active
stopped
```

---

## active

一般ユーザー向けに公開中の商品。

### 振る舞い

- 商品一覧に表示される
- 商品詳細に表示される
- 在庫があればカート追加可能
- 在庫があれば注文可能

---

## stopped

販売停止中の商品。

### 振る舞い

- 一般ユーザーの商品一覧には表示しない
- 一般ユーザーの商品詳細では閲覧不可
- カート追加不可
- 注文不可
- 管理者画面では表示可能
- 管理者は編集可能
- 必要に応じて active に戻せる

---

# ■ 商品削除方針

商品は物理削除しない。

また、`deleted_at` による論理削除もPhase1では行わない。

販売停止 `stopped` を、事実上の非公開・削除相当の状態として扱う。

### 理由

- 注文履歴との整合性を保つため
- レビューとの整合性を保つため
- 商品情報を完全に消す必要が薄いため
- 販売停止で一般ユーザーから非表示にできるため
- 状態が増えすぎると運用が複雑になるため

---

# ■ 将来的な商品状態候補

```txt
draft
active
stopped
archived
```

---

## draft

公開前の商品登録・下書き保存・公開前確認が必要になった場合に検討する。

---

## archived

以下のような運用が必要になった場合に検討する。

- 二度と販売しないが、管理上は残したい
- 管理画面の通常一覧からも隠したい
- 販売停止商品が増えすぎて整理したい
- 商品マスタとして履歴参照だけ残したい

Phase1では不要。

---

# ■ 在庫

## stock_quantity

- 0以上
- 管理者向けには実在庫数を表示する
- 一般ユーザー向けには実在庫数を表示しない

---

## low_stock_threshold

- 商品ごとの「残りわずか」判定閾値
- 商品登録時に指定がなければデフォルト値を使う

例:

```txt
low_stock_threshold = 5
```

---

# ■ 在庫表示

一般ユーザー向け画面では、在庫数そのものは表示しない。

代わりに在庫状態を表示する。

```txt
○ 在庫あり
△ 残りわずか
× 在庫なし
```

---

## 判定ルール

```txt
stock_quantity = 0
  → out_of_stock

stock_quantity <= low_stock_threshold
  → low_stock

stock_quantity > low_stock_threshold
  → in_stock
```

---

## stock_status

```txt
in_stock
low_stock
out_of_stock
```

---

## 一般ユーザー向けAPI

`stock_quantity` と `low_stock_threshold` は返さず、  
`stock_status` のみ返す。

```json
{
  "id": 1,
  "name": "Sample Keyboard",
  "stockStatus": "low_stock"
}
```

---

## 管理者向けAPI

管理者向けAPIでは以下を返す。

```json
{
  "id": 1,
  "name": "Sample Keyboard",
  "stockQuantity": 8,
  "lowStockThreshold": 10,
  "stockStatus": "low_stock"
}
```

---

# ■ 在庫別の購入可否

## active + in_stock

```txt
表示:
  ○

購入:
  ○
```

---

## active + low_stock

```txt
表示:
  ○

購入:
  ○
```

---

## active + out_of_stock

```txt
表示:
  ○

購入:
  ×
```

---

## stopped

```txt
表示:
  ×

購入:
  ×
```

---

# ■ 発売日

## released_at

- nullable許可
- 商品の発売日として扱う
- ユーザー向けの新着順に利用する

---

## created_at との違い

### created_at

- システムへ登録された日時
- 管理用途
- DB内部管理用

### released_at

- 商品の発売日
- ユーザー向け新着基準
- 商品表示用

---

# ■ 並び替え

## Phase1対応

- 新着順
- 価格が安い順
- 価格が高い順

---

## 新着順

新着順は `released_at` を利用する。

```txt
ORDER BY released_at DESC NULLS LAST
```

`released_at` がない商品は最後尾にする。

---

## 価格順

価格順は税込価格ではなく、税抜価格ベースで並び替える。

```txt
ORDER BY price_excluding_tax ASC
ORDER BY price_excluding_tax DESC
```

税率差がある場合の厳密な税込価格順は将来検討とする。

---

# ■ 検索・絞り込み

## 基本方針

商品検索では、複数条件を同時に指定できる。

複数条件はAND条件として扱う。

---

## 指定可能な条件

- キーワード
- カテゴリ
- 最低価格
- 最高価格
- 在庫ありのみ
- 並び替え
- ページネーション

---

## キーワード検索対象

- 商品名
- メーカー名
- 型番

---

## 在庫条件

在庫0の商品は通常表示対象に含める。

ただし、`inStockOnly=true` が指定された場合は、
在庫数が1以上の商品だけを表示する。

```txt
inStockOnly=false または未指定
  → 在庫0も表示する

inStockOnly=true
  → stock_quantity > 0 の商品のみ表示する
```

---

## 販売停止商品の扱い

一般ユーザー向け商品検索では、
販売停止商品は常に除外する。

```txt
status = active の商品のみ検索対象
```

---

## APIクエリ例

```txt
GET /api/products?keyword=logicool&category=keyboard&minPrice=5000&maxPrice=15000&inStockOnly=true&sort=price_asc&page=1&limit=20
```

---

# ■ ページネーション

商品一覧はページネーションする。

```txt
page=1
limit=20
```

---

# ■ slug

Phase1では slug は持たない。

商品詳細URLは id ベースとする。

```txt
/products/:id
```

### 理由

- slugの重複管理が必要になる
- 商品名変更時の扱いが面倒
- 日本語商品名との相性も考慮が必要
- Phase1では id 指定で十分

---

# ■ レビュー集計

Phase1では、平均評価・レビュー件数は reviews から都度集計する。

```txt
AVG(rating)
COUNT(*)
```

### 理由

- products に集計値を持つと更新整合性が必要になる
- レビュー投稿・編集・削除時の同期処理が増える
- Phase1の規模では都度集計で十分
- 正しさを優先できる

---

# ■ 商品スペック

Phase1では商品種別ごとの詳細スペックは実装しない。

例:

- キーボード配列
- マウスDPI
- モニター解像度
- リフレッシュレート

---

## 理由

- ECの基本導線を優先したい
- 商品検索・カート・注文・在庫管理を先に固めたい
- スペック管理は設計複雑度が高い
- EAVやカテゴリ別属性設計が必要になり得る
- Phase1としては過剰実装になりやすい

---

## 将来的な方向性

将来的には以下を検討する。

- カテゴリごとのスペック定義
- 商品ごとのスペック値管理
- スペック検索
- 型ごとのvalidation

実装方式は、実際の要求規模を見て決定する。

候補:

- 共通カラム方式
- カテゴリ別スペックテーブル
- 属性定義 + 属性値方式

---

# ■ 管理者操作

管理者は以下を行える。

- 商品登録
- 商品編集
- 在庫更新
- 販売停止
- 販売再開

---

# ■ Product設計方針まとめ

- Productは販売対象の商品を表す
- 商品名は必須
- 商品説明はnullableなプレーンテキスト
- 商品画像はPhase1では1枚、nullable
- 画像未設定時はプレースホルダーを表示する
- 価格は税抜で保持する
- 税率は税率マスタを参照する
- 表示価格は税込で返す
- 注文時に価格・税率をスナップショット保存する
- 商品は1カテゴリに所属する
- カテゴリ複数指定は将来対応
- maker_name / model_number は任意
- model_number は重複許可
- 商品状態は active / stopped の2状態
- 商品削除APIは作らない
- stopped を非公開・削除相当として扱う
- 在庫数は一般ユーザーに直接表示しない
- stock_status として在庫状態を返す
- low_stock_threshold は商品ごとに持つ
- 新着順は released_at を使う
- slug は持たない
- レビュー集計は都度計算
- 商品スペックはPhase1では未実装