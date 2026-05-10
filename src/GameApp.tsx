import { useEffect, useMemo, useState } from "react";
import {
  ABILITY_KEYS,
  BREEDING_GRADE_LABELS,
  INBREEDING_WARNING_THRESHOLD,
  MAX_HOMEBRED_BROODMARES,
  MAX_HOMEBRED_STALLIONS,
  SEED_PATTERN_COUNT,
  SEX_LABELS,
  SURFACE_LABELS,
} from "./domain/constants.ts";
import {
  buildFoalPedigree,
  evaluateBreeding,
  generateProducedHorse,
  rerollProducedHorseSeed,
} from "./domain/breeding.ts";
import { getSireLineTendency } from "./domain/bloodlineTraits.ts";
import { producedHorseToBroodmare, producedHorseToStallion } from "./domain/homebred.ts";
import { normalizeFamilyNumber } from "./domain/pedigree.ts";
import {
  createInitialSaveData,
  loadFromLocalStorage,
  parseSaveDataJson,
  saveToLocalStorage,
} from "./domain/storage.ts";
import type {
  AbilityDeltaMap,
  AbilityInfluence,
  AbilityScores,
  BreedingEvaluation,
  Broodmare,
  FactorEffectReport,
  FiveGenerationPedigree,
  InbreedingFactor,
  MyostatinProfile,
  ProducedHorse,
  SaveData,
  Stallion,
} from "./domain/types.ts";

type View = "top" | "stallions" | "broodmares" | "breeding" | "result" | "homebreds";
type Message = { tone: "info" | "warning" | "error"; text: string } | null;

const abilityLabels: Record<keyof AbilityScores, string> = {
  speed: "スピード",
  stamina: "スタミナ",
  power: "パワー",
  guts: "根性",
  acceleration: "瞬発",
  sustain: "持続力",
  temperament: "気性",
  fear: "恐怖心",
  constitution: "体質",
  health: "健康",
};

const factorLabels: Record<InbreedingFactor, string> = {
  speed: "スピード",
  stamina: "スタミナ",
  power: "パワー",
  guts: "根性",
  acceleration: "瞬発",
  sustain: "持続力",
  fear: "恐怖心",
};

const factorChipLabels: Record<InbreedingFactor, string> = {
  ...factorLabels,
  speed: "SP",
  stamina: "ST",
};

const sireLineLabels: Record<string, string> = {
  "All American": "オールアメリカン",
  Bernstein: "バーンスタイン",
  "Big Brown": "ビッグブラウン",
  Blame: "ブレイム",
  "Cape Cross": "ケープクロス",
  Churchill: "チャーチル",
  "Colonel John": "カーネルジョン",
  Congrats: "コングラッツ",
  Curlin: "カーリン",
  "Daiwa Major": "ダイワメジャー",
  "Danehill Dancer": "デインヒルダンサー",
  "Deep Impact": "ディープインパクト",
  "Deputy Minister": "デピュティミニスター",
  "Divine Park": "ディヴァインパーク",
  "Dubai Millennium": "ドバイミレニアム",
  Durandal: "デュランダル",
  Fappiano: "ファピアノ",
  Flightline: "フライトライン",
  Frankel: "フランケル",
  Galileo: "ガリレオ",
  "Gold Allure": "ゴールドアリュール",
  "Gun Runner": "ガンランナー",
  "Hail to Reason": "ヘイルトゥリーズン",
  Halo: "ヘイロー",
  Harbinger: "ハービンジャー",
  "Heart's Cry": "ハーツクライ",
  "Henny Hughes": "ヘニーヒューズ",
  "Holy Roman Emperor": "ホーリーローマンエンペラー",
  Iffraaj: "イフラージ",
  "Into Mischief": "イントゥミスチーフ",
  Jeremy: "ジェレミー",
  "King Halo": "キングヘイロー",
  "King Kamehameha": "キングカメハメハ",
  Kingmambo: "キングマンボ",
  Kurofune: "クロフネ",
  "Malibu Moon": "マリブムーン",
  "Manhattan Cafe": "マンハッタンカフェ",
  "Medaglia d'Oro": "メダグリアドーロ",
  "Mill Reef": "ミルリーフ",
  Montjeu: "モンジュー",
  Motivator: "モティヴェイター",
  "Mr. Prospector": "ミスタープロスペクター",
  Nasrullah: "ナスルーラ",
  "Native Dancer": "ネイティヴダンサー",
  "Neo Universe": "ネオユニヴァース",
  Nijinsky: "ニジンスキー",
  "Northern Dancer": "ノーザンダンサー",
  Orfevre: "オルフェーヴル",
  "Per Incanto": "ペルインカント",
  Relaunch: "リローンチ",
  Roberto: "ロベルト",
  Rulership: "ルーラーシップ",
  "Sadler's Wells": "サドラーズウェルズ",
  "Sea The Stars": "シーザスターズ",
  "Seattle Slew": "シアトルスルー",
  Shamardal: "シャマーダル",
  Siyouni: "シユーニ",
  "Smart Strike": "スマートストライク",
  "Stay Gold": "ステイゴールド",
  "Stay Thirsty": "ステイサースティ",
  "Storm Cat": "ストームキャット",
  "Street Cry": "ストリートクライ",
  "Sunday Silence": "サンデーサイレンス",
  "Symboli Kris S": "シンボリクリスエス",
  Tapit: "タピット",
  Tavistock: "タヴィストック",
  "Tiz the Law": "ティズザロー",
  Tizway: "ティズウェイ",
  "Uncle Mo": "アンクルモー",
  Wilburn: "ウィルバーン",
  "Wootton Bassett": "ウートンバセット",
  Zoffany: "ゾファニー",
};

const viewLabels: Record<View, string> = {
  top: "トップ",
  stallions: "種牡馬",
  broodmares: "繁殖牝馬",
  breeding: "配合",
  result: "生産結果",
  homebreds: "自家生産",
};

export default function GameApp() {
  const [saveData, setSaveData] = useState<SaveData>(() => createInitialSaveData());
  const [view, setView] = useState<View>("top");
  const [selectedSireId, setSelectedSireId] = useState("");
  const [selectedDamId, setSelectedDamId] = useState("");
  const [seedIndex, setSeedIndex] = useState(0);
  const [seedDrafts, setSeedDrafts] = useState<Record<string, string>>({});
  const [foalName, setFoalName] = useState("");
  const [lastProducedId, setLastProducedId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    try {
      const loaded = loadFromLocalStorage();
      if (!loaded) return;
      setSaveData(loaded.data);
      setMessage(
        loaded.warning
          ? { tone: "warning", text: loaded.warning }
          : { tone: "info", text: "localStorageから復元しました。" },
      );
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "localStorageの読み込みに失敗しました。",
      });
    }
  }, []);

  const producedById = useMemo(
    () => new Map(saveData.producedHorses.map((horse) => [horse.id, horse])),
    [saveData.producedHorses],
  );

  const homebredStallions = useMemo(
    () =>
      saveData.homebredStallionIds
        .map((id) => producedById.get(id))
        .filter((horse): horse is ProducedHorse => Boolean(horse))
        .map(producedHorseToStallion),
    [producedById, saveData.homebredStallionIds],
  );

  const homebredBroodmares = useMemo(
    () =>
      saveData.homebredBroodmareIds
        .map((id) => producedById.get(id))
        .filter((horse): horse is ProducedHorse => Boolean(horse))
        .map(producedHorseToBroodmare),
    [producedById, saveData.homebredBroodmareIds],
  );

  const availableStallions = useMemo(
    () => [...saveData.defaultStallions, ...homebredStallions],
    [homebredStallions, saveData.defaultStallions],
  );

  const availableBroodmares = useMemo(
    () => [...saveData.defaultBroodmares, ...homebredBroodmares],
    [homebredBroodmares, saveData.defaultBroodmares],
  );

  const selectedSire = availableStallions.find((horse) => horse.id === selectedSireId) ?? availableStallions[0];
  const selectedDam = availableBroodmares.find((horse) => horse.id === selectedDamId) ?? availableBroodmares[0];
  const currentEvaluation = selectedSire && selectedDam ? evaluateBreeding(selectedSire, selectedDam) : null;
  const currentPedigree =
    selectedSire && selectedDam ? buildFoalPedigree(selectedSire, selectedDam, "preview") : null;
  const lastProduced = lastProducedId ? producedById.get(lastProducedId) ?? null : null;

  useEffect(() => {
    if (!selectedSireId && availableStallions[0]) {
      setSelectedSireId(availableStallions[0].id);
    }
    if (!selectedDamId && availableBroodmares[0]) {
      setSelectedDamId(availableBroodmares[0].id);
    }
  }, [availableBroodmares, availableStallions, selectedDamId, selectedSireId]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function updateSaveData(updater: (data: SaveData) => SaveData) {
    setSaveData((current) => updater(current));
    setIsDirty(true);
  }

  function handleSaveLocal() {
    const saved = saveToLocalStorage(saveData);
    setSaveData(saved);
    setIsDirty(false);
    setMessage({ tone: "info", text: "localStorageに保存しました。" });
  }

  function handleExportJson() {
    const exported = {
      ...saveData,
      savedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `horse-breeding-save-${formatFileDate(new Date())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setSaveData(exported);
    setIsDirty(false);
    setMessage({ tone: "info", text: "JSONを出力しました。" });
  }

  async function handleImportJson(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = parseSaveDataJson(await file.text());
      setSaveData(parsed.data);
      setIsDirty(true);
      setLastProducedId(null);
      setSeedDrafts({});
      setMessage({
        tone: parsed.warning ? "warning" : "info",
        text: parsed.warning ?? "JSONを読み込みました。",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "JSONを読み込めませんでした。",
      });
    }
  }

  function handleProduce() {
    if (!selectedSire || !selectedDam) return;
    const normalizedSeed = Math.max(0, Math.min(SEED_PATTERN_COUNT - 1, Math.trunc(seedIndex)));
    const birthIndex =
      saveData.producedHorses.reduce((max, horse) => Math.max(max, horse.birthIndex), 0) + 1;
    const produced = generateProducedHorse({
      sire: selectedSire,
      dam: selectedDam,
      seedIndex: normalizedSeed,
      birthIndex,
      name: foalName,
    });

    updateSaveData((current) => ({
      ...current,
      producedHorses: [...current.producedHorses, produced],
    }));
    setSeedIndex((normalizedSeed + 1) % SEED_PATTERN_COUNT);
    setFoalName("");
    setLastProducedId(produced.id);
    setView("result");
    setMessage({ tone: "info", text: `${produced.name}を生産しました。` });
  }

  function handleRetire(horse: ProducedHorse, retiredAs: "stallion" | "broodmare") {
    const alreadyStallion = saveData.homebredStallionIds.includes(horse.id);
    const alreadyBroodmare = saveData.homebredBroodmareIds.includes(horse.id);
    if (
      retiredAs === "stallion" &&
      !alreadyStallion &&
      saveData.homebredStallionIds.length >= MAX_HOMEBRED_STALLIONS
    ) {
      setMessage({ tone: "warning", text: "自家生産種牡馬の枠が上限です。" });
      return;
    }
    if (
      retiredAs === "broodmare" &&
      !alreadyBroodmare &&
      saveData.homebredBroodmareIds.length >= MAX_HOMEBRED_BROODMARES
    ) {
      setMessage({ tone: "warning", text: "自家生産繁殖牝馬の枠が上限です。" });
      return;
    }

    updateSaveData((current) => ({
      ...current,
      producedHorses: current.producedHorses.map((item) =>
        item.id === horse.id ? { ...item, retiredAs } : item,
      ),
      homebredStallionIds:
        retiredAs === "stallion"
          ? unique([...current.homebredStallionIds, horse.id])
          : current.homebredStallionIds.filter((id) => id !== horse.id),
      homebredBroodmareIds:
        retiredAs === "broodmare"
          ? unique([...current.homebredBroodmareIds, horse.id])
          : current.homebredBroodmareIds.filter((id) => id !== horse.id),
    }));
    setMessage({
      tone: "info",
      text: retiredAs === "stallion" ? "自家生産種牡馬に登録しました。" : "自家生産繁殖牝馬に登録しました。",
    });
  }

  function handleProducedSeedChange(horse: ProducedHorse, value: string) {
    setSeedDrafts((current) => ({ ...current, [horse.id]: value }));
    const nextSeed = parseSeedIndex(value);
    if (nextSeed === null) {
      return;
    }

    const sire = availableStallions.find((item) => item.id === horse.sireId);
    const dam = availableBroodmares.find((item) => item.id === horse.damId);
    if (!sire || !dam) {
      setMessage({ tone: "error", text: "親馬が見つからないためseedを変更できません。" });
      return;
    }

    const rerolled = rerollProducedHorseSeed({ horse, sire, dam, seedIndex: nextSeed });
    updateSaveData((current) => ({
      ...current,
      producedHorses: current.producedHorses.map((item) =>
        item.id === horse.id ? rerolled : item,
      ),
      homebredStallionIds: updateHomebredIdsAfterReroll(
        current.homebredStallionIds,
        horse.id,
        rerolled,
        "stallion",
      ),
      homebredBroodmareIds: updateHomebredIdsAfterReroll(
        current.homebredBroodmareIds,
        horse.id,
        rerolled,
        "broodmare",
      ),
    }));
    if (lastProducedId === horse.id) setLastProducedId(rerolled.id);
    setMessage(null);
    setSeedDrafts((current) => {
      const next = { ...current };
      delete next[horse.id];
      delete next[rerolled.id];
      return next;
    });
  }

  function handleDeleteProduced(id: string) {
    updateSaveData((current) => ({
      ...current,
      producedHorses: current.producedHorses.filter((horse) => horse.id !== id),
      homebredStallionIds: current.homebredStallionIds.filter((horseId) => horseId !== id),
      homebredBroodmareIds: current.homebredBroodmareIds.filter((horseId) => horseId !== id),
    }));
    if (lastProducedId === id) setLastProducedId(null);
    setSeedDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setMessage({ tone: "info", text: "生産馬を削除しました。" });
  }

  function findHorseName(id: string): string {
    return (
      availableStallions.find((horse) => horse.id === id)?.name ??
      availableBroodmares.find((horse) => horse.id === id)?.name ??
      id
    );
  }

  return (
    <div className="game-root">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Production Logic</p>
          <h1>配合ロジック</h1>
        </div>
        <nav className="primary-nav" aria-label="画面切り替え">
          {(Object.keys(viewLabels) as View[]).map((key) => (
            <button
              key={key}
              className={view === key ? "nav-button active" : "nav-button"}
              type="button"
              onClick={() => setView(key)}
            >
              {viewLabels[key]}
            </button>
          ))}
        </nav>
      </header>

      <section className="status-strip">
        <div>
          <span>生産馬</span>
          <strong>{saveData.producedHorses.length}</strong>
        </div>
        <div>
          <span>種牡馬枠</span>
          <strong>
            {saveData.homebredStallionIds.length}/{MAX_HOMEBRED_STALLIONS}
          </strong>
        </div>
        <div>
          <span>繁殖牝馬枠</span>
          <strong>
            {saveData.homebredBroodmareIds.length}/{MAX_HOMEBRED_BROODMARES}
          </strong>
        </div>
        <div>
          <span>保存状態</span>
          <strong>{isDirty ? "未保存" : "保存済み"}</strong>
        </div>
      </section>

      <section className="command-band" aria-label="保存操作">
        <button type="button" onClick={handleSaveLocal}>
          localStorage保存
        </button>
        <button type="button" onClick={handleExportJson}>
          JSON出力
        </button>
        <label className="file-button">
          JSON読み込み
          <input
            accept="application/json"
            type="file"
            onChange={(event) => void handleImportJson(event.target.files?.[0])}
          />
        </label>
        <label className="toggle-control">
          <input checked={showDebug} type="checkbox" onChange={(event) => setShowDebug(event.target.checked)} />
          debug
        </label>
      </section>

      {message && <p className={`message ${message.tone}`}>{message.text}</p>}

      {view === "top" && (
        <main className="content-band intro-layout">
          <section>
            <h2>配合から生産へ</h2>
            <div className="action-row">
              <button type="button" onClick={() => setView("breeding")}>
                配合を始める
              </button>
              <button type="button" onClick={() => setView("homebreds")}>
                自家生産馬を見る
              </button>
            </div>
          </section>
          <SummaryPanel
            broodmareCount={availableBroodmares.length}
            producedCount={saveData.producedHorses.length}
            stallionCount={availableStallions.length}
          />
        </main>
      )}

      {view === "stallions" && (
        <main className="content-band">
          <h2>種牡馬一覧</h2>
          <StallionTable stallions={availableStallions} />
        </main>
      )}

      {view === "broodmares" && (
        <main className="content-band">
          <h2>繁殖牝馬一覧</h2>
          <BroodmareTable broodmares={availableBroodmares} />
        </main>
      )}

      {view === "breeding" && currentEvaluation && currentPedigree && (
        <main className="content-band breeding-layout">
          <section className="control-panel">
            <h2>配合画面</h2>
            <label>
              種牡馬
              <select value={selectedSire.id} onChange={(event) => setSelectedSireId(event.target.value)}>
                {availableStallions.map((horse) => (
                  <option key={horse.id} value={horse.id}>
                    {horse.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              繁殖牝馬
              <select value={selectedDam.id} onChange={(event) => setSelectedDamId(event.target.value)}>
                {availableBroodmares.map((horse) => (
                  <option key={horse.id} value={horse.id}>
                    {horse.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              生産馬名
              <input value={foalName} onChange={(event) => setFoalName(event.target.value)} />
            </label>
            <label>
              seedIndex
              <input
                max={SEED_PATTERN_COUNT - 1}
                min={0}
                type="number"
                value={seedIndex}
                onChange={(event) => setSeedIndex(Number(event.target.value))}
              />
            </label>
            <button type="button" onClick={handleProduce}>
              生産する
            </button>
          </section>
          <section className="evaluation-panel">
            <EvaluationView evaluation={currentEvaluation} />
          </section>
          <PedigreeTable pedigree={currentPedigree} />
        </main>
      )}

      {view === "result" && (
        <main className="content-band">
          {lastProduced ? (
            <ProducedResult
              evaluation={lastProduced.breedingEvaluation}
              findHorseName={findHorseName}
              horse={lastProduced}
              onSeedChange={(value) => handleProducedSeedChange(lastProduced, value)}
              seedValue={seedDrafts[lastProduced.id] ?? String(lastProduced.seedIndex)}
              showDebug={showDebug}
            />
          ) : (
            <EmptyState text="まだ生産結果がありません。" />
          )}
        </main>
      )}

      {view === "homebreds" && (
        <main className="content-band">
          <h2>自家生産馬管理</h2>
          {saveData.producedHorses.length === 0 ? (
            <EmptyState text="生産馬がいません。" />
          ) : (
            <div className="horse-list">
              {saveData.producedHorses.map((horse) => (
                <article className="horse-item" key={horse.id}>
                  <div className="horse-item-main">
                    <h3>{horse.name}</h3>
                    <p>
                      {SEX_LABELS[horse.sex]} / 父 {findHorseName(horse.sireId)} / 母 {findHorseName(horse.damId)}
                    </p>
                    <p>作成日時 {formatDate(horse.createdAt)}</p>
                    {horse.retiredAs && (
                      <p>{horse.retiredAs === "stallion" ? "自家生産種牡馬" : "自家生産繁殖牝馬"}</p>
                    )}
                    <AbilityRankStrip horse={horse} showDebug={showDebug} />
                    <SeedControl
                      onChange={(value) => handleProducedSeedChange(horse, value)}
                      value={seedDrafts[horse.id] ?? String(horse.seedIndex)}
                    />
                  </div>
                  <div className="item-actions">
                    {horse.sex === "male" && (
                      <button type="button" onClick={() => handleRetire(horse, "stallion")}>
                        繁殖入り
                      </button>
                    )}
                    {horse.sex === "female" && (
                      <button type="button" onClick={() => handleRetire(horse, "broodmare")}>
                        繁殖入り
                      </button>
                    )}
                    <button className="danger" type="button" onClick={() => handleDeleteProduced(horse.id)}>
                      削除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  );
}

function SummaryPanel({
  broodmareCount,
  producedCount,
  stallionCount,
}: {
  broodmareCount: number;
  producedCount: number;
  stallionCount: number;
}) {
  return (
    <section className="summary-panel">
      <div>
        <span>選択可能種牡馬</span>
        <strong>{stallionCount}</strong>
      </div>
      <div>
        <span>選択可能繁殖牝馬</span>
        <strong>{broodmareCount}</strong>
      </div>
      <div>
        <span>生産済み</span>
        <strong>{producedCount}</strong>
      </div>
    </section>
  );
}

function StallionTable({ stallions }: { stallions: Stallion[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>馬名</th>
            <th>距離適性</th>
            <th>馬場</th>
            <th>気性</th>
            <th>底力</th>
            <th>頑健</th>
            <th>実績</th>
            <th>安定</th>
            <th>父系ライン</th>
            <th>父系傾向</th>
            <th>MSTN</th>
          </tr>
        </thead>
        <tbody>
          {stallions.map((horse) => (
            <tr key={horse.id}>
              <td>{horse.name}</td>
              <td>
                {horse.distanceMin}-{horse.distanceMax}m
              </td>
              <td>{SURFACE_LABELS[horse.surface]}</td>
              <td>{horse.temperamentRank}</td>
              <td>{horse.bottomRank}</td>
              <td>{horse.robustnessRank}</td>
              <td>{horse.performanceRank}</td>
              <td>{horse.stabilityRank}</td>
              <td>{formatSireLineName(horse.sireLine)}</td>
              <td>{getSireLineTendency(horse.sireLine).label}</td>
              <td>{formatMyostatinProfile(horse.myostatin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BroodmareTable({ broodmares }: { broodmares: Broodmare[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>馬名</th>
            <th>スピード</th>
            <th>スタミナ</th>
            <th>馬場</th>
            <th>父系ライン</th>
            <th>ファミリーナンバー</th>
            <th>MSTN</th>
          </tr>
        </thead>
        <tbody>
          {broodmares.map((horse) => (
            <tr key={horse.id}>
              <td>{horse.name}</td>
              <td>{horse.speedRank}</td>
              <td>{horse.staminaRank}</td>
              <td>{SURFACE_LABELS[horse.surface]}</td>
              <td>{formatSireLineName(horse.sireLine)}</td>
              <td>{formatFamilyNumber(horse.familyNumber, horse.mareLine)}</td>
              <td>{formatMyostatinProfile(horse.myostatin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EvaluationView({ evaluation }: { evaluation: BreedingEvaluation }) {
  return (
    <div className="evaluation-box">
      <h2>{BREEDING_GRADE_LABELS[evaluation.grade]}</h2>
      <dl className="metric-grid">
        <div>
          <dt>5代前牡馬父系</dt>
          <dd>{evaluation.sireLineDiversityCount}</dd>
        </div>
        <div>
          <dt>4代前牝馬ファミリーナンバー</dt>
          <dd>{evaluation.mareLineDiversityCount}</dd>
        </div>
        <div>
          <dt>最大血量</dt>
          <dd>{evaluation.strongestInbreedingPercent}%</dd>
        </div>
        <div>
          <dt>アウトブリード</dt>
          <dd>{evaluation.hasOutcross ? "成立" : "不成立"}</dd>
        </div>
        <div>
          <dt>父系傾向</dt>
          <dd>{evaluation.sireLineTendency.label}</dd>
        </div>
        <div>
          <dt>体質デバフ</dt>
          <dd>{evaluation.constitutionPenalty}</dd>
        </div>
      </dl>
      {evaluation.strongestInbreedingPercent > INBREEDING_WARNING_THRESHOLD && (
        <p className="warning-text">18.75%超のクロスがあります。</p>
      )}
      {evaluation.inbreeding.length > 0 ? (
        <ul className="inbreeding-list">
          {evaluation.inbreeding.map((item) => (
            <li key={item.ancestorId}>
              {item.ancestorName}: {item.positions.join(" / ")} = {item.totalBloodPercent}%
            </li>
          ))}
        </ul>
      ) : (
        <p>クロスなし</p>
      )}
      <FactorEffectList effects={evaluation.factorEffects} title="インブリード因子効果" />
      <FactorEffectList effects={evaluation.outcrossFactorEffects} title="アウトブリード因子発現" />
    </div>
  );
}

function ProducedResult({
  evaluation,
  findHorseName,
  horse,
  onSeedChange,
  seedValue,
  showDebug,
}: {
  evaluation: BreedingEvaluation;
  findHorseName: (id: string) => string;
  horse: ProducedHorse;
  onSeedChange: (value: string) => void;
  seedValue: string;
  showDebug: boolean;
}) {
  return (
    <section>
      <h2>{horse.name}</h2>
      <div className="result-summary">
        <p>性別 {SEX_LABELS[horse.sex]}</p>
        <p>父 {findHorseName(horse.sireId)}</p>
        <p>母 {findHorseName(horse.damId)}</p>
        <p>配合評価 {BREEDING_GRADE_LABELS[evaluation.grade]}</p>
        <p>MSTN {formatMyostatinProfile(horse.myostatin)}</p>
        <p>父系傾向 {evaluation.sireLineTendency.label}</p>
        <p>{buildResultComment(evaluation)}</p>
      </div>
      <SeedControl onChange={onSeedChange} value={seedValue} />
      <section className="ability-panel">
        <h3>能力</h3>
        <AbilityRankStrip horse={horse} showDebug={showDebug} />
      </section>
      <PedigreeTable pedigree={horse.pedigree} />
      {showDebug && <AbilityDebug horse={horse} />}
      {showDebug && <AbilityInfluenceList influences={horse.abilityInfluences} />}
    </section>
  );
}

function SeedControl({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="seed-control">
      <label>
        seedIndex
        <input
          inputMode="numeric"
          max={SEED_PATTERN_COUNT - 1}
          min={0}
          step={1}
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}

function AbilityTable({ horse }: { horse: ProducedHorse }) {
  return (
    <section className="ability-panel">
      <h3>能力</h3>
      <div className="table-wrap ability-table">
        <table>
          <thead>
            <tr>
              <th>能力</th>
              <th>ランク</th>
            </tr>
          </thead>
          <tbody>
            {ABILITY_KEYS.map((key) => (
              <tr key={key}>
                <td>{abilityLabels[key]}</td>
                <td>{horse.ranks[key]}</td>
              </tr>
            ))}
            <tr>
              <td>馬場適性</td>
              <td>{SURFACE_LABELS[horse.surface]}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AbilityRankStrip({ horse, showDebug }: { horse: ProducedHorse; showDebug: boolean }) {
  return (
    <dl className="ability-strip">
      {ABILITY_KEYS.map((key) => (
        <div key={key}>
          <dt>{abilityLabels[key]}</dt>
          <dd>
            <strong>{showDebug ? horse.abilities[key] : horse.ranks[key]}</strong>
            {showDebug && <span>{horse.ranks[key]}</span>}
          </dd>
        </div>
      ))}
      <div>
        <dt>馬場適性</dt>
        <dd>
          <strong>{SURFACE_LABELS[horse.surface]}</strong>
        </dd>
      </div>
    </dl>
  );
}

function AbilityDebug({ horse }: { horse: ProducedHorse }) {
  return (
    <section className="debug-panel">
      <h3>debug能力</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>能力</th>
              <th>値</th>
              <th>ランク</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(abilityLabels) as (keyof AbilityScores)[]).map((key) => (
              <tr key={key}>
                <td>{abilityLabels[key]}</td>
                <td>{horse.abilities[key]}</td>
                <td>{horse.ranks[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AbilityInfluenceList({ influences }: { influences: AbilityInfluence[] }) {
  if (influences.length === 0) return null;
  return (
    <section className="debug-panel">
      <h3>debug ability influences</h3>
      <ul className="effect-list">
        {influences.map((influence, index) => (
          <li key={`${influence.source}-${index}`}>
            <strong>{influence.label}</strong>
            <span>{formatDeltas(influence.abilityDeltas)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FactorEffectList({
  effects,
  title,
}: {
  effects: FactorEffectReport[];
  title: string;
}) {
  if (effects.length === 0) return null;
  return (
    <section className="effect-panel">
      <h3>{title}</h3>
      <ul className="effect-list">
        {effects.map((effect, index) => (
          <li key={`${effect.source}-${effect.factor}-${index}`}>
            <strong>
              {factorLabels[effect.factor]} x{effect.multiplier}
            </strong>
            <span>
              {effect.ancestorName ? `${effect.ancestorName} / ` : ""}
              {effect.bloodPercent}% / {formatDeltas(effect.abilityDeltas)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PedigreeTable({ pedigree }: { pedigree: FiveGenerationPedigree }) {
  return (
    <section className="pedigree-section">
      <h3>5代血統表</h3>
      <div className="pedigree-scroll">
        <div className="pedigree-headings" aria-hidden="true">
          {pedigree.generations.map((_, index) => (
            <h4 key={`${pedigree.rootHorseId}-heading-${index}`}>{index + 1}代前</h4>
          ))}
        </div>
        <div className="pedigree-grid">
          {pedigree.generations.flatMap((generation, index) => {
            const rowSpan = 16 / 2 ** index;
            return generation.map((node, nodeIndex) => (
              <div
                className="pedigree-node"
                key={`${node.id}-${index}-${nodeIndex}`}
                style={{
                  gridColumn: index + 1,
                  gridRow: `${nodeIndex * rowSpan + 1} / span ${rowSpan}`,
                }}
              >
                <strong>{node.name}</strong>
                {node.sireLine !== node.name ? (
                  <span className="pedigree-line">{formatSireLineName(node.sireLine)}</span>
                ) : null}
                <FactorList factors={node.factors} />
              </div>
            ));
          })}
        </div>
      </div>
    </section>
  );
}

function FactorList({ factors }: { factors?: InbreedingFactor[] }) {
  if (!factors || factors.length === 0) {
    return <span className="factor-none">因子なし</span>;
  }

  return (
    <div className="factor-list" aria-label="因子">
      {factors.map((factor) => (
        <span className="factor-chip" data-factor={factor} key={factor}>
          {factorChipLabels[factor]}
        </span>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="empty-state">{text}</p>;
}

function buildResultComment(evaluation: BreedingEvaluation): string {
  if (evaluation.strongestInbreedingPercent > INBREEDING_WARNING_THRESHOLD) {
    return "血量が濃く、体質面に強い注意が必要です。";
  }
  if (evaluation.hasOutcross) {
    return "アウトブリードで体質面の安定が見込めます。";
  }
  if (evaluation.grade === "very_good") {
    return "父系と牝系の幅があり、能力の底上げが期待できます。";
  }
  if (evaluation.grade === "good") {
    return "血統構成に良い広がりがあります。";
  }
  return "標準的な配合です。";
}

function formatMyostatinProfile(profile: MyostatinProfile): string {
  const probabilities = profile.probabilities;
  const probabilityText = `CC ${formatProbability(probabilities.CC)} / CT ${formatProbability(probabilities.CT)} / TT ${formatProbability(probabilities.TT)}`;
  return profile.genotype ? `${profile.genotype} (${probabilityText})` : probabilityText;
}

function formatSireLineName(sireLine: string): string {
  return sireLineLabels[sireLine] ?? sireLine;
}

function formatFamilyNumber(familyNumber: string | undefined, legacyMareLine?: string): string {
  return normalizeFamilyNumber(familyNumber) ?? legacyMareLine ?? "-";
}

function formatProbability(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDeltas(deltas: AbilityDeltaMap): string {
  return deltaEntries(deltas)
    .map(([key, value]) => `${abilityLabels[key]} ${formatSigned(value)}`)
    .join(" / ");
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function deltaEntries(deltas: AbilityDeltaMap): [keyof AbilityScores, number][] {
  return Object.entries(deltas) as [keyof AbilityScores, number][];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileDate(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate()),
    pad(value.getHours()),
    pad(value.getMinutes()),
  ].join("");
}

function parseSeedIndex(value: string): number | null {
  const seed = Number(value);
  if (value.trim() === "" || !Number.isInteger(seed) || seed < 0 || seed >= SEED_PATTERN_COUNT) {
    return null;
  }
  return seed;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function updateHomebredIdsAfterReroll(
  ids: string[],
  previousId: string,
  rerolled: ProducedHorse,
  retiredAs: "stallion" | "broodmare",
): string[] {
  if (!ids.includes(previousId)) return ids;
  if (rerolled.retiredAs !== retiredAs) {
    return ids.filter((id) => id !== previousId);
  }
  return unique(ids.map((id) => (id === previousId ? rerolled.id : id)));
}
