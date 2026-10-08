// =====================
// 初始化 setup.specialBody
// =====================
setup.specialBody ??= {};
setup.specialBody.flag = false;




// =====================
// 檢查 V.worn 裝備是否有指定特質
// =====================
function checkSpecialKey(specialKey = "isSpecial") {

    // const logger = window.modUtils?.getLogger?.();

    // 統一輸出函式
    function log(...args) {
        console.log(...args);
        // if (V.debug) logger?.warn?.(...args);           
    }

    setup.specialBody ??= {};
    setup.specialBody.flag = false; // 每次重算

    if (!V.worn || typeof V.worn !== "object") {
        log("[specialBody] V.worn 不存在或不是物件", V.worn);
        return;
    }

    log("[specialBody] 開始檢查特殊服裝 key:", specialKey);

    for (const slot in V.worn) {

        const wornItem = V.worn[slot];

        if (!wornItem) {
            log(`[specialBody] Slot ${slot} 沒有穿任何服裝`);
            continue;
        }

        if (!wornItem?.name) {
            log(`[specialBody] Slot ${slot} 的穿著物件缺少 name`, wornItem);
            continue;
        }

        const clothesList = setup.clothes?.[slot];

        if (!Array.isArray(clothesList)) {
            log(
                `[specialBody] Slot ${slot} setup.clothes.${slot} 不是陣列`,
                clothesList
            );
            continue;
        }

        const found = clothesList.find(c => c.name === wornItem.name);

        if (!found) {
            log(
                `[specialBody] Slot ${slot} 沒在 setup.clothes 找到對應 name: ${wornItem.name}`
            );
            continue;
        }

        log(`[specialBody] Slot ${slot} 找到設定資料`, found);

        if (found[specialKey] === true) {
            setup.specialBody.flag = true;
            log(`[specialBody] Slot ${slot} 找到 key: ${specialKey} 且為 true`);
            break;
        } else {
            log(
                `[specialBody] Slot ${slot} 沒有 key 或值不是 true: ${specialKey}`,
                found[specialKey]
            );
        }
    }

    log("[specialBody] 最終 flag =", setup.specialBody.flag);
}

// ===============================
// 檢測特殊上衣資源有效性（只檢查 upper）
// 新版 / 舊版素材兼容
// ===============================

async function detectSpecialUpperAssets() {
    setup.specialBody ??= {};
    setup.specialBody.flag ??= false;
    setup.specialBody.assets = {};

    const item = V.worn?.upper;
    if (!item) return;

    if (!setup.specialBody.flag) return;

    const basePath = `img/clothes/upper/${item.name}`; // 假設路徑結構
    const cache = {};

    const breastSize = V?.player?.perceived_breastsize;

    // 判斷圖片是否存在
    async function exists(path) {
        try {
            const img = await window.modUtils.getImage(path);
            return img !== undefined;
        } catch {
            return false;
        }
    }

    // 從多個候選路徑中找第一個存在的
    async function findFirstExisting(paths) {
        for (const path of paths) {
            if (await exists(path)) {
                return path;
            }
        }
        return null;
    }

    // 檢查圖層
    // 回傳值不再是 true / false，而是「實際可用圖片路徑」
    cache.base = await findFirstExisting([
        // 新版命名
        `${basePath}/body/base-body.png`,

        // 舊版命名
        `${basePath}/body/basenoarms.png`
    ]);

    cache.leftarm = await findFirstExisting([
        // 新版命名
        `${basePath}/body/left-arm-idle.png`,

        // 舊版命名
        `${basePath}/body/leftarm.png`
    ]);

    cache.rightarm = await findFirstExisting([
        // 新版命名
        `${basePath}/body/right-arm-idle.png`,

        // 舊版命名
        `${basePath}/body/rightarm.png`
    ]);

    cache.breasts = await findFirstExisting([
        // 新版命名
        `${basePath}/body/breasts-${breastSize}.png`,

        // 舊版命名
        `${basePath}/body/breasts${breastSize}.png`
    ]);

    // 緩存檢測結果
    setup.specialBody.assets.upper = cache;

    console.log(`[specialBody] 檢測 upper (${item.name}) 資源:`, cache);
}

// =====================
// 圖層定義
// =====================
function applySpecialBodyLayers() {

    const model = Renderer.CanvasModels?.main;
    if (!model?.layers) return;
    if (!modUtils.getMod('maplebirch')) return;

    /*
     * 第一次接管圖層前，保存當下環境已存在的 srcfn。
     *
     * 這裡保存的是 upstream 定義，不一定是 DoL 原版：
     * 如果其他模組已經先修改 body layer（例如 Fox paws），
     * 特姿關閉時就應完整交還該定義，而不是硬編碼 vanilla 路徑。
     *
     * specialBodyRefresh() 會反覆呼叫本函式，因此只允許保存一次，
     * 避免後續把特姿自己的 wrapper 再當成 upstream，形成多層包裝。
     */
    setup._specialBodyUpstreamSrcfn ??= {};
    const upstream = setup._specialBodyUpstreamSrcfn;

    for (const name of ["base", "breasts", "leftarm", "rightarm"]) {
        if (!(name in upstream)) {
            const srcfn = model.layers?.[name]?.srcfn;
            upstream[name] = typeof srcfn === "function" ? srcfn : null;
        }
    }

    const callUpstream = (name, context, options) => {
        const srcfn = upstream[name];
        return typeof srcfn === "function"
            ? srcfn.call(context, options)
            : null;
    };

    const layers = {

        base: {
            srcfn(options) {

                // ① 有特質
                if (setup.specialBody?.flag) {

                    // ①-1 資源存在
                    if (setup.specialBody.assets?.upper?.base) {
                        return setup.specialBody.assets?.upper?.base;
                    }

                    // ①-2 有特質但沒資源
                    return null;
                }

                // ② 非特姿：完整交還第一次接管前的圖層定義
                return callUpstream("base", this, options);
            }
        },

        breasts: {
            srcfn(options) {

                // ① 有特質
                if (setup.specialBody?.flag) {
                    if (options.mannequin) return null;

                    // ①-1 有資源
                    if (setup.specialBody.assets?.upper?.breasts) {
                        return setup.specialBody.assets?.upper?.breasts;
                    }

                    // ①-2 無資源
                    return null;
                }

                // ② 非特姿：完整交還第一次接管前的圖層定義
                return callUpstream("breasts", this, options);
            }
        },

        leftarm: {
            srcfn(options) {

                // ① 有特質
                if (setup.specialBody?.flag) {

                    // ①-1 有資源
                    if (setup.specialBody.assets?.upper?.leftarm) {
                        return setup.specialBody.assets?.upper?.leftarm;
                    }

                    // ①-2 無資源
                    return null;
                }

                // ② 非特姿：完整交還第一次接管前的圖層定義
                return callUpstream("leftarm", this, options);
            }
        },

        rightarm: {
            srcfn(options) {

                // ① 有特質
                if (setup.specialBody?.flag) {

                    // ①-1 有資源
                    if (setup.specialBody.assets?.upper?.rightarm) {
                        return setup.specialBody.assets?.upper?.rightarm;
                    }

                    // ①-2 無資源
                    return null;
                }

                // ② 非特姿：完整交還第一次接管前的圖層定義
                return callUpstream("rightarm", this, options);
            }
        },

    };

    maplebirch.char.use(layers);
}

// 特殊姿態下隱藏的圖層

const specialHideLayers = [

    // under_upper
    "under_upper",
    "under_upper_fitted_left",
    "under_upper_fitted_right",
    "under_upper_fitted_left_acc",
    "under_upper_fitted_right_acc",
    "under_upper_belly_2",
    "under_upper_belly",
    "under_upper_belly_acc",
    "under_upper_breasts",
    "under_upper_breasts_acc",
    "under_upper_breasts_detail",
    "under_upper_back",
    "under_upper_rightarm",
    "under_upper_leftarm",
    "under_upper_leftarm_fitted",
    "under_upper_leftarm_fitted_acc",
    "under_upper_rightarm_acc",
    "under_upper_leftarm_acc",
    "under_upper_acc",

    // under_lower
    "under_lower",
    "under_lower_belly_2",
    "under_lower_belly",
    "under_lower_belly_shadow",
    "under_lower_belly_acc",
    "under_lower_acc",
    "under_lower_detail",
    "under_lower_penis",
    "under_lower_penis_acc",

    // legs
    "legs",
    "legs_acc",
    "legs_back_acc",
    "legs_back",

    // fluids / cum
    "drip_vaginal",
    "drip_anal",
    "cum_chest",
    "cum_feet",
    "cum_leftarm",
    "cum_rightarm",
    "cum_neck",
    "cum_thigh",
    "cum_tummy",

    // body writings
    "writing_breasts",
    "writing_breasts_extra",
    "writing_left_shoulder",
    "writing_right_shoulder",
    "writing_pubic",
    "writing_left_thigh",
    "writing_right_thigh"
];

/*
=========================================================
特殊姿態圖層動態隱藏
---------------------------------------------------------
不再於進入特姿時把 showfn 換成 false、離開時再嘗試還原。
每個圖層只包一層動態判斷：

  特姿中   -> false
  非特姿   -> 呼叫該圖層目前的原生 / 外部 showfn

如果 Maplebirch 重建 layer，或其他模組之後重新改寫 showfn，
下一次更新時會以新的 showfn 為基礎重新安裝 wrapper。
=========================================================
*/
setup._specialHideLayerState ??= new WeakMap();

function updateSpecialLayers() {

    console.group("[specialBody] 更新特殊姿態隱藏 wrapper");
    console.log("[specialBody] 特殊身體狀態 =", setup.specialBody?.flag ? "啟用" : "關閉");

    const stateMap = setup._specialHideLayerState;

    for (const name of specialHideLayers) {
        const layer = Renderer?.CanvasModels?.main?.layers?.[name];

        if (!layer) {
            console.warn(`[specialBody] 找不到圖層：${name}`);
            continue;
        }

        const oldState = stateMap.get(layer);

        // 已經是本模組目前安裝的 wrapper，不重複包裝。
        if (oldState && layer.showfn === oldState.wrapper) {
            continue;
        }

        // layer 是新的，或 showfn 已被框架 / 其他模組改寫。
        // 此刻的 showfn 就視為新的原始條件。
        const originalShowfn = layer.showfn;
        const hadShowfn = typeof originalShowfn === "function";

        const wrapper = function(options) {
            // 特殊姿態：指定圖層一律隱藏。
            if (setup.specialBody?.flag) return false;

            // 普通姿態：完整交還原本的顯示條件。
            if (hadShowfn) {
                return originalShowfn.call(this, options);
            }

            // 原本沒有 showfn 時，不額外阻止 renderer 顯示。
            return true;
        };

        layer.showfn = wrapper;
        stateMap.set(layer, {
            originalShowfn,
            wrapper
        });

        console.log(`[specialBody] → 已安裝動態隱藏：${name}`);
    }

    console.groupEnd();
}

// =====================
// 重繪函式
// =====================
function specialBodyRefresh(useFullRedraw = true, delay = 50) {
    setTimeout(async () => {

        // 重新檢測 upper 特殊資源
        await detectSpecialUpperAssets();
        applySpecialBodyLayers();

        // maplebirch.char.use() 可能更新 / 重建 layer，
        // 因此必須在它之後重新確認特殊姿態隱藏 wrapper。
        updateSpecialLayers();

        if (useFullRedraw) {
            // 清空整個 Canvas Model Cache
            Renderer.CanvasModelCaches = {};
        } 
        else {
            // 只刷新圖片層
            Renderer.ImageCaches = {};
            Renderer.ImageErrors = {};
            Renderer.lastAnimation?.invalidateCaches();
            Renderer.lastAnimation?.redraw();
        }

        // 重新更新側邊人物圖
        Wikifier.wikifyEval('<<updatesidebarimg>>');

    }, delay);
}
/*
setup._lastUpperName ??= V.worn?.upper?.name;

setInterval(() => {
    const current = V.worn?.upper?.name;
    if (current !== setup._lastUpperName) {
        setup._lastUpperName = current;

        checkSpecialKey("isSpecial");
        updateSpecialLayers();
        specialBodyRefresh();
    }
}, 50); // 50ms 檢查一次
*/

// =====================
// 刷新函式
// =====================

// 遊戲頁面重新整理後刷新一次
$(document).one(':passagestart', () => {
    checkSpecialKey("isSpecial");
    updateSpecialLayers();
    specialBodyRefresh();
});

// 監聽服裝插槽，變動時刷新
(function(){

    /*
    =========================================================
    特姿拓展 - worn 全域監聽核心
    ---------------------------------------------------------
    * 監聽 V.worn 所有 slot 變動
    * 即時刷新特殊圖層
    * 防止 worn 被整個 clone 覆蓋時失效
    =========================================================
    */

    /*
    ---------------------------------------------------------
    debounceRefresh()
    ---------------------------------------------------------
    功能：
    - 防止一次換裝多個 slot 時連續刷新多次
    - 把同一事件循環內的多次變動合併成一次刷新
    方法：
    - 利用 setTimeout(..., 0)
    - 把刷新延遲到本輪 call stack 結束後再執行
    */
    function debounceRefresh(){

        // 如果已排隊刷新，直接跳過
        if (setup._specialRefreshQueued) return;

        setup._specialRefreshQueued = true;

        setTimeout(() => {

            setup._specialRefreshQueued = false;

            // 特姿檢測與圖層更新
            checkSpecialKey("isSpecial");
            updateSpecialLayers();
            specialBodyRefresh();

        }, 0); 
    }

    /*
    ---------------------------------------------------------
    installWornProxy(obj)
    ---------------------------------------------------------
    功能：
    - 對 worn 物件套上 Proxy
    - 攔截所有屬性寫入行為
    方法：
    - JS Proxy 的 set trap
    - 只要有人做：V.worn.xxx = value
      就會進入這個 set()
    */
    function installWornProxy(obj){

        return new Proxy(obj, {

            set(target, prop, value){

                const old = target[prop];

                // 寫入原始值
                target[prop] = value;

                /*
                只在真的變動時才刷新
                避免相同引用造成無意義刷新
                */
                if (old !== value) {
                    debounceRefresh();
                }

                return true;
            }

        });
    }

    /*
    ---------------------------------------------------------
    hookWorn()
    ---------------------------------------------------------
    功能：
    - 等待 State.variables.worn 初始化完成
    - 對 worn 套 Proxy
    - 同時攔截「整個 worn 被替換」的情況
    方法：
    - 使用 Object.defineProperty 攔截
      State.variables.worn 的 getter/setter
    - 如果有人執行：
        State.variables.worn = clone(...)
      也會自動重新套 Proxy
    */
    function hookWorn(){

        // 等 SugarCube 初始化完成
        if (!State?.variables?.worn) {
            setTimeout(hookWorn, 50);
            return;
        }

        // 防止重複安裝
        if (setup._wornHookInstalled) return;
        setup._wornHookInstalled = true;

        // 先對現有 worn 套 Proxy
        let _worn = installWornProxy(State.variables.worn);

        /*
        攔截 State.variables.worn 本身
        這一步是防止整個 worn 被替換
        */
        Object.defineProperty(State.variables, "worn", {
            configurable: true,

            get(){
                return _worn;
            },

            set(newValue){

                // 當有人整個覆蓋 worn
                // 例如：State.variables.worn = clone(...)
                // 自動重新包一層 Proxy
                _worn = installWornProxy(newValue);

                // 整體替換時也刷新一次
                debounceRefresh();
            }
        });

    }

    /*
    =========================================================
    Passage 切換時重設包裝狀態
    ---------------------------------------------------------
    原因：
    - SugarCube 切換 passage 時可能 clone State,導致監聽丟失
    - defineProperty 會失效
    - 需要重新掛載 hook

    做法：
    - 把 _wornHookInstalled 重設為 false
    - 再呼叫 hookWorn()
    =========================================================
    */
    $(document).on(':passagestart', () => {

        setup._wornHookInstalled = false;

        hookWorn();

    });

    // 初次啟動
    hookWorn();

})();    

// 載入存檔時刷新
Save.onLoad.add(() => {

    setTimeout(() => {

        checkSpecialKey("isSpecial");
        updateSpecialLayers();
        specialBodyRefresh();

    }, 0);

});