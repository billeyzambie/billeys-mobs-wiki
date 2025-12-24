import { Entity, EquipmentSlot, system } from "@minecraft/server";

/** @enum {number} */
const PetEquipmentColor = {
    white: 0,
    orange: 1,
    magenta: 2,
    light_blue: 3,
    yellow: 4,
    lime: 5,
    pink: 6,
    gray: 7,
    light_gray: 8,
    cyan: 9,
    purple: 10,
    blue: 11,
    brown: 12,
    green: 13,
    red: 14,
    black: 15
};

export let PET_EQUIPMENT = {
    Head: {},
    Chest: {},
    Legs: {}, //will be used for neck instead (collars, bowties, etc.)
    Feet: {},
    Body: {}
};

/** probably unused */
export let PET_EQUIPMENT_DATA = {};

/**
 * @typedef {{
 *   isBrave: boolean;
 *   isDyeable: boolean;
 *   defaultColor: PetEquipmentColor|undefined;
 *   onEquip: ((pet: Entity) => void)|undefined;
 *   onUnequip: ((pet: Entity) => void)|undefined;
 *}} PetEquipmentComponents
 */

/**
 * @param {EquipmentSlot} slot 
 * @param {string} equipmentId 
 * @param {PetEquipmentComponents} equipmentComponents 
 */
export function registerPetEquipment(slot, equipmentId, equipmentComponents) {
    PET_EQUIPMENT[slot][equipmentId] = equipmentComponents;
    PET_EQUIPMENT_DATA[equipmentId] = equipmentComponents;
    allPetEquipmentIds.push(equipmentId);
}

/** @type {string[]} */
let allPetEquipmentIds = [];

export function getAllPetEquipmentIds() {
    return allPetEquipmentIds;
}

system.afterEvents.scriptEventReceive.subscribe(({ id, message }) => {
    if (id != "billey:register_pet_hat") {
        return;
    }
    const data = JSON.parse(message);
    registerPetEquipment("Head", data.id, data);
});