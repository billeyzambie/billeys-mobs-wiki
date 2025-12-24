import { system, world, Player, ItemStack, Entity, EquipmentSlot, PlayerCursorInventoryComponent } from "@minecraft/server";
import { damageItem, decrementStack, dropAll, duckArmors, playSoundAtEntity } from "../utility";
import "./registry";
import "./misc";
import "./rat_crown";
import "./rubber_ducky";
import "./anniversary_hats";
import { PET_EQUIPMENT, PET_EQUIPMENT_DATA } from "./registry"
import { deserializeEnchantments, serializeEnchantments } from "../plushies";

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

/** @type {EquipmentSlot[]} */
export const SLOTS = ["Head", "Legs", "Chest", "Feet", "Body"];

const UNIVERSAL_SLOTS = ["Head", "Legs"];

const COMMAND_SLOT_MAP = {
    Head: "slot.armor.head",
    Chest: "slot.armor.chest",
    Legs: "slot.armor.legs",
    Feet: "slot.armor.feet",
    Body: "slot.armor"
};

let duckArmor = "";
let duckArmorerWasntInCreative = false;

system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity: entity, id }) => {
    if (!entity?.isValid) return;
    switch (id) {
        //the duck ones are a mess
        case "billey:set_duck_armor":
            duckArmor = entity.getComponent("equippable").getEquipment("Mainhand")?.typeId
                ?.replace("billey:", "")?.replace("_pet_armor", "");
            duckArmorerWasntInCreative = entity.getGameMode() != "Creative";
            if (duckArmorerWasntInCreative && duckArmor && duckArmor != "minecraft:dirt")
                entity.getComponent("equippable").setEquipment("Mainhand", undefined);
            return;
        case "billey:duck_equip_armor":
            if (duckArmorerWasntInCreative)
                if (entity.getComponent("mark_variant")?.value) {
                    let itemName = `billey:${duckArmors[entity.getComponent("mark_variant").value]}_pet_armor`;
                    let item = new ItemStack(itemName);
                    system.run(() => entity.dimension.spawnItem(item, entity.location));
                }
            entity.triggerEvent("be" + duckArmor);
            return;
        case "billey:duck_drop_armor":
            if (duckArmorerWasntInCreative)
                if (entity.getComponent("mark_variant")?.value) {
                    let itemName = `billey:${duckArmors[entity.getComponent("mark_variant").value]}_pet_armor`;
                    let item = new ItemStack(itemName);
                    system.run(() => entity.dimension.spawnItem(item, entity.location));
                }
            return;
        case "billey:cant_shoot_projectiles":
            if (entity.isValid)
                entity.setDynamicProperty("cant_shoot_projectiles", true);
            return;
        case "billey:destroy_pet_head_equipment":
            playSoundAtEntity(entity, "random.break", { pitch: 1.1 });
            setPetEquipment(entity, "Head", undefined);
            return;
    }
});

world.afterEvents.entitySpawn.subscribe(({ entity }) => {
    if (!entity.isValid) return;
    const projectile = entity.getComponent("projectile");
    if (!projectile) return;
    const { owner } = projectile;
    if (!owner?.isValid) return;
    if (owner.getDynamicProperty("cant_shoot_projectiles"))
        entity.remove();
});

world.beforeEvents.playerInteractWithEntity.subscribe(data => {
    const { player, target: entity, itemStack } = data;
    if (!entity.typeId.startsWith("billey:") && entity.typeId != "minecraft:cat")
        return;
    if (!itemStack)
        return;
    if (entity?.getComponent("tameable")?.tamedToPlayer != player)
        return;
    if (player.isSneaking)
        return;
    //const beforePlayerHelmet = player.getComponent("equippable").getEquipment("Head");
    if (itemStack.typeId.startsWith("minecraft:") && itemStack.typeId.endsWith("_dye")) {
        for (const slot of SLOTS) {
            const equipmentId = getPetEquipmentId(entity, slot);
            if (!equipmentId)
                continue;
            if (!PET_EQUIPMENT_DATA[equipmentId].isDyeable)
                continue;
            /** @type {PetEquipmentColor} */
            const color = PetEquipmentColor[itemStack.typeId.slice(10, itemStack.typeId.length - 4)];
            const colorPropertyName = `billey:${slot.toLowerCase()}_equipment_color`;
            if (entity.getProperty(colorPropertyName) == color)
                continue;
            data.cancel = true;
            system.run(() => {
                entity.setProperty(colorPropertyName, color);
                //player.getComponent("equippable").setEquipment("Head", beforePlayerHelmet);
                decrementStack(player);
            });
            return;
        }
    }
    for (const slot of UNIVERSAL_SLOTS) {
        if (Object.keys(PET_EQUIPMENT[slot]).includes(itemStack.typeId)) {
            data.cancel = true;
            system.run(() => {
                playerEquipPet(player, entity, slot, itemStack);
                //player.getComponent("equippable").setEquipment("Head", beforePlayerHelmet);
            });
            return;
        }
    }
    //non-hat pet equipment will go here
    /* hats are different from other cosmetics in that every single one
    of them can be put on every single mob */


    if (itemStack.typeId == "minecraft:shears") {
        const shearPredicate = SHEAR_PREDICATES[entity.typeId];
        if (shearPredicate && !shearPredicate(entity))
            return;
        for (const slot of SLOTS) {
            const equipmentId = getPetEquipmentId(entity, slot);
            if (equipmentId) {
                data.cancel = true;
                break;
            }
        }
        if (data.cancel) system.runTimeout(() => {
            dropAllPetEquipment(entity);
            playSoundAtEntity(entity, "mob.sheep.shear");
            system.run(() => damageItem(player));
        }, 1);
        return;
    }
});

const SHEAR_PREDICATES = {
    "billey:kiwi": kiwi => kiwi.hasComponent("is_sheared") || kiwi.hasComponent("is_saddled"),
    "billey:pizzafish": pizzafish => pizzafish.getComponent("variant").value == 5,
    //"is_sheared" for orange penguins actually means they have a shearable orange on their head
    "billey:orange_penguin": orangePenguin => !orangePenguin.hasComponent("is_sheared")
}

/**
 * @param {Player} player 
 * @param {Entity} pet 
 * @param {EquipmentSlot} slot 
 * @param {ItemStack} item
 */
export async function playerEquipPet(player, pet, slot, item) {
    if (getPetEquipmentId(pet, slot)) {
        dropPetEquipment(pet, slot);
    }
    else {
        await setPetEquipment(pet, slot, item);
        decrementStack(player);
    }
}

/**
 * @param {Entity} pet 
 * @param {EquipmentSlot} slot
 */
export async function dropPetEquipment(pet, slot) {
    const equipment = getPetEquipment(pet, slot);
    if (!equipment) return;
    await setPetEquipment(pet, slot, undefined);
    pet.dimension.spawnItem(equipment, pet.location);
}

/** @param {Entity} pet */
export async function dropAllPetEquipment(pet) {
    for (const slot of SLOTS)
        await dropPetEquipment(pet, slot);
}

/**
 * @param {Entity} pet 
 * @param {EquipmentSlot} slot 
 * @param {ItemStack|undefined} item
 * @param {bool|undefined} dontApplyDefaultColor
 */
export async function setPetEquipment(pet, slot, item, dontApplyDefaultColor) {
    const itemId = item?.typeId;
    playSoundAtEntity(pet, "armor.equip_generic");
    for (const dpid of pet.getDynamicPropertyIds().filter(i => i.startsWith(`equipment${slot}_`))) {
        pet.setDynamicProperty(dpid, undefined);
    }
    const prevItemId = getPetEquipmentId(pet, slot);
    pet.setDynamicProperty("equipment" + slot, itemId);
    if (slot == EquipmentSlot.Head)
        //lets other addons what the pet is wearing
        pet.runCommand("scriptevent billey:head_equipment_changed_to " + (itemId ?? ""));
    refreshBravery(pet);
    /** @type {import("./registry").PetEquipmentComponents} */
    const equipmentComponents = PET_EQUIPMENT[slot][itemId];
    if (item) {
        pet.setDynamicProperty(`equipment${slot}_nametag`, item.nameTag);
        pet.setDynamicProperty(`equipment${slot}_lore`, JSON.stringify(item.getLore()));
        if (item.hasComponent("enchantable"))
            pet.setDynamicProperty(`equipment${slot}_enchantments`, serializeEnchantments(item));
        if (item.hasComponent("durability"))
            pet.setDynamicProperty(`equipment${slot}_durability`, item.getComponent("durability").damage);
        else
            pet.setDynamicProperty(`equipment${slot}_enchantments`, undefined);
        for (const dpid of item.getDynamicPropertyIds()) {
            pet.setDynamicProperty(
                `equipment${slot}_DP_` + dpid,
                item.getDynamicProperty(dpid)
            );
        }
        if (equipmentComponents.isDyeable && !dontApplyDefaultColor)
            pet.setProperty(`billey:${slot.toLowerCase()}_equipment_color`, equipmentComponents.defaultColor);
    }
    let commandItemId = itemId;
    if (commandItemId && slot != "Head")
        commandItemId += "_attachable";

    system.run(() => {
        pet.runCommand(`replaceitem entity @s ${COMMAND_SLOT_MAP[slot]} 0 ${commandItemId ?? "air"}`);

        /*This has to be after the runCommand because otherwise removing
        the chef hat of a cooking pet made it finish instantly*/
        if (itemId) {
            const { onEquip } = equipmentComponents;
            if (onEquip)
                onEquip(pet);
        }
        else {
            /** @type {import("./registry").PetEquipmentComponents} */
            const prevEquipmentComponents = PET_EQUIPMENT[slot][prevItemId];
            const { onUnequip } = prevEquipmentComponents;
            if (onUnequip)
                onUnequip(pet);
        }
    })
}

/**
 * @param {Entity} pet 
 * @param {EquipmentSlot} slot
 * @returns {ItemStack|undefined}
 */
export function getPetEquipment(pet, slot) {
    const itemId = pet.getDynamicProperty("equipment" + slot);
    if (!itemId) return undefined;
    let item;
    try {
        item = new ItemStack(itemId);
    }
    catch {
        setPetEquipment(pet, slot, undefined);
        return undefined;
    }
    if (item.hasComponent("enchantable")) {
        deserializeEnchantments(
            item,
            pet.getDynamicProperty(`equipment${slot}_enchantments`)
        );
    }


    const durabilityDamage = pet.getDynamicProperty(`equipment${slot}_durability`);

    if (item.hasComponent("durability"))
        item.getComponent("durability").damage = durabilityDamage;

    item.nameTag = pet.getDynamicProperty(`equipment${slot}_nametag`);
    item.setLore(JSON.parse(pet.getDynamicProperty(`equipment${slot}_lore`)));
    for (const dpid of pet.getDynamicPropertyIds().filter(i => i.startsWith(`equipment${slot}_DP_`))) {
        item.setDynamicProperty(
            dpid.slice(`equipment${slot}_DP_`.length),
            pet.getDynamicProperty(dpid)
        );
    }
    return item;
}

/**
 * @param {Entity} pet 
 * @param {EquipmentSlot} slot
 * @returns {string|undefined}
 */
export function getPetEquipmentId(pet, slot) {
    return pet.getDynamicProperty("equipment" + slot);
}

/** @param {Entity} pet  */
export function refreshBravery(pet) {
    for (const slot of SLOTS) {
        if (PET_EQUIPMENT[slot][getPetEquipmentId(pet, slot)]?.isBrave) {
            pet.addTag("billey:brave");
            return;
        }
    }
    pet.removeTag("billey:brave");
}

world.afterEvents.entityDie.subscribe(({ deadEntity: entity }) => {
    if (!entity.isValid || !entity.hasComponent("is_tamed") || (!entity.typeId.startsWith("billey:")
        && entity.typeId != "minecraft:cat"))
        return;
    for (const slot of SLOTS) {
        const item = getPetEquipment(entity, slot);
        if (!item) continue;
        item.nameTag ||= entity.nameTag;
        entity.dimension.spawnItem(
            item,
            entity.location
        );
    }
});