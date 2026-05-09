# 07_CODEX_STAGE_PROMPTS.md

## Stage 0 プロンプト：プロジェクト確認

```md
このリポジトリで、競馬配合WebゲームMVPを実装します。

まずコードは変更せず、プロジェクト構成を確認してください。

確認するもの：

- package.json
- src構成
- 起動方法
- テスト方法
- 使用技術
- 仕様Markdown一式

出力するもの：

- 技術スタック
- 既存構成
- 実装方針
- 変更予定ファイル
- 不明点
```

## Stage 1 プロンプト：型と定数

```md
MVPの土台として、競馬配合ゲームの型定義と定数を実装してください。

参照：

- 01_CURRENT_GAME_SPEC.md
- 03_DATA_MODEL.md
- 04_BREEDING_LOGIC.md

実装：

- Rank、Surface、Sex、BloodRegion
- AbilityScores、AbilityRanks
- Stallion、Broodmare、ProducedHorse
- PedigreeNode、FiveGenerationPedigree
- BreedingEvaluation、InbreedingReport
- SaveData
- SEED_PATTERN_COUNT = 8192
- ランク変換関数

完了後、変更ファイルと確認方法を報告してください。
```

## Stage 2 プロンプト：初期馬データ

```md
初期種牡馬24頭と繁殖牝馬48頭のデータを実装してください。

参照：

- 02_INITIAL_HORSES.md
- 03_DATA_MODEL.md

実装：

- defaultStallions 24頭
- defaultBroodmares 48頭
- 各馬のid
- 種牡馬パラメータ
- 繁殖牝馬パラメータ
- 5代血統表の枠

注意：

- 初期種牡馬に含めない馬を入れない
- 海外繁殖牝馬は2010年以降生まれ中心にする
- まず動くデータを作る
- おかしい値は後で調整できるようにする

完了後、ランク設定の考え方を報告してください。
```

## Stage 3 プロンプト：配合評価ロジック

```md
配合評価ロジックを実装してください。

参照：

- 04_BREEDING_LOGIC.md

実装：

- 5代血統表からインブリードを検出
- クロス位置と血量を計算
- 3x4 = 18.75
- 18.75%超の警告
- アウトブリード判定
- 父系サイアーライン多様性
- メアーライン多様性
- normal / good / very_good 判定

完了後、代表ケースの確認結果を報告してください。
```

## Stage 4 プロンプト：産駒能力生成

```md
産駒能力生成ロジックを実装してください。

参照：

- 01_CURRENT_GAME_SPEC.md
- 03_DATA_MODEL.md
- 04_BREEDING_LOGIC.md

実装：

- seedIndex 0〜8191
- 同じ父、母、seedなら同じ能力になる決定的生成
- 安定A〜Dによるばらつき制御
- goodなら各能力最低16
- very_goodなら各能力最低32
- normalなら最低保証なし
- 体質は基本ランダム
- アウトブリードなら体質C以上保証
- インブリード体質デバフ
- 18.75%超の強め体質デバフ
- 恐怖心の血統傾向補正

完了後、seed再現性と最低保証の確認結果を報告してください。
```

## Stage 5 プロンプト：保存・JSON入出力

```md
保存機能を実装してください。

参照：

- 05_UI_AND_STORAGE.md

実装：

- localStorage保存
- localStorage読み込み
- JSON出力
- JSON読み込み
- セーブデータversion
- 不正JSON拒否
- version違い警告
- isDirty管理
- beforeunloadによる保存忘れ確認

完了後、保存仕様と確認方法を報告してください。
```

## Stage 6 プロンプト：MVP UI

```md
MVP画面を実装してください。

参照：

- 05_UI_AND_STORAGE.md

実装：

- トップ画面
- 種牡馬一覧
- 繁殖牝馬一覧
- 配合画面
- 5代血統表表示
- 配合評価表示
- 生産結果画面
- 自家生産馬管理画面

注意：

- 能力値は通常表示しない
- 自家生産種牡馬は最大3頭
- 自家生産繁殖牝馬は最大5頭

完了後、画面ごとの実装内容と操作手順を報告してください。
```

## Stage 7 プロンプト：確認・修正

```md
MVP実装を確認し、仕様とのズレを修正してください。

参照：

- 01_CURRENT_GAME_SPEC.md
- 02_INITIAL_HORSES.md
- 04_BREEDING_LOGIC.md
- 05_UI_AND_STORAGE.md
- 08_TEST_CHECKLIST.md

確認：

- 初期馬データ
- 除外馬が混ざっていないこと
- good / very_good の最低保証
- 5代血統表固定
- インブリード判定
- 18.75%超の扱い
- 8192 seed
- localStorage
- JSON入出力
- beforeunload確認

完了後、修正点、残課題、確認結果を報告してください。
```
