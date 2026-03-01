(() => {
    const modUtils = window.modUtils;
    const logger = modUtils.getLogger();
    const modSC2DataManager = window.modSC2DataManager;

    function parseVersion(versionString) {
        return versionString.split('.').map(Number);
    }
    
    function compareVersions(vLoaded, vRequired) {
        let vl = parseVersion(vLoaded);
        let vr = parseVersion(vRequired);
        let vLength = Math.max(vr.length, vl.length);
        for (let i = 0; i < vLength; i++) {
            let num1 = vl[i] || 0;
            let num2 = vr[i] || 0;
            if (num1 > num2) return 1;
            if (num1 < num2) return 0;
        }
        return 1;
    }

    async function waitForUserResponse(alertConfig) {
        return new Promise((resolve) => {
            window.modSweetAlert2Mod.fire({
                ...alertConfig,
                willClose: () => resolve()
            });
        });
    }

    modSC2DataManager.getAddonPluginManager().registerAddonPlugin(
        '特姿拓展',
        'maplebirchAlert',
        {
            async afterInjectEarlyLoad() {

                // ========= 1️⃣ 框架檢測 =========
                const maple = modUtils.getMod('maplebirch');

                if (!maple) {
                    await waitForUserResponse({
                        title: '未檢測到前置框架',
                        icon: "error",
                        text: '未檢測到「秋枫白桦框架」。請先安裝框架後再使用本服裝。',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        confirmButtonText: '確定',
                    });
                    return;
                }

                if (compareVersions(maple.version, "3.0.15") === 0) {
                    await waitForUserResponse({
                        title: 'Maplebirch 框架版本過低',
                        icon: "warning",
                        text: '目前框架版本過低，本模組需要 v3.0.15 或以上版本。',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        confirmButtonText: '確定',
                    });
                }                
            }
        },
    );
})();