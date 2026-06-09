const fallbackDrinks = [
    {
        name: "ハイボール",
        recipe: [
            { ingredient: "ウイスキー", measure: "30ml" },
            { ingredient: "ソーダ", measure: "45ml" },
            { ingredient: "レモン", measure: "10ml" },
        ],
        glass: "タンブラー",
        serviceMethod: "ステア",
        colors: ["#f9d27a", "#d68a35"],
    },
];

let drinks = [...fallbackDrinks];
let solvedOrders = [];
let solvedKeys = new Set();
let missedKeys = new Set();
let missedCounts = new Map();
let missedDetails = new Map();
let attemptedKeys = new Set();
let pendingIngredient = null;
let glassButtons = [];
let ingredientButtons = [];
let measureButtons = [];
let playMode = "simple";
let questionScope = "curated";
let listView = "active";
let curatedExcludedKeys = new Set();
let priorityExcludedKeys = new Set();
let sharedCuratedExcludedKeys = new Set();
let sharedPriorityExcludedKeys = new Set();
let dailyChallengeKeys = new Set();
let dailyChallengeDate = "";

const state = {
    active: false,
    score: 0,
    streak: 0,
    order: null,
    mix: [],
    selectedGlass: null,
    answeredWrong: false,
};

const scoreEl = document.querySelector("#score");
const streakEl = document.querySelector("#streak");
const orderNameEl = document.querySelector("#orderName");
const recipeEl = document.querySelector("#recipe");
const mixStatusEl = document.querySelector("#mixStatus");
const glassEl = document.querySelector("#glass");
const liquidEl = document.querySelector("#liquid");
const startButton = document.querySelector("#startButton");
const shakeButton = document.querySelector("#shakeButton");
const stirButton = document.querySelector("#stirButton");
const nextButton = document.querySelector("#nextButton");
const resetButton = document.querySelector("#resetButton");
const reloadOrdersButton = document.querySelector("#reloadOrdersButton");
const simpleModeButton = document.querySelector("#simpleModeButton");
const staffModeButton = document.querySelector("#staffModeButton");
const modePanelEl = document.querySelector(".mode-panel");
const dailyScopeButton = document.querySelector("#dailyScopeButton");
const curatedScopeButton = document.querySelector("#curatedScopeButton");
const priorityScopeButton = document.querySelector("#priorityScopeButton");
const allScopeButton = document.querySelector("#allScopeButton");
const scopePanelEl = document.querySelector(".scope-panel");
const curatedExcludeCheck = document.querySelector("#curatedExcludeCheck");
const curatedCheckLabel = document.querySelector("#curatedCheckLabel");
const priorityExcludeCheck = document.querySelector("#priorityExcludeCheck");
const priorityCheckLabel = document.querySelector("#priorityCheckLabel");
const controlsEl = document.querySelector(".controls");
const glassButtonsEl = document.querySelector("#glassButtons");
const ingredientButtonsEl = document.querySelector("#ingredientButtons");
const measurePanelEl = document.querySelector("#measurePanel");
const measureButtonsEl = document.querySelector("#measureButtons");
const modal = document.querySelector("#gameOver");
const finalScoreEl = document.querySelector("#finalScore");
const playAgain = document.querySelector("#playAgain");
const solvedList = document.querySelector("#solvedList");
const progressSummary = document.querySelector("#progressSummary");
const activeListButton = document.querySelector("#activeListButton");
const excludedListButton = document.querySelector("#excludedListButton");
const priorityExcludedListButton = document.querySelector("#priorityExcludedListButton");
const saveSolvedButton = document.querySelector("#saveSolvedButton");
const loadSolvedButton = document.querySelector("#loadSolvedButton");
const clearSolvedButton = document.querySelector("#clearSolvedButton");
const showExclusionsButton = document.querySelector("#showExclusionsButton");
const exclusionExportPanel = document.querySelector("#exclusionExportPanel");
const exclusionExportText = document.querySelector("#exclusionExportText");

function choose(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
    return [...list].sort(() => Math.random() - 0.5);
}

const baseSpiritOptions = ["テキーラ", "ウォッカ", "ラム", "ジン"];
const citrusJuiceOptions = ["ライムジュース", "レモンジュース"];
const pairedIngredientGroups = [
    {
        triggers: ["グレープフルーツ", "グレープフルーツジュース", "グループフルーツジュース", "オレンジジュース"],
        options: ["グレープフルーツジュース", "オレンジジュース"],
    },
    {
        triggers: ["アップルジュース", "アップルジュースジュース", "クランベリージュース"],
        options: ["アップルジュース", "クランベリージュース"],
    },
];
const baseSpiritAliases = {
    "テキーラ": "テキーラ",
    "ウォッカ": "ウォッカ",
    "ウォーカ": "ウォッカ",
    "ラム": "ラム",
    "ジン": "ジン",
    "JIN": "ジン",
    "DRY JIN": "ジン",
    "タンカレー": "ジン",
};

const glassOptions = ["タンブラー", "ロックグラス", "カクテルグラス", "ワイングラス", "ホットグラス"];
const serviceMethods = ["シェイク", "ステア"];
const glassClassMap = {
    "タンブラー": "glass-tumbler",
    "ロックグラス": "glass-rock",
    "カクテルグラス": "glass-cocktail",
    "ワイングラス": "glass-wine",
    "ホットグラス": "glass-hot",
};

const glassIconClassMap = {
    "タンブラー": "glass-icon-tumbler",
    "ロックグラス": "glass-icon-rock",
    "カクテルグラス": "glass-icon-cocktail",
    "ワイングラス": "glass-icon-wine",
    "ホットグラス": "glass-icon-hot",
};

const curatedStorageKey = "lastCallBarCuratedExcludedKeys";
const priorityStorageKey = "lastCallBarPriorityExcludedKeys";
const solvedStorageKey = "lastCallBarSolvedOrders";
const solvedSnapshotStorageKey = "lastCallBarSavedSolvedOrders";
const dailyChallengeStorageKey = "lastCallBarDailyChallenge";
const sharedExclusionsFile = "exclusions.txt";

function baseSpiritGroup(ingredient) {
    return baseSpiritAliases[ingredient] || null;
}

function normalizeText(value) {
    return value.trim().replace(/\s+/g, " ");
}

function normalizeMeasure(value) {
    return normalizeText(value)
        .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
        .replace(/ｍｌ/gi, "ml")
        .replace(/ＭＬ/gi, "ml")
        .replace(/ＴＳＰ/gi, "tsp")
        .replace(/dash/gi, "Dash")
        .replace(/ダッシュ/g, "Dash");
}

function isColor(value) {
    return /^#[0-9a-f]{6}$/i.test(value.trim());
}

function measureToMl(measure) {
    const ml = measure.match(/^(\d+(?:\.\d+)?)ml$/i);
    if (ml) {
        return Number(ml[1]);
    }

    const tsp = measure.match(/^(\d+(?:\.\d+)?)tsp$/i);
    if (tsp) {
        return Number(tsp[1]) * 5;
    }

    return 0;
}

function inferGlass(name, recipe) {
    const hasMilk = recipe.some((step) => (
        step.ingredient.includes("ミルク") ||
        step.ingredient.includes("牛乳") ||
        step.ingredient.includes("生クリーム")
    )) || name.includes("ミルク");
    if (hasMilk) {
        return "ロックグラス";
    }

    const hasWine = recipe.some((step) => (
        step.ingredient.includes("ワイン") ||
        step.ingredient.includes("赤玉")
    ));
    if (hasWine) {
        return "ワイングラス";
    }

    const totalMl = recipe.reduce((sum, step) => sum + measureToMl(step.measure), 0);
    if (totalMl >= 45 && totalMl <= 75) {
        return "カクテルグラス";
    }

    return "タンブラー";
}

function inferServiceMethod(glass) {
    return glass === "カクテルグラス" ? "シェイク" : "ステア";
}

function normalizeServiceMethod(value, glass) {
    const method = normalizeText(value || "");
    if (serviceMethods.includes(method)) {
        return method;
    }

    if (/shake/i.test(method)) {
        return "シェイク";
    }

    if (/stir/i.test(method)) {
        return "ステア";
    }

    return inferServiceMethod(glass);
}

function parseRecipeItem(rawItem) {
    const item = normalizeText(rawItem);
    const match = item.match(/^(.+?)\s+(.+)$/);

    if (!match) {
        return null;
    }

    const ingredient = normalizeText(match[1]);
    const measure = normalizeMeasure(match[2]);

    if (!ingredient || !measure) {
        return null;
    }

    return { ingredient, measure };
}

function parseOrderLine(line) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
        return null;
    }

    const parts = trimmedLine.split("|").map((part) => part.trim());
    if (parts.length < 2) {
        return null;
    }

    const name = parts[0];
    const recipe = parts[1]
        .split(",")
        .map(parseRecipeItem)
        .filter(Boolean);

    if (!name || recipe.length === 0) {
        return null;
    }

    const colors = (parts[2] || "")
        .split(",")
        .map((color) => color.trim())
        .filter(isColor);
    const explicitGlass = normalizeText(parts[3] || "");
    const glass = glassOptions.includes(explicitGlass)
        ? explicitGlass
        : inferGlass(name, recipe);
    const serviceMethod = normalizeServiceMethod(parts[4] || "", glass);

    return {
        name,
        recipe,
        glass,
        serviceMethod,
        colors: colors.length >= 2 ? colors.slice(0, 2) : ["#ffe4a8", "#e05f55"],
    };
}

function orderKey(order) {
    const recipeKey = order.recipe
        .map((step) => `${step.ingredient}:${step.measure}`)
        .join(",");
    return `${order.name}|${recipeKey}`;
}

function currentSolvedOrders() {
    return drinks.filter((order) => solvedKeys.has(orderKey(order)));
}

function todayKey() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function orderByKey(key) {
    return drinks.find((order) => orderKey(order) === key) || null;
}

function dailyCandidateOrders() {
    return drinks.filter((order) => {
        const key = orderKey(order);
        return !solvedKeys.has(key) && !curatedExcludedKeys.has(key);
    });
}

function saveDailyChallenge(keys, date = todayKey()) {
    dailyChallengeDate = date;
    dailyChallengeKeys = new Set(keys);
    localStorage.setItem(dailyChallengeStorageKey, JSON.stringify({
        date,
        keys,
    }));
}

function ensureDailyChallenge() {
    const date = todayKey();
    const expectedCount = Math.min(3, dailyCandidateOrders().length);

    try {
        const saved = JSON.parse(localStorage.getItem(dailyChallengeStorageKey) || "{}");
        const rawKeys = Array.isArray(saved.keys) ? saved.keys : [];
        const savedKeys = rawKeys.filter((key) => orderByKey(key));
        if (
            saved.date === date &&
            savedKeys.length === expectedCount &&
            savedKeys.length === rawKeys.length
        ) {
            saveDailyChallenge(savedKeys, date);
            return;
        }
    } catch (error) {
        // Fall through and create a new daily challenge.
    }

    const keys = shuffle(dailyCandidateOrders())
        .slice(0, 3)
        .map(orderKey);
    saveDailyChallenge(keys, date);
}

function orderMatchesScope(order) {
    const key = orderKey(order);

    if (questionScope === "all") {
        return true;
    }

    if (curatedExcludedKeys.has(key)) {
        return false;
    }

    if (questionScope === "daily") {
        return dailyChallengeKeys.has(key);
    }

    if (questionScope === "priority") {
        return !priorityExcludedKeys.has(key);
    }

    return true;
}

function availableOrders() {
    return drinks.filter((order) => (
        orderMatchesScope(order) &&
        !solvedKeys.has(orderKey(order)) &&
        (questionScope === "daily" || !missedKeys.has(orderKey(order)))
    ));
}

function allUnsolvedOrders() {
    return drinks.filter((order) => orderMatchesScope(order) && !solvedKeys.has(orderKey(order)));
}

function loadCuratedExclusions() {
    try {
        const saved = JSON.parse(localStorage.getItem(curatedStorageKey) || "[]");
        curatedExcludedKeys = new Set(Array.isArray(saved) ? saved : []);
    } catch (error) {
        curatedExcludedKeys = new Set();
    }
}

function loadPriorityExclusions() {
    try {
        const saved = JSON.parse(localStorage.getItem(priorityStorageKey) || "[]");
        priorityExcludedKeys = new Set(Array.isArray(saved) ? saved : []);
    } catch (error) {
        priorityExcludedKeys = new Set();
    }
}

function saveCuratedExclusions() {
    localStorage.setItem(curatedStorageKey, JSON.stringify([...curatedExcludedKeys]));
    updateExclusionExportButtonState();
}

function savePriorityExclusions() {
    localStorage.setItem(priorityStorageKey, JSON.stringify([...priorityExcludedKeys]));
    updateExclusionExportButtonState();
}

function currentLocalExclusionSets() {
    const curated = new Set(loadExclusionKeysFromStorage(curatedStorageKey));
    const priority = new Set(loadExclusionKeysFromStorage(priorityStorageKey)
        .filter((key) => !curated.has(key)));
    return { curated, priority };
}

function updateExclusionExportButtonState() {
    showExclusionsButton.hidden = false;
}

function keysForExclusionEntry(entry) {
    const value = normalizeText(entry || "");
    if (!value) {
        return [];
    }

    if (value.includes("|")) {
        return [value];
    }

    return drinks
        .filter((order) => order.name === value)
        .map(orderKey);
}

function parseSharedExclusions(text) {
    const sections = {
        curated: [],
        priority: [],
    };
    let currentSection = "curated";

    text.split(/\r?\n/).forEach((line) => {
        const trimmed = normalizeText(line);
        if (!trimmed || trimmed.startsWith("#")) {
            return;
        }

        if (/^\[(厳選対象外|curated)\]$/i.test(trimmed)) {
            currentSection = "curated";
            return;
        }

        if (/^\[(重点対象外|priority)\]$/i.test(trimmed)) {
            currentSection = "priority";
            return;
        }

        sections[currentSection].push(trimmed);
    });

    return sections;
}

async function loadSharedExclusions() {
    sharedCuratedExcludedKeys = new Set();
    sharedPriorityExcludedKeys = new Set();

    try {
        const response = await fetch(`${sharedExclusionsFile}?cache=${Date.now()}`);
        if (!response.ok) {
            throw new Error("shared exclusions not found");
        }

        const sections = parseSharedExclusions(await response.text());
        let appliedCount = 0;

        sections.curated.forEach((entry) => {
            keysForExclusionEntry(entry).forEach((key) => {
                sharedCuratedExcludedKeys.add(key);
                curatedExcludedKeys.add(key);
                appliedCount += 1;
            });
        });

        sections.priority.forEach((entry) => {
            keysForExclusionEntry(entry).forEach((key) => {
                sharedPriorityExcludedKeys.add(key);
                priorityExcludedKeys.add(key);
                appliedCount += 1;
            });
        });

        return { ok: true, count: appliedCount };
    } catch (error) {
        return { ok: false, count: 0 };
    }
}

async function reloadExclusions() {
    loadCuratedExclusions();
    loadPriorityExclusions();
    const result = await loadSharedExclusions();
    updateExclusionExportButtonState();
    return result;
}

function loadExclusionKeysFromStorage(storageKey) {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
        return Array.isArray(saved) ? saved.filter((key) => typeof key === "string" && key) : [];
    } catch (error) {
        return [];
    }
}

function cocktailNameFromKey(key) {
    const matchedOrder = drinks.find((order) => orderKey(order) === key);
    if (matchedOrder) {
        return matchedOrder.name;
    }

    return key.split("|")[0] || key;
}

function namesFromExclusionKeys(keys) {
    return [...new Set(keys.map(cocktailNameFromKey))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "ja"));
}

function formatLocalStorageExclusions() {
    const local = currentLocalExclusionSets();
    const curatedKeys = new Set([...sharedCuratedExcludedKeys, ...local.curated]);
    const priorityKeys = new Set([...sharedPriorityExcludedKeys, ...local.priority]);
    const priorityOnlyKeys = [...priorityKeys].filter((key) => !curatedKeys.has(key));
    const curatedNames = namesFromExclusionKeys([...curatedKeys]);
    const priorityNames = namesFromExclusionKeys(priorityOnlyKeys);
    const curatedLines = curatedNames.length > 0 ? curatedNames : ["# なし"];
    const priorityLines = priorityNames.length > 0 ? priorityNames : ["# なし"];

    return [
        "# 別ブラウザーにも共有したい除外設定をカクテル名で記載します。",
        "# orders.txtと同じフォルダーに置いてください。",
        "# 行頭が # の行と空行は無視されます。",
        "",
        "[厳選対象外]",
        ...curatedLines,
        "",
        "[重点対象外]",
        ...priorityLines,
    ].join("\n");
}

function showLocalStorageExclusions() {
    exclusionExportText.value = formatLocalStorageExclusions();
    exclusionExportPanel.hidden = false;
    mixStatusEl.textContent = "localStorageの除外一覧を表示しました。";
}

function normalizeSolvedEntries(entries) {
    if (!Array.isArray(entries)) {
        return [];
    }

    const seen = new Set();
    return entries
        .filter((entry) => entry && typeof entry.key === "string" && entry.key)
        .filter((entry) => {
            if (seen.has(entry.key)) {
                return false;
            }

            seen.add(entry.key);
            return true;
        })
        .map((entry) => ({
            key: entry.key,
            name: typeof entry.name === "string" ? entry.name : "",
            solvedAt: typeof entry.solvedAt === "string" ? entry.solvedAt : "",
        }));
}

function applySolvedOrders(entries) {
    solvedOrders = normalizeSolvedEntries(entries);
    solvedKeys = new Set(solvedOrders.map((entry) => entry.key));
}

function saveSolvedOrdersToStorage() {
    localStorage.setItem(solvedStorageKey, JSON.stringify(solvedOrders));
}

function loadSolvedOrdersFromStorage(storageKey) {
    try {
        return normalizeSolvedEntries(JSON.parse(localStorage.getItem(storageKey) || "[]"));
    } catch (error) {
        return [];
    }
}

function syncCurrentOrderExclusions() {
    if (!state.order) {
        return;
    }

    const key = orderKey(state.order);

    if (curatedExcludeCheck.checked) {
        curatedExcludedKeys.add(key);
    } else {
        curatedExcludedKeys.delete(key);
    }

    if (priorityExcludeCheck.checked) {
        priorityExcludedKeys.add(key);
    } else {
        priorityExcludedKeys.delete(key);
    }

    saveCuratedExclusions();
    savePriorityExclusions();
}

async function loadOrders() {
    try {
        const response = await fetch(`orders.txt?cache=${Date.now()}`);
        if (!response.ok) {
            throw new Error("orders.txt not found");
        }

        const text = await response.text();
        const parsedDrinks = text
            .split(/\r?\n/)
            .map(parseOrderLine)
            .filter(Boolean);

        drinks = parsedDrinks.length > 0 ? parsedDrinks : [...fallbackDrinks];
        return { ok: true, count: drinks.length };
    } catch (error) {
        drinks = [...fallbackDrinks];
        return { ok: false, count: drinks.length };
    }
}

async function loadProgress() {
    applySolvedOrders(loadSolvedOrdersFromStorage(solvedStorageKey));
}

function uniqueSteps(field) {
    return [...new Set(drinks.flatMap((order) => order.recipe.map((step) => step[field])))];
}

function measureSortValue(measure) {
    const ml = measure.match(/^(\d+(?:\.\d+)?)ml$/i);
    if (ml) {
        return Number(ml[1]);
    }
    if (/tsp$/i.test(measure)) {
        return 300 + (Number.parseFloat(measure) || 0);
    }
    if (/dash/i.test(measure)) {
        return 500;
    }
    if (measure === "適量") {
        return 900;
    }
    return 700;
}

function isJuiceIngredient(ingredient) {
    return ingredient.includes("ジュース");
}

const squareBottleIngredients = new Set(["ジン", "ウォッカ", "ラム", "テキーラ", "キャプテンモルガン"]);
const namedLiqueurIngredients = new Set([
    "アマレット",
    "カンパリ",
    "コアントロ",
    "ブルーキュラソー",
    "ベイリーズ",
    "ベーリーズ",
    "パッソア",
    "マリブ",
    "ペルノ",
    "シャンボール",
    "モーツアルト",
    "ストーンズ",
    "サザンカンフォート",
    "カルアミルク",
    "ミントチェリー",
]);

function ingredientIconType(ingredient) {
    if (squareBottleIngredients.has(ingredient)) {
        return "square-bottle";
    }

    if (ingredient === "レモン" || ingredient === "ライム") {
        return "fruit";
    }

    if (ingredient.includes("ワイン")) {
        return "wine-bottle";
    }

    if (isJuiceIngredient(ingredient)) {
        return "juice-carton";
    }

    if (ingredient.includes("リキュール") || namedLiqueurIngredients.has(ingredient)) {
        return "round-bottle";
    }

    return "none";
}

function orderIngredientOptions(options) {
    const firstIngredients = ["ジン", "ウォッカ", "ラム"];
    const firstSet = new Set(firstIngredients);
    const orderedFirst = firstIngredients.filter((ingredient) => options.includes(ingredient));
    const middle = options.filter((ingredient) => !firstSet.has(ingredient) && !isJuiceIngredient(ingredient));
    const juices = options.filter((ingredient) => !firstSet.has(ingredient) && isJuiceIngredient(ingredient));

    return [...orderedFirst, ...middle, ...juices];
}

function ingredientOptionsForOrder(order, maxCount) {
    const allIngredients = uniqueSteps("ingredient");
    const correctIngredients = [...new Set(order.recipe.map((step) => step.ingredient))];
    const priorityIngredients = baseSpiritOptions.filter((ingredient) => allIngredients.includes(ingredient));
    const hasCitrusJuice = correctIngredients.some((ingredient) => citrusJuiceOptions.includes(ingredient));
    const citrusIngredients = hasCitrusJuice
        ? citrusJuiceOptions.filter((ingredient) => allIngredients.includes(ingredient))
        : [];
    const pairedIngredients = pairedIngredientGroups
        .filter((group) => group.triggers.some((ingredient) => correctIngredients.includes(ingredient)))
        .flatMap((group) => group.options);
    const mandatoryOptions = [...new Set([...correctIngredients, ...priorityIngredients, ...citrusIngredients, ...pairedIngredients])];
    const randomDistractors = shuffle(allIngredients.filter((ingredient) => !mandatoryOptions.includes(ingredient)));

    if (mandatoryOptions.length >= maxCount) {
        const correctSet = new Set(correctIngredients);
        const extraMandatory = mandatoryOptions.filter((ingredient) => !correctSet.has(ingredient));
        return orderIngredientOptions(shuffle([
            ...correctIngredients,
            ...shuffle(extraMandatory).slice(0, Math.max(0, maxCount - correctIngredients.length)),
        ]));
    }

    return orderIngredientOptions(shuffle([
        ...mandatoryOptions,
        ...randomDistractors.slice(0, maxCount - mandatoryOptions.length),
    ]));
}

function nearbyMeasureOptions(correctMeasures, maxCount) {
    const allMeasures = uniqueSteps("measure");
    const priorityMeasures = allMeasures.includes("30ml") ? ["30ml"] : [];
    const mandatoryMeasures = [...new Set([...correctMeasures, ...priorityMeasures])];
    const correctValues = mandatoryMeasures.map(measureSortValue);
    const scoredMeasures = allMeasures
        .filter((measure) => !mandatoryMeasures.includes(measure))
        .map((measure) => {
            const value = measureSortValue(measure);
            const distance = Math.min(...correctValues.map((correctValue) => Math.abs(correctValue - value)));
            return { measure, distance };
        })
        .sort((a, b) => a.distance - b.distance || a.measure.localeCompare(b.measure, "ja"))
        .map((entry) => entry.measure);

    return [...new Set([
        ...mandatoryMeasures,
        ...scoredMeasures.slice(0, Math.max(0, maxCount - mandatoryMeasures.length)),
    ])].sort((a, b) => measureSortValue(a) - measureSortValue(b) || a.localeCompare(b, "ja"));
}

function buildControls(order = null) {
    glassButtonsEl.innerHTML = "";
    ingredientButtonsEl.innerHTML = "";
    measureButtonsEl.innerHTML = "";

    const ingredients = order ? ingredientOptionsForOrder(order, 18) : [];
    const measures = order ? nearbyMeasureOptions([...new Set(order.recipe.map((step) => step.measure))], 20) : [];

    if (order) {
        glassOptions.forEach((glass) => {
            const button = document.createElement("button");
            button.className = "glass-choice";
            button.dataset.glass = glass;
            button.type = "button";
            const icon = document.createElement("span");
            icon.className = `glass-icon ${glassIconClassMap[glass]}`;
            const label = document.createElement("span");
            label.textContent = glass;
            button.append(icon, label);
            button.addEventListener("click", () => addGlass(glass));
            glassButtonsEl.append(button);
        });
    }

    ingredients.forEach((ingredient) => {
        const button = document.createElement("button");
        button.className = "ingredient";
        button.dataset.ingredient = ingredient;
        button.type = "button";

        const icon = document.createElement("span");
        const iconType = ingredientIconType(ingredient);
        icon.className = `ingredient-icon ingredient-icon-${iconType}`;
        if (ingredient === "レモン" || ingredient === "ライム") {
            icon.classList.add(`ingredient-icon-${ingredient === "レモン" ? "lemon" : "lime"}`);
        }
        button.classList.toggle("no-ingredient-icon", iconType === "none");
        const label = document.createTextNode(ingredient);
        button.append(icon, label);
        button.addEventListener("click", () => addIngredient(ingredient));
        ingredientButtonsEl.append(button);
    });

    measures.forEach((measure) => {
        const button = document.createElement("button");
        button.className = "measure";
        button.dataset.measure = measure;
        button.type = "button";
        button.textContent = measure;
        button.addEventListener("click", () => addMeasure(measure));
        measureButtonsEl.append(button);
    });

    glassButtons = [...glassButtonsEl.querySelectorAll(".glass-choice")];
    ingredientButtons = [...ingredientButtonsEl.querySelectorAll(".ingredient")];
    measureButtons = [...measureButtonsEl.querySelectorAll(".measure")];
    setControls(Boolean(order && state.active));
}

async function saveSolvedOrder(order) {
    const key = orderKey(order);

    if (solvedKeys.has(key)) {
        return;
    }

    solvedKeys.add(key);
    missedKeys.delete(key);
    missedCounts.delete(key);
    missedDetails.delete(key);
    solvedOrders.push({ key, name: order.name, solvedAt: new Date().toISOString() });

    try {
        saveSolvedOrdersToStorage();
    } catch (error) {
        mixStatusEl.textContent = "正解は記録しましたが、保存に失敗しました。";
    }

    renderProgress();
}

async function clearSolvedProgress() {
    try {
        applySolvedOrders([]);
        saveSolvedOrdersToStorage();
        renderProgress();
        resetGame();
        mixStatusEl.textContent = "正解済みをクリアしました。最初から出題します。";
    } catch (error) {
        mixStatusEl.textContent = "正解済みのクリアに失敗しました。";
    }
}

async function saveSolvedProgressSnapshot() {
    const solved = currentSolvedOrders().map((order) => ({
        key: orderKey(order),
        name: order.name,
        solvedAt: new Date().toISOString(),
    }));

    saveSolvedButton.disabled = true;
    saveSolvedButton.textContent = "保存中";

    try {
        const saved = normalizeSolvedEntries(solved);
        localStorage.setItem(solvedSnapshotStorageKey, JSON.stringify(saved));
        mixStatusEl.textContent = `現在の正解済み ${saved.length} 件を保存しました。`;
    } catch (error) {
        mixStatusEl.textContent = "正解済みの保存に失敗しました。";
    } finally {
        saveSolvedButton.textContent = "現在の正解済みを保存";
        saveSolvedButton.disabled = false;
    }
}

async function loadSolvedProgressSnapshot() {
    loadSolvedButton.disabled = true;
    loadSolvedButton.textContent = "ロード中";

    try {
        applySolvedOrders(loadSolvedOrdersFromStorage(solvedSnapshotStorageKey));
        saveSolvedOrdersToStorage();
        resetGame();
        mixStatusEl.textContent = `保存した正解済み ${solvedOrders.length} 件をロードしました。`;
    } catch (error) {
        mixStatusEl.textContent = "正解済みのロードに失敗しました。";
    } finally {
        loadSolvedButton.textContent = "保存した正解済みをロード";
        loadSolvedButton.disabled = false;
    }
}

function renderProgress() {
    const solvedCount = currentSolvedOrders().length;
    const available = availableOrders();
    const unsolved = allUnsolvedOrders();
    const activeOrders = drinks
        .filter((order) => {
            const key = orderKey(order);
            return orderMatchesScope(order) &&
                !solvedKeys.has(key);
        });
    const excludedOrders = drinks
        .filter((order) => curatedExcludedKeys.has(orderKey(order)))
        .sort((a, b) => a.name.localeCompare(b.name, "ja"));
    const priorityExcludedOrders = drinks
        .filter((order) => priorityExcludedKeys.has(orderKey(order)))
        .sort((a, b) => a.name.localeCompare(b.name, "ja"));
    const sortedActiveOrders = activeOrders.sort((a, b) => {
        const aKey = orderKey(a);
        const bKey = orderKey(b);
        const aGroup = missedKeys.has(aKey) ? 0 : 1;
        const bGroup = missedKeys.has(bKey) ? 0 : 1;

        if (aGroup !== bGroup) {
            return aGroup - bGroup;
        }

        const aAttempted = attemptedKeys.has(aKey) ? 1 : 0;
        const bAttempted = attemptedKeys.has(bKey) ? 1 : 0;

        if (aAttempted !== bAttempted) {
            return aAttempted - bAttempted;
        }

        return a.name.localeCompare(b.name, "ja");
    });
    const listOrders = listView === "excluded"
        ? excludedOrders
        : listView === "priorityExcluded"
            ? priorityExcludedOrders
            : sortedActiveOrders;
    const missedCount = Math.max(0, unsolved.length - available.length);
    const scopeLabel = questionScope === "daily"
        ? "今日の3問"
        : questionScope === "priority"
        ? "重点問題"
        : questionScope === "curated"
            ? "厳選問題"
            : "全問題";
    progressSummary.textContent = `${scopeLabel}: ${available.length} 問が出題可能です。正解済み ${solvedCount}/${drinks.length}`;
    if (missedCount > 0) {
        progressSummary.textContent += `。リセット待ち ${missedCount} 問`;
    }
    solvedList.innerHTML = "";
    activeListButton.classList.toggle("selected", listView === "active");
    excludedListButton.classList.toggle("selected", listView === "excluded");
    priorityExcludedListButton.classList.toggle("selected", listView === "priorityExcluded");

    if (listOrders.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-score";
        empty.textContent = listView === "excluded"
            ? "厳選問題対象外の注文はありません"
            : listView === "priorityExcluded"
                ? "重点問題対象外の注文はありません"
            : "未正解の注文はありません";
        solvedList.append(empty);
        return;
    }

    listOrders.forEach((order) => {
        const key = orderKey(order);
        const missedCountForOrder = missedCounts.get(key) || 0;
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.className = "order-pick";
        button.classList.toggle("missed", missedCountForOrder > 0);
        button.classList.toggle("curated-excluded", curatedExcludedKeys.has(key));
        button.classList.toggle("priority-excluded", !curatedExcludedKeys.has(key) && priorityExcludedKeys.has(key));
        button.type = "button";
        button.disabled = listView !== "active" || (questionScope !== "daily" && missedKeys.has(key));
        const name = document.createElement("span");
        name.className = "order-name-wrap";
        const title = document.createElement("span");
        title.className = "order-title";
        title.textContent = order.name;
        name.append(title);
        if (missedCountForOrder > 0) {
            const detail = document.createElement("small");
            detail.className = "miss-detail";
            detail.textContent = missedDetails.get(key) || "不正解";
            name.append(detail);
        }
        button.append(name);
        button.addEventListener("click", () => selectOrder(order));
        item.append(button);
        solvedList.append(item);
    });
}

function updateStats() {
    scoreEl.textContent = state.score;
    streakEl.textContent = state.streak;
}

function setControls(enabled) {
    glassButtons.forEach((button) => {
        button.disabled = !enabled;
    });
    ingredientButtons.forEach((button) => {
        button.disabled = !enabled || ingredientIsComplete(button.dataset.ingredient);
    });
    measureButtons.forEach((button) => {
        button.disabled = !enabled || playMode !== "staff";
    });
    const canServe = enabled && Boolean(state.selectedGlass);
    shakeButton.disabled = !canServe;
    stirButton.disabled = !canServe;
}

function ingredientIsComplete(ingredient) {
    if (!state.order) {
        return false;
    }

    const requiredCount = state.order.recipe.filter((step) => step.ingredient === ingredient).length;
    const completedCount = state.mix.filter((step) => step.ingredient === ingredient).length;
    return requiredCount > 0 && completedCount >= requiredCount;
}

function updateIngredientButtons() {
    ingredientButtons.forEach((button) => {
        const ingredient = button.dataset.ingredient;
        const isComplete = ingredientIsComplete(ingredient);
        const isSelected = playMode === "simple"
            ? isComplete
            : ingredient === pendingIngredient;
        button.classList.toggle("selected", isSelected);
        button.classList.toggle("correct", isComplete);
    });
}

function updateModeUI() {
    const isStaffMode = playMode === "staff";
    simpleModeButton.classList.toggle("selected", !isStaffMode);
    staffModeButton.classList.toggle("selected", isStaffMode);
    modePanelEl.hidden = Boolean(state.order);
    simpleModeButton.disabled = Boolean(state.order);
    staffModeButton.disabled = Boolean(state.order);
    dailyScopeButton.classList.toggle("selected", questionScope === "daily");
    curatedScopeButton.classList.toggle("selected", questionScope === "curated");
    priorityScopeButton.classList.toggle("selected", questionScope === "priority");
    allScopeButton.classList.toggle("selected", questionScope === "all");
    scopePanelEl.hidden = Boolean(state.order);
    dailyScopeButton.disabled = Boolean(state.order);
    curatedScopeButton.disabled = Boolean(state.order);
    priorityScopeButton.disabled = Boolean(state.order);
    allScopeButton.disabled = Boolean(state.order);
    controlsEl.classList.toggle("simple-mode", !isStaffMode);
    measurePanelEl.hidden = !isStaffMode;
    setPendingIngredient(null);
    clearMeasureSelection();
    updateIngredientButtons();
    setControls(Boolean(state.order && state.active));
}

function setPlayMode(mode) {
    if (playMode === mode) {
        return;
    }

    playMode = mode;

    if (state.order && state.active) {
        resetGlass();
        renderRecipe();
        mixStatusEl.textContent = playMode === "staff"
            ? "従業員モードです。材料を選んでから分量を選んでください。"
            : "簡易モードです。材料を選んでください。分量は正解情報に表示されます。";
    }

    updateModeUI();
}

function setQuestionScope(scope) {
    if (questionScope === scope) {
        if (scope === "daily") {
            ensureDailyChallenge();
            renderProgress();
            startButton.disabled = availableOrders().length === 0;
        }
        return;
    }

    questionScope = scope;
    if (questionScope === "daily") {
        ensureDailyChallenge();
    }
    updateModeUI();
    renderProgress();
    startButton.disabled = availableOrders().length === 0;
    mixStatusEl.textContent = questionScope === "daily"
        ? "今日の3問を対象にします。厳選問題から日替わりで3問だけ出題します。"
        : questionScope === "priority"
        ? "重点問題を対象にします。"
        : questionScope === "curated"
            ? "厳選問題を対象にします。"
            : "全問題を対象にします。";
}

function setListView(view) {
    listView = view;
    renderProgress();
}

function setSelectedGlass(glass) {
    state.selectedGlass = glass;
    glassButtons.forEach((button) => {
        button.classList.toggle("selected", button.dataset.glass === glass);
    });
}

function setPendingIngredient(ingredient) {
    pendingIngredient = ingredient;
    updateIngredientButtons();

    if (ingredient) {
        mixStatusEl.textContent = `${ingredient} を選びました。次に分量を選んでください。`;
    }
}

function clearMeasureSelection() {
    measureButtons.forEach((button) => {
        button.classList.remove("selected");
    });
}

function applyGlassStyle(glass) {
    Object.values(glassClassMap).forEach((className) => {
        glassEl.classList.remove(className);
    });
    glassEl.classList.add(glassClassMap[glass] || "glass-tumbler");
}

function resetGlass() {
    state.mix = [];
    state.selectedGlass = null;
    glassEl.classList.remove("shake", "stir");
    liquidEl.style.setProperty("--fill", "0%");
    liquidEl.style.setProperty("--drinkTop", "#ffe4a8");
    liquidEl.style.setProperty("--drinkBottom", "#e05f55");
    glassEl.style.setProperty("--foam", "0");
    applyGlassStyle("タンブラー");
}

function formatStep(step) {
    return `${step.ingredient} ${step.measure}`;
}

function renderRecipe() {
    recipeEl.innerHTML = "";

    if (!state.order) {
        return;
    }

    if (state.answeredWrong) {
        const glassPart = document.createElement("span");
        glassPart.textContent = `グラス ${state.order.glass}`;
        glassPart.classList.add("answer");
        recipeEl.append(glassPart);

        const servicePart = document.createElement("span");
        servicePart.textContent = `提供 ${state.order.serviceMethod}`;
        servicePart.classList.add("answer");
        recipeEl.append(servicePart);

        state.order.recipe.forEach((step) => {
            const part = document.createElement("span");
            part.textContent = formatStep(step);
            part.classList.add("answer");
            recipeEl.append(part);
        });
        return;
    }

    if (state.selectedGlass) {
        const glassPart = document.createElement("span");
        glassPart.textContent = `グラス ${state.selectedGlass}`;
        glassPart.classList.add("done");
        recipeEl.append(glassPart);
    }

    state.mix.forEach((step) => {
        const part = document.createElement("span");
        part.textContent = formatStep(step);
        part.classList.add("done");
        recipeEl.append(part);
    });
}

function showAllSolved() {
    state.active = false;
    state.order = null;
    setControls(false);
    setPendingIngredient(null);
    clearMeasureSelection();
    nextButton.hidden = true;
    const dailyKeys = [...dailyChallengeKeys];
    const isDailyScope = questionScope === "daily";
    const dailyComplete = isDailyScope &&
        dailyKeys.length > 0 &&
        dailyKeys.every((key) => solvedKeys.has(key));
    if (dailyComplete) {
        orderNameEl.textContent = "今日の営業完了";
        recipeEl.innerHTML = "";
        curatedCheckLabel.hidden = true;
        priorityCheckLabel.hidden = true;
        mixStatusEl.textContent = "今日の3問は完了しました。また明日の営業で挑戦してください。";
        startButton.textContent = "営業完了";
        startButton.disabled = true;
        updateModeUI();
        return;
    }

    if (isDailyScope && dailyKeys.length === 0) {
        orderNameEl.textContent = "今日の候補なし";
        recipeEl.innerHTML = "";
        curatedCheckLabel.hidden = true;
        priorityCheckLabel.hidden = true;
        mixStatusEl.textContent = "今日の3問に出題できる厳選問題がありません。全問題か厳選問題で開始を選んでください。";
        startButton.textContent = "今日の候補なし";
        startButton.disabled = true;
        updateModeUI();
        return;
    }

    const hasMissed = missedKeys.size > 0;
    const availableIgnoringScope = drinks.filter((order) => (
        !solvedKeys.has(orderKey(order)) &&
        !missedKeys.has(orderKey(order))
    ));
    const hasOnlyExcluded = questionScope !== "all" && availableIgnoringScope.length > 0;
    orderNameEl.textContent = hasMissed
        ? "出題候補なし"
        : hasOnlyExcluded
            ? questionScope === "priority" ? "重点候補なし" : "厳選候補なし"
            : "全問正解済み";
    recipeEl.innerHTML = "";
    curatedCheckLabel.hidden = true;
    priorityCheckLabel.hidden = true;
    mixStatusEl.textContent = hasMissed
        ? "間違えた問題はリセットまで出題しません。リセットで戻せます。"
        : hasOnlyExcluded
            ? questionScope === "priority"
                ? "重点問題に出題できる注文がありません。厳選問題か全問題で開始を選ぶと出題できます。"
                : "厳選問題に出題できる注文がありません。全問題で開始を選ぶと出題できます。"
        : "出題できる注文がありません。クリアボタンで最初からやり直せます。";
    startButton.textContent = hasMissed
        ? "リセット待ち"
        : hasOnlyExcluded
            ? questionScope === "priority" ? "重点候補なし" : "厳選候補なし"
            : "全問正解済み";
    startButton.disabled = true;
    updateModeUI();
}

function presentOrder(order) {
    state.active = true;
    state.order = order;
    attemptedKeys.add(orderKey(order));
    state.answeredWrong = false;
    nextButton.hidden = true;
    modal.hidden = true;
    startButton.textContent = "営業中";
    startButton.disabled = true;
    resetGlass();
    buildControls(state.order);
    updateModeUI();
    setPendingIngredient(null);
    clearMeasureSelection();
    curatedExcludeCheck.checked = curatedExcludedKeys.has(orderKey(state.order));
    priorityExcludeCheck.checked = priorityExcludedKeys.has(orderKey(state.order));
    curatedCheckLabel.hidden = false;
    priorityCheckLabel.hidden = false;
    orderNameEl.textContent = state.order.name;
    mixStatusEl.textContent = playMode === "staff"
        ? "材料を選んでから分量を選んでください。"
        : "材料を選んでください。分量は正解情報に表示されます。";
    liquidEl.style.setProperty("--drinkTop", state.order.colors[0]);
    liquidEl.style.setProperty("--drinkBottom", state.order.colors[1]);
    renderRecipe();
}

function selectOrder(order) {
    const key = orderKey(order);
    if (
        solvedKeys.has(key) ||
        (questionScope !== "all" && curatedExcludedKeys.has(key)) ||
        (questionScope !== "daily" && missedKeys.has(key))
    ) {
        renderProgress();
        return;
    }

    presentOrder(order);
}

function nextOrder() {
    if (questionScope === "daily") {
        const candidates = availableOrders();
        const unattempted = candidates.filter((order) => !attemptedKeys.has(orderKey(order)));
        const missed = candidates.filter((order) => missedKeys.has(orderKey(order)));
        const pool = unattempted.length > 0 ? unattempted : missed;

        if (pool.length === 0) {
            showAllSolved();
            return;
        }

        presentOrder(choose(pool));
        return;
    }

    const candidates = availableOrders();

    if (candidates.length === 0) {
        showAllSolved();
        return;
    }

    presentOrder(choose(candidates));
}

function addIngredient(ingredient) {
    if (!state.active || !state.order) {
        return;
    }

    if (state.mix.length >= state.order.recipe.length) {
        mixStatusEl.textContent = "完成しています。提供方法を選んでください。";
        return;
    }

    if (playMode === "simple") {
        const matchedStep = state.order.recipe.find((step) => (
            step.ingredient === ingredient &&
            !state.mix.some((mixedStep) => (
                mixedStep.ingredient === step.ingredient &&
                mixedStep.measure === step.measure
            ))
        ));

        if (!matchedStep) {
            const alreadySelected = state.mix.some((step) => step.ingredient === ingredient);
            markWrongAnswer(alreadySelected
                ? `材料の重複「${ingredient}」`
                : `材料「${ingredient}」（このカクテルには入りません）`);
            return;
        }

        state.mix.push({ ingredient: matchedStep.ingredient, measure: matchedStep.measure });
        const fill = Math.min(92, 18 + state.mix.length * 21);
        liquidEl.style.setProperty("--fill", `${fill}%`);
        glassEl.style.setProperty("--foam", state.mix.length >= state.order.recipe.length ? "1" : "0");
        mixStatusEl.textContent = `${matchedStep.ingredient} は正解です。`;
        updateIngredientButtons();
        setControls(true);
        renderRecipe();
        return;
    }

    setPendingIngredient(ingredient);
}

function wrongMeasureDetail(ingredient, measure) {
    const alreadyMixed = state.mix.some((mixedStep) => (
        mixedStep.ingredient === ingredient &&
        mixedStep.measure === measure
    ));

    if (alreadyMixed) {
        return `材料と分量の重複「${ingredient} ${measure}」`;
    }

    const ingredientSteps = state.order.recipe.filter((step) => step.ingredient === ingredient);

    if (ingredientSteps.length === 0) {
        return `材料「${ingredient}」（このカクテルには入りません）`;
    }

    const correctMeasures = ingredientSteps.map((step) => step.measure).join("、");
    return `分量「${measure}」（${ingredient} の正解は ${correctMeasures}）`;
}

function correctMeasureListDetail(ingredient) {
    const ingredientSteps = state.order.recipe.filter((step) => step.ingredient === ingredient);
    return ingredientSteps.map(formatStep).join("、");
}

function incompleteDrinkDetail() {
    const missingParts = [];
    const missingSteps = state.order.recipe.filter((step) => (
        !state.mix.some((mixedStep) => (
            mixedStep.ingredient === step.ingredient &&
            mixedStep.measure === step.measure
        ))
    ));

    if (missingSteps.length > 0) {
        missingParts.push(`未選択「${missingSteps.map(formatStep).join("、")}」`);
    }

    if (state.selectedGlass !== state.order.glass) {
        missingParts.push(state.selectedGlass ? `グラス「${state.selectedGlass}」` : "グラス未選択");
    }

    return missingParts.join("、");
}

function markWrongAnswer(detail = "", listDetail = detail) {
    const key = orderKey(state.order);
    missedKeys.add(key);
    missedCounts.set(key, (missedCounts.get(key) || 0) + 1);
    missedDetails.set(key, listDetail || detail || "不正解");
    state.active = false;
    state.answeredWrong = true;
    state.streak = 0;
    state.score = Math.max(0, state.score - 20);
    const detailText = detail ? `間違えた箇所: ${detail}。` : "";
    mixStatusEl.textContent = `不正解です。${detailText}${state.order.name} の答えを表示しました。`;
    setPendingIngredient(null);
    clearMeasureSelection();
    setControls(false);
    nextButton.hidden = false;
    applyGlassStyle(state.order.glass);
    renderRecipe();
    renderProgress();
    updateStats();
}

function addGlass(glass) {
    if (!state.active || !state.order) {
        return;
    }

    if (glass !== state.order.glass) {
        markWrongAnswer(`グラス「${glass}」`);
        return;
    }

    setSelectedGlass(glass);
    applyGlassStyle(glass);
    mixStatusEl.textContent = `${glass} は正解です。`;
    setControls(true);
    renderRecipe();
}

function addMeasure(measure) {
    if (!state.active || !state.order) {
        return;
    }

    if (playMode !== "staff") {
        return;
    }

    if (state.mix.length >= state.order.recipe.length) {
        mixStatusEl.textContent = "完成しています。提供方法を選んでください。";
        return;
    }

    if (!pendingIngredient) {
        mixStatusEl.textContent = "先に材料を選んでください。";
        return;
    }

    const matchedStep = state.order.recipe.find((step) => (
        step.ingredient === pendingIngredient &&
        step.measure === measure &&
        !state.mix.some((mixedStep) => (
            mixedStep.ingredient === step.ingredient &&
            mixedStep.measure === step.measure
        ))
    ));

    if (!matchedStep) {
        const detail = wrongMeasureDetail(pendingIngredient, measure);
        const listDetail = correctMeasureListDetail(pendingIngredient);
        markWrongAnswer(detail, listDetail || detail);
        return;
    }

    state.mix.push({ ingredient: matchedStep.ingredient, measure: matchedStep.measure });
    measureButtons.forEach((button) => {
        button.classList.toggle("selected", button.dataset.measure === measure);
    });
    const fill = Math.min(92, 18 + state.mix.length * 21);
    liquidEl.style.setProperty("--fill", `${fill}%`);
    glassEl.style.setProperty("--foam", state.mix.length >= state.order.recipe.length ? "1" : "0");
    mixStatusEl.textContent = `${formatStep(matchedStep)} は正解です。`;
    setPendingIngredient(null);
    setControls(true);
    renderRecipe();
}

function serveDrink(serviceMethod) {
    if (!state.active || !state.order) {
        return;
    }

    if (state.answeredWrong) {
        mixStatusEl.textContent = "次へ進んでください。";
        return;
    }

    glassEl.classList.remove("shake", "stir");
    void glassEl.offsetWidth;

    if (state.mix.length !== state.order.recipe.length) {
        markWrongAnswer(incompleteDrinkDetail());
        return;
    }

    if (state.selectedGlass !== state.order.glass) {
        markWrongAnswer(incompleteDrinkDetail());
        return;
    }

    if (serviceMethod !== state.order.serviceMethod) {
        markWrongAnswer(`提供方法「${serviceMethod}」（正解は ${state.order.serviceMethod}）`);
        return;
    }

    glassEl.classList.add(serviceMethod === "シェイク" ? "shake" : "stir");

    state.streak += 1;
    const streakBonus = state.streak * 25;
    const gainedScore = 120 + streakBonus;
    state.score += gainedScore;
    mixStatusEl.textContent = `提供成功。${state.order.name} を正解済みに保存しました。+${gainedScore}`;
    syncCurrentOrderExclusions();
    saveSolvedOrder(state.order);
    updateStats();
    window.setTimeout(nextOrder, 640);
}

function startGame() {
    if (questionScope === "daily") {
        ensureDailyChallenge();
    }

    if (availableOrders().length === 0) {
        showAllSolved();
        return;
    }

    state.active = true;
    state.answeredWrong = false;
    state.score = 0;
    state.streak = 0;
    modal.hidden = true;
    nextButton.hidden = true;
    startButton.textContent = "営業中";
    startButton.disabled = true;
    setControls(true);
    updateStats();
    nextOrder();
}

function resetGame() {
    if (questionScope === "daily") {
        ensureDailyChallenge();
    }

    state.active = false;
    state.score = 0;
    state.streak = 0;
    missedKeys = new Set();
    missedCounts = new Map();
    missedDetails = new Map();
    attemptedKeys = new Set();
    state.order = null;
    state.answeredWrong = false;
    orderNameEl.textContent = "開店準備中";
    recipeEl.innerHTML = "";
    curatedCheckLabel.hidden = true;
    priorityCheckLabel.hidden = true;
    curatedExcludeCheck.checked = false;
    priorityExcludeCheck.checked = false;
    buildControls(null);
    updateModeUI();
    mixStatusEl.textContent = playMode === "staff"
        ? "スタートで最初の問題を出題します。材料を選んでから分量を選んでください。"
        : "スタートで最初の問題を出題します。簡易モードでは材料を選んでください。";
    startButton.textContent = "スタート";
    startButton.disabled = availableOrders().length === 0;
    nextButton.hidden = true;
    modal.hidden = true;
    resetGlass();
    setControls(false);
    setPendingIngredient(null);
    clearMeasureSelection();
    renderProgress();
    updateStats();

    if (availableOrders().length === 0 && drinks.length > 0) {
        showAllSolved();
    }
}

function goToNextQuestion() {
    if (availableOrders().length === 0) {
        showAllSolved();
        return;
    }

    state.active = true;
    nextButton.hidden = true;
    setControls(true);
    nextOrder();
}

async function reloadOrdersFromFile() {
    reloadOrdersButton.disabled = true;
    reloadOrdersButton.textContent = "反映中";

    const result = await loadOrders();
    await loadProgress();
    const exclusionsResult = await reloadExclusions();
    if (questionScope === "daily") {
        ensureDailyChallenge();
    }
    resetGame();

    const exclusionText = exclusionsResult.ok
        ? `exclusions.txt ${exclusionsResult.count}件も反映しました。`
        : "exclusions.txtは未反映です。";
    mixStatusEl.textContent = result.ok
        ? `orders.txtを再読み込みしました。${result.count}問を反映しました。${exclusionText}`
        : `orders.txtの読み込みに失敗したため、予備問題を表示しています。${exclusionText}`;
    reloadOrdersButton.textContent = "orders.txt反映";
    reloadOrdersButton.disabled = false;
}

startButton.addEventListener("click", startGame);
shakeButton.addEventListener("click", () => serveDrink("シェイク"));
stirButton.addEventListener("click", () => serveDrink("ステア"));
nextButton.addEventListener("click", goToNextQuestion);
resetButton.addEventListener("click", resetGame);
reloadOrdersButton.addEventListener("click", reloadOrdersFromFile);
simpleModeButton.addEventListener("click", () => setPlayMode("simple"));
staffModeButton.addEventListener("click", () => setPlayMode("staff"));
dailyScopeButton.addEventListener("click", () => setQuestionScope("daily"));
priorityScopeButton.addEventListener("click", () => setQuestionScope("priority"));
curatedScopeButton.addEventListener("click", () => setQuestionScope("curated"));
allScopeButton.addEventListener("click", () => setQuestionScope("all"));
playAgain.addEventListener("click", startGame);
activeListButton.addEventListener("click", () => setListView("active"));
excludedListButton.addEventListener("click", () => setListView("excluded"));
priorityExcludedListButton.addEventListener("click", () => setListView("priorityExcluded"));
saveSolvedButton.addEventListener("click", saveSolvedProgressSnapshot);
loadSolvedButton.addEventListener("click", loadSolvedProgressSnapshot);
clearSolvedButton.addEventListener("click", clearSolvedProgress);
showExclusionsButton.addEventListener("click", showLocalStorageExclusions);

startButton.disabled = true;
setControls(false);
updateModeUI();
Promise.all([loadOrders(), loadProgress()]).then(async () => {
    await reloadExclusions();
    buildControls(null);
    resetGame();
});
