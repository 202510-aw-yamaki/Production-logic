# 06_IMPLEMENTATION_STAGES.md

## Stage 0: 既存プロジェクト確認

- package.json確認
- src構成確認
- 起動方法確認
- テスト方法確認
- 変更予定ファイルの整理

## Stage 1: データ型と定数

- 型定義
- ランク変換関数
- seed定数
- 保存データ型

## Stage 2: 初期馬データ

- 種牡馬24頭
- 繁殖牝馬48頭
- 各馬のid
- 種牡馬パラメータ
- 繁殖牝馬パラメータ
- 5代血統表の枠

## Stage 3: 配合評価ロジック

- 5代血統表処理
- インブリード検出
- 血量計算
- アウトブリード判定
- good / very_good 判定

## Stage 4: 産駒能力生成

- seedIndex 0〜8191
- 安定による分布調整
- good / very_good の最低保証
- 体質デバフ
- 恐怖心補正

## Stage 5: 保存ロジック

- localStorage保存
- localStorage読み込み
- JSON出力
- JSON読み込み
- beforeunload対応

## Stage 6: UI実装

- トップ画面
- 種牡馬一覧
- 繁殖牝馬一覧
- 配合画面
- 血統表
- 生産結果
- 自家生産馬管理

## Stage 7: 動作確認

- データ確認
- 配合評価確認
- seed再現性確認
- 保存確認
- JSON入出力確認
