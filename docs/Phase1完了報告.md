# Phase1完了報告

作成日: 2026-06-13

## 概要

Phase1で実装した一般ユーザー向け導線と管理者向け導線について、テスト、E2E、Docker起動、主要ドキュメントの整合を確認した。

新規機能追加は行わず、確認中に見つかった軽微な資料不足と検証スクリプトの不整合のみ修正した。

## 確認結果

- Backend全テスト: `go test ./...` 通過
- Backend静的確認: `go vet ./...` 通過
- Frontend build: `npm run build` 通過
- Frontend lint: `npm run lint` 通過
- Frontend依存関係: `npm audit --audit-level=moderate` で脆弱性なし
- Docker起動: `docker compose up --build -d` 通過
- Seed投入: `docker compose exec backend go run ./cmd/seed` 通過
- Backend health check: `GET http://localhost:8080/api/health` で `status: ok`
- Frontend疎通: `GET http://localhost:3000` で HTTP 200
- E2E全件: `npx playwright test --workers=1` で 375件通過

補足:

- `npm run test:e2e` のデフォルト並列実行では desktop の一部ケースが一時的に失敗した。
- 失敗した5件は個別再実行で通過し、直列全件実行でも通過したため、実装の固定不具合ではなく並列実行時のテスト干渉またはタイミング要因と判断した。

## 修正内容

- READMEに管理者注文画面、管理者注文BFF、Phase1対象外を追記した。
- `frontend/package.json` の `lint` script を Next.js 16 で動作しない `next lint` から、既存依存で実行可能な TypeScript 静的検査へ変更した。
- `tsc --noEmit` が生成する `*.tsbuildinfo` を Git 管理対象外にした。

## Phase1対象外

以下はPhase1完了条件に含めない。

- 実決済
- 返金処理
- 配送管理
- メール送信
- クーポン
- レコメンド
- 商品画像アップロード
- 複雑な在庫同期
- 管理者操作ログ
- キャンセル理由
- ユーザー管理画面
- marketplace / seller機能
- マスタ管理UI

## Issue整理

open Issue として `#79` と `#80` を確認した。

- `#79` は本確認作業の対象Issue。
- `#80` は「管理者向けOrder APIを実装する」Issueだが、現在の実装・API資料・OpenAPI・E2Eでは管理者注文APIと画面が存在するため、実装済みとしてclose候補。

GitHub Issue の close はリモート状態を変更するため、この作業では実行していない。

## 未実施または制限付き確認

- ブラウザを用いた人手のコンソール確認、ちらつき確認、長い文字列での目視確認は未実施。
- E2Eにより主要導線、認証・認可、returnTo、refresh retry、在庫減算、管理者キャンセル時の在庫復元、empty / error / Not Found 状態は確認済み。

## 次フェーズ引継ぎメモ

- Phase1は主要導線と管理者機能まで一通り成立している。
- 次フェーズでは、まず open Issue `#80` の扱いを整理する。
- `npm run test:e2e` のデフォルト並列実行で一部フレークが出るため、CIで安定性を優先する場合は `--workers=1` またはテストデータ分離を検討する。
- Phase2候補は、デプロイ準備、Phase1対象外機能の優先順位付け、または別プロジェクト移行判断とする。
