# Reviewドメイン 振る舞い整理

# ■ Reviewの役割

Reviewは、購入済みユーザーによる商品評価・感想を表す。

商品の満足度共有、
購入検討ユーザーへの参考情報提供を目的とする。

---

# ■ 基本方針

- レビューは購入者限定
- 1ユーザー1商品1レビュー
- rating は必須
- title / comment は nullable
- コメントを書く場合はタイトル必須
- レビュー公開状態は status で管理
- 平均評価・レビュー件数は都度集計

---

# ■ reviews

## reviews

```txt
reviews
- id
- user_id
- product_id
- rating
- title nullable
- comment nullable
- status
- created_at
- updated_at
```

---

# ■ 一意性

```txt
unique(user_id, product_id)
```

---

## 理由

- 同一商品の複数レビューを防ぐ
- レビュー評価水増しを防ぐ
- 下書き・非表示レビュー含め1レビューに制限する

---

# ■ 投稿条件

## レビュー投稿可能条件

以下を満たす場合のみ投稿可能。

```txt
- ログイン中
- 対象商品を注文済み
- order_status = ordered
```

---

## 導線

レビュー投稿は商品詳細から直接ではなく、
注文履歴・注文詳細から行う。

```txt
注文履歴
  ↓
注文詳細
  ↓
レビューを書く
```

---

## API側検証

画面導線だけでは不十分なため、
API側でも以下を確認する。

```txt
- user_id一致注文存在
- order_status = ordered
- order_items に product_id が含まれる
- 未レビュー
```

---

# ■ rating

## 方針

- 必須
- 1〜5 の整数
- 小数不可

---

## 表示例

```txt
★1
★2
★3
★4
★5
```

---

# ■ title

## 方針

- nullable許可
- trimする
- 最大文字数制限あり

---

## 用途

- レビュー見出し
- 一覧表示簡略化
- レビュー要約

---

# ■ comment

## 方針

- nullable許可
- プレーンテキストのみ
- HTML不可
- Markdown不可

---

## 理由

- XSS対策簡略化
- UI崩れ防止
- Phase1として十分

---

# ■ title / comment ルール

## 禁止パターン

```txt
title = null
comment != null
```

つまり:

```txt
コメントを書くならタイトル必須
```

---

## 許可パターン

### ratingのみ

```txt
rating: 5
title: null
comment: null
```

許可。

---

### titleのみ

```txt
rating: 5
title: "最高"
comment: null
```

許可。

---

### title + comment

```txt
rating: 5
title: "最高"
comment: "打鍵感が良い"
```

許可。

---

# ■ status

## Review公開状態

レビュー公開状態は status で管理する。

---

## status一覧

```txt
draft
published
hidden
```

---

# ■ draft

投稿者本人用の下書き状態。

---

## 振る舞い

- 一般ユーザー非表示
- 平均評価対象外
- 投稿者本人のみ閲覧可能
- 投稿者本人のみ編集可能

---

# ■ published

公開済みレビュー。

---

## 振る舞い

- 一般公開
- 平均評価対象
- 商品詳細へ表示

---

# ■ hidden

管理者による非表示レビュー。

---

## 振る舞い

- 一般ユーザー非表示
- 平均評価対象外
- 管理者のみ確認可能
- 投稿者編集不可

---

# ■ 編集

## 方針

レビュー編集は draft 状態のみ許可する。

---

## Phase1の編集フロー

```txt
draft
  ↓ 投稿者が編集
draft
  ↓ 投稿者が公開
published
```

Phase1では published を投稿者操作で draft に戻す仕様は含めない。
公開後の投稿者編集は不可とする。

---

## 編集可能項目

- rating
- title
- comment

---

## 理由

- 公開レビュー安定化
- レビュー履歴管理簡略化
- 改変しすぎ防止

---

# ■ 削除

## 方針

レビュー削除を行う場合は物理削除とする。

---

## 理由

- hidden で公開制御できる
- draft で下書き退避できる
- deleted_at を持つ必要性が薄い
- Phase1では監査ログを扱わない

---

## 削除時

- reviews レコード物理削除
- 平均評価対象外
- unique(user_id, product_id) 解放
- Phase1では投稿者本人のレビューなら status に関係なく削除可能

---

# ■ 平均評価・件数

## 方針

products に保持せず、
reviews から都度集計する。

---

## 集計対象

```txt
status = 'published'
```

のみ。

---

## 集計例

```sql
SELECT
  AVG(rating),
  COUNT(*)
FROM reviews
WHERE product_id = ?
  AND status = 'published'
```

---

## API返却例

```json
{
  "averageRating": 4.3,
  "reviewCount": 128
}
```

---

## 表示例

```txt
★4.3 (128件)
```

---

## 理由

- 集計同期処理不要
- レビュー状態変更との整合性維持容易
- Phase1規模では十分軽量

---

# ■ レビュー並び順

## Phase1

新しい順のみ。

```txt
ORDER BY created_at DESC
```

---

# ■ 評価フィルタ

## 将来的な追加候補

```txt
★4以上
★3以上
★1のみ
```

---

## APIイメージ

```txt
GET /products/:id/reviews?minRating=4
```

---

# ■ 購入済み商品の複数注文

同じ商品を複数回購入しても、
レビューは1商品1レビュー。

---

# ■ 注文キャンセル後

## 投稿前

```txt
order_status = canceled
```

の場合はレビュー投稿不可。

---

## 投稿後

Phase1ではレビューを残す。

---

# ■ 退会済みユーザー

レビュー自体は保持する。

---

## 表示名

```txt
退会済みユーザー
```

表示で十分。

---

# ■ 販売停止商品

販売停止商品は一般ユーザー向け商品詳細を表示しないため、
レビューも通常は表示されない。

管理者画面では確認可能。

---

# ■ Review設計方針まとめ

- レビューは購入者限定
- 導線は注文履歴・注文詳細から
- API側でも購入履歴検証
- 1ユーザー1商品1レビュー
- rating は1〜5必須
- title / comment は nullable
- コメントを書く場合はタイトル必須
- レビュー公開状態は status 管理
- status は draft / published / hidden
- 編集は draft 状態のみ
- hidden は管理者制御用
- 削除は物理削除
- 平均評価・件数は都度集計
- 集計対象は published のみ
- レビュー並び順は新しい順
- 将来的に評価フィルタ追加可能
- products に平均値は保持しない
