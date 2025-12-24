import { system, world } from "@minecraft/server";

const MAX_STRING_LENGTH = 8000;

/**
 * @param {string} dpid Dynamic Property ID
 * @param {string} value 
 * @returns Returns a promise that resolves when the setting is done
 */
export function setWorldBigDynamicProperty(dpid, value) {
    const useBackup = !world.getDynamicProperty(`long_dp_${dpid}_use_backup`);
    if (useBackup && value != undefined)
        dpid += "backup";
    if (value == undefined) {
        const pageCount = world.getDynamicProperty("page_count_of_long_dp_" + dpid);
        for (let i = 1; i <= pageCount; i++) {
            world.setDynamicProperty(`long_dp_${dpid}_page${i}`, undefined);
        }
        world.setDynamicProperty("page_count_of_long_dp_" + dpid, undefined);
        world.setDynamicProperty(`long_dp_${dpid}_use_backup`, useBackup);
        return Promise.resolve();
    }
    else return new Promise(
        resolve => system.runJob(
            (function* () {
                const oldPageCount = world.getDynamicProperty("page_count_of_long_dp_" + dpid);
                let pageCount = 1;
                let currentSubstring = "";
                function finishPage() {
                    world.setDynamicProperty(`long_dp_${dpid}_page${pageCount}`, currentSubstring);
                    currentSubstring = "";
                };
                for (const char of value) {
                    currentSubstring += char;
                    if (currentSubstring.length >= MAX_STRING_LENGTH) {
                        finishPage();
                        pageCount++;
                    }
                    yield;
                }
                finishPage();
                world.setDynamicProperty("page_count_of_long_dp_" + dpid, pageCount);

                if (oldPageCount) for (let i = pageCount + 1; i <= oldPageCount; i++) {
                    world.setDynamicProperty(`long_dp_${dpid}_page${i}`, undefined);
                }
                world.setDynamicProperty(`long_dp_${dpid}_use_backup`, useBackup);
                resolve();
            })()
        )
    );
}

/**
 * @param {string} dpid Dynamic Property ID
 */
export async function getWorldBigDynamicProperty(dpid) {
    return new Promise(resolve => {
        system.runJob((function* () {
            const useBackup = !world.getDynamicProperty(`long_dp_${dpid}_use_backup`);
            if (useBackup)
                dpid += "backup";

            const pageCount = world.getDynamicProperty("page_count_of_long_dp_" + dpid);

            let result = "";

            for (let i = 1; i <= pageCount; i++) {
                result += world.getDynamicProperty(`long_dp_${dpid}_page${i}`);
                yield;
            }

            resolve(result);
        })());
    });
}

export async function loadDatabase(id) {
    const lol = await getWorldBigDynamicProperty(id) || "{}";
    world.sendMessage(lol.length.toString());
    return JSON.parse(lol);
}

export async function saveDatabase(id, value) {
    return await setWorldBigDynamicProperty(id, JSON.stringify(value));
}