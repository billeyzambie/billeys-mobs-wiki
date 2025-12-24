import { Entity, system, Trigger, world } from "@minecraft/server";
import { loadHappiness } from "./happiness/happiness";
import { DIMENSIONS } from "./utility";

export const CURRENT_VERSION = "5.1.3";
export const LAST_LOADED_BILLEYS_MOBS_VERSION_DPID = "last_loaded_billeys_mobs_version";

/**
 * @param {string} str1 
 * @param {string} str2 
 * Returns
 */
export function versionGreaterThan(str1, str2) {
    if (str2 == undefined)
        return true;
    if (str1 == undefined)
        return false;
    const arr1 = str1.split(".");
    const arr2 = str2.split(".");
    for (let i = 0; i < arr1.length; i++) {
        const num1 = arr1[i] * 1;
        const num2 = arr2[i] * 1;
        if (num1 > num2)
            return true;
    }
    return false;
}

export const entityLoadHappiness = world.afterEvents.entityLoad.subscribe(({ entity }) => {
    if (entity.isValid && entity.typeId.startsWith("billey:") && entity.getComponent("tameable")) {
        loadHappiness(entity);

        entity.setDynamicProperty(LAST_LOADED_BILLEYS_MOBS_VERSION_DPID, CURRENT_VERSION);
    }
});

world.afterEvents.entitySpawn.subscribe(entityLoadHappiness);

//for the /reload command

system.run(() => {
    for (const dimension of DIMENSIONS) {
        dimension.getEntities().forEach(entity => entityLoadHappiness({ entity }));
    }
});