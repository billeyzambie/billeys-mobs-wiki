import { Entity, ItemLockMode, ItemStack, Player, system, TicksPerSecond, world } from "@minecraft/server";
import { playSoundAtEntity } from "./utility";

/**
 * Currently this file is quite messy as around half of it is ready for more morphs to come
 * and the other half will sorta need to be redone when more morphs come.
 */

/**
 * @param {Player} player 
 * @param {string} morphName 
 */
export function isMorph(player, morphName) {
    return player.getComponent("equippable")?.getEquipment("Offhand")?.typeId == `billey:${morphName}_morph`;
}

world.afterEvents.itemCompleteUse.subscribe(({ source: player, source: { dimension }, itemStack }) => {
    switch (itemStack.typeId) {
        case "billey:duck_morph_potion":
            const equippable = player.getComponent("equippable");
            const offhand = equippable.getEquipment("Offhand");
            if (offhand) {
                if (offhand.lockMode != ItemLockMode.none) {
                    if (offhand.typeId == "billey:duck_morph") {
                        if (!player.nameTag) return;
                        player.setDynamicProperty("nametag_before_morph", player.nameTag);
                        player.nameTag = "";
                        player.sendMessage("Your nametag is now hidden.");
                        return;
                    }
                    else return player.sendMessage("Morph failed, your offhand slot is locked.");
                }
                dimension.spawnItem(offhand, player.location);
            }
            let item = new ItemStack("billey:duck_morph");
            item.lockMode = "slot";
            item.keepOnDeath = true;
            equippable.setEquipment("Offhand", item);
            player.sendMessage("You have become a duck.");
            playSoundAtEntity(player, "random.pop");
            return;
        case "billey:empty_morph_potion":
            if (!isMorph(player, "duck")) return;
            player.getComponent("equippable").setEquipment("Offhand", undefined);
            player.getComponent("underwater_movement").resetToDefaultValue();
            player.getComponent("movement").resetToDefaultValue();
            const oldName = player.getDynamicProperty("nametag_before_morph");
            if (oldName !== undefined) {
                player.nameTag = oldName;
                player.setDynamicProperty("nametag_before_morph", undefined);
            }
            player.sendMessage("You are no longer a duck.");
            playSoundAtEntity(player, "random.pop");
            return;
    }
});

/**
 * @param {Entity} duckTarget
 */
function addDuckTarget(duckTarget) {
    if (duckTarget.getComponent("movement") && !duckTarget.getComponent("is_tamed")) {
        duckTarget.addTag("billey_duck_attack");
        system.runTimeout(
            () => {
                if (duckTarget?.isValid)
                    duckTarget.removeTag("billey_duck_attack");
            },
            45 * TicksPerSecond
        );
    }
}

world.afterEvents.playerSpawn.subscribe(({ player }) =>
    player.removeTag("billey_duck_attack")
);

/**
 * @param {Player} player 
 * @param {string} morphName 
 */
export function morphTick(player, morphName) {
    player.playAnimation(
        "animation.billeys_mobs.morph_hide_player",
        {
            stopExpression: `!q.is_item_name_any('slot.weapon.offhand', 0, 'billey:${morphName}_morph')`,
            blendOutTime: 0.15
        }
    );
    const health = player.getComponent("health");
    let maxHealthValue = 20;
    switch (morphName) {
        case "duck":
            maxHealthValue = 8;
            player.getComponent("underwater_movement").setCurrentValue(0.07);
            if (player.isSneaking && !player.__wasSneaking) {
                const duckTarget = player.getEntitiesFromViewDirection({
                    maxDistance: 15,
                    excludeFamilies: ["duck", "inanimate"]
                })[0]?.entity;
                if (duckTarget)
                    addDuckTarget(duckTarget);
            }
            player.addEffect("slow_falling", 20, { showParticles: false });
            const block = player.dimension.getBlock({
                x: player.location.x,
                y: player.location.y + 0.5,
                z: player.location.z
            });
            if (block.typeId == "minecraft:water")
                player.applyKnockback({ x: 0, z: 0 }, 0.1);
            break;
    }
    health.setCurrentValue(Math.min(health.currentValue, maxHealthValue));
    //wasSneaking[player.id] = player.isSneaking;
}

world.afterEvents.entityHitEntity.subscribe(({ hitEntity, damagingEntity }) => {
    let duckTarget;
    if (!damagingEntity.isValid || !hitEntity.isValid) return;
    if (isMorph(damagingEntity, "duck")) {
        duckTarget = hitEntity;
    }
    else if (isMorph(hitEntity, "duck")) {
        duckTarget = damagingEntity;
    }
    if (!duckTarget) return;
    if (duckTarget.matches({ excludeFamilies: ["duck"] }))
        addDuckTarget(duckTarget);
});

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource: { damagingEntity } }) => {
    if (!damagingEntity) return;
    if (damagingEntity.typeId == "billey:tiktaalik" && deadEntity.typeId == "minecraft:slime") {
        if (!world.gameRules.doMobLoot) return;
        //level 1 tiktaaliks have a 10% chance to drop the slime,
        //level 2 ones have 20%, level 10 ones have 100%, etc.
        const chance = damagingEntity.getProperty("billey:level") / 10;
        if (Math.random() > chance) return;
        const item = new ItemStack("billey:tiktaalik_slime");
        deadEntity.dimension.spawnItem(item, deadEntity.location);
    }
});