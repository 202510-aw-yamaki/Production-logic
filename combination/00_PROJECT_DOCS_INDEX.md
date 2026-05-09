# 00_PROJECT_DOCS_INDEX.md

## 目的

このファイルは、競馬配合WebゲームMVPの仕様Markdown一覧です。

## ドキュメント一覧

| 順番 | ファイル名 | 内容 |
|---:|---|---|
| 1 | `01_CURRENT_GAME_SPEC.md` | MVP全体仕様、能力、ランク、繁殖枠 |
| 2 | `02_INITIAL_HORSES.md` | 初期種牡馬24頭、初期繁殖牝馬48頭 |
| 3 | `03_DATA_MODEL.md` | TypeScript想定のデータ構造 |
| 4 | `04_BREEDING_LOGIC.md` | 配合評価、インブリード、seed、能力生成 |
| 5 | `05_UI_AND_STORAGE.md` | MVP画面、localStorage、JSON保存 |
| 6 | `06_IMPLEMENTATION_STAGES.md` | 実装順序 |
| 7 | `07_CODEX_STAGE_PROMPTS.md` | 段階別の作業指示プロンプト |
| 8 | `08_TEST_CHECKLIST.md` | 動作確認項目 |
| 9 | `09_FUTURE_PHASES.md` | MVP外の後続機能 |

## 優先順位

仕様が重複する場合は、番号が若いファイルを優先する。

## MVP範囲

今回のMVPは、配合、生産、内部能力生成、自家生産馬管理、保存までを対象とする。
調教、レース、友人対戦、出馬表の印は後続フェーズとする。
