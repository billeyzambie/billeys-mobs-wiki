import { world, system, Entity, ItemStack, Player, Dimension, ItemLockMode } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dropAll, nameOf } from "./utility";


system.afterEvents.scriptEventReceive.subscribe(data => {
    if (data.id != "billey:pigeon_mission") return;
    const pigeon = data.sourceEntity;
    if (!pigeon?.isValid) return;
    const player = world.getAllPlayers().find(p => p.name == pigeon.getDynamicProperty("owner_name"));
    switch (data.message) {
        case "phase3":
            let target = pigeon.dimension.getPlayers().find(p => p.name == pigeon.getDynamicProperty("target_name"));
            if (target) {
                pigeon.teleport(target.location, { dimension: target.dimension });
                dropAll(pigeon.getComponent("inventory").container, pigeon.dimension, target.location);
                target.sendMessage({
                    translate: "chat.billeys_mobs.received_pigeon",
                    with: {
                        rawtext: [
                            { text: pigeon.getDynamicProperty("owner_name") },
                            nameOf(pigeon)
                        ]
                    }
                });
            }
            else {
                player?.sendMessage({
                    translate: "chat.billeys_mobs.player_left",
                    with: [pigeon.getDynamicProperty("target_name")]
                });
                pigeon.triggerEvent("abort_mission");
            }
            break;
        case "finish":
            if (player) {
                player.sendMessage({ translate: "chat.billeys_mobs.pigeon_success" });
                player.dimension.playSound("random.level", player.location);
                pigeon.teleport(player.location, { dimension: player.dimension })
            }
            else {
                pigeon.teleport(
                    pigeon.getDynamicProperty("original_location"),
                    { dimension: world.getDimension(pigeon.getDynamicProperty("original_dimension")) }
                );
            }
            break;
        case "abort":
            if (player) {
                player.sendMessage({ translate: "chat.billeys_mobs.pigeon_fail" });
                pigeon.teleport(player.location, { dimension: player.dimension });
            }
            else {
                pigeon.teleport(
                    pigeon.getDynamicProperty("original_location"),
                    { dimension: world.getDimension(pigeon.getDynamicProperty("original_dimension")) }
                );
            }
            break;
    }
});

/**
 * @param {Player} player
 * @param {Entity} mob
 * @param {ItemStack} item
 * @param {Dimension} dimension
 */
export function addItemToPigeon(player, mob, item, dimension) {
    let container = mob.getComponent("inventory").container;
    if (item.typeId.includes("shulker_box") || item.typeId.includes("backpack")
        || (item.lockMode != ItemLockMode.none))
        player.sendMessage({ translate: "chat.billeys_mobs.no" });
    else if (container.emptySlotsCount) {
        container.addItem(item);
        player.getComponent("equippable").setEquipment("Mainhand", undefined);
        dimension.playSound("armor.equip_generic", mob.location);
    }
    else {
        dropAll(container, dimension, mob.location);
    }
}

/**
 * @param {Player} player
 * @param {Entity} pigeon
 * @param {Dimension} dimension
 */
export function pigeonUI(player, pigeon, dimension) {
        const players = dimension.getPlayers({ minDistance: 32, location: pigeon.location });
        if (!players.length) return;
        const form = new ModalFormData();
        const playerNames = players.map(p => p.name);
        form.title({ translate: "ui.billeys_mobs.select_player" })
            .dropdown("", playerNames, { defaultValueIndex: 0 })
            .show(player)
            .then(e => {
                if (e.canceled) return;
                if (players[e.formValues[0]].isValid) {
                    pigeon.triggerEvent("start_mission");
                    pigeon.setDynamicProperty("target_name", playerNames[[e.formValues[0]]]);
                    pigeon.setDynamicProperty("original_location", pigeon.location);
                    pigeon.setDynamicProperty("original_dimension", pigeon.dimension.id);
                }
                else player.sendMessage({
                    translate: "chat.billeys_mobs.player_left",
                    with: playerNames[[e.formValues[0]]]
                });
            });
}