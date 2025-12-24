import { world, system, TicksPerSecond, EffectTypes, ItemStack, Player, Entity, ContainerSlot, BlockPermutation, EntityTameMountComponent } from "@minecraft/server";
import { crossMagnitude, decrementStack, duckArmors, nameOf, playSoundAtEntity } from "./utility";
import { getPetEquipment, setPetEquipment, SLOTS } from "./pet_equipment/_index";
import { getAllHappinessIds } from "./happiness/happiness";
import { entityLoadHappiness } from "./version";
import { addOwnerAsDynamicProperty } from "./better_pet_owner_saving";

/**
 * @typedef {{
 *  speedAmplifier: number;
 *  duration: number;
 *  giveBottle: boolean;
 * }} BilleySweetInfo
*/

/**
 * This isn't an exact measure of sweetness but rather slightly
 * adjusted for gameplay balance.
 * Eg. chocolate catfish would probably taste like shit
 * but they're the "sweetest" because they're harder to get so it'd be more balanced
 * if they boosted duckatrices more.
 */
const SWEETNESS = {
    "billey:chocolate_catfish": {
        speedAmplifier: 5,
        duration: 10,
        giveBottle: false
    },
    "billey:ice_cream": {
        speedAmplifier: 4,
        duration: 4,
        giveBottle: false
    },
    "billey:poultry_orange": {
        speedAmplifier: 3,
        duration: 2,
        giveBottle: false
    },
    "billey:sand_banana": {
        speedAmplifier: 2,
        duration: 2,
        giveBottle: false
    },
    "billey:warped_wine": {
        speedAmplifier: 1,
        duration: 7.55,
        giveBottle: true
    },
    "billey:rat_beer": {
        speedAmplifier: 1,
        duration: 7.5,
        giveBottle: true
    }
};

const BILLEY_SWEETS = Object.keys(SWEETNESS);

world.beforeEvents.itemUse.subscribe(data => {
    const { source: player, itemStack } = data;
    const itemTypeId = itemStack.typeId;
    const duckatrice = player.getComponent("riding")?.entityRidingOn;
    if (
        !BILLEY_SWEETS.includes(itemTypeId)
        || duckatrice?.typeId != "billey:duckatrice"
    )
        return;
    data.cancel = true;
    /** @type {BilleySweetInfo} */
    const { duration, speedAmplifier, giveBottle } = SWEETNESS[itemTypeId];
    system.run(() => {
        duckatrice.addEffect("speed", 2 * duration * TicksPerSecond, { amplifier: (speedAmplifier + 2) * 3 + 3 * duckatrice.getProperty("billey:level") });
        decrementStack(player);
        playSoundAtEntity(duckatrice, "random.eat");
        playSoundAtEntity(duckatrice, "billey.duckatrice.summon", { pitch: 1.2 + speedAmplifier / 10 });
        if (giveBottle)
            system.runTimeout(() => player.dimension.spawnItem(new ItemStack("minecraft:glass_bottle"), player.location), 2);
    })
});

//do_event1

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity: duck }) => {
    if (!duck?.isValid)
        return;
    switch (id) {
        case "billey:duck_become_duckatrice": {
            const owner = duck.getComponent("tameable")?.tamedToPlayer;
            //if owner is offline
            if (!owner) {
                duck.triggerEvent("duckatrization_failed");
                duck.dimension.spawnItem(new ItemStack("billey:duckatrice_amber"), duck.location);
                return;
            }
            duck.addEffect("invisibility", 20000000, { showParticles: false });
            const duckatrice = duck.dimension.spawnEntity("billey:duckatrice", duck.location);
            system.runTimeout(() => {
                duckatrice.getComponent("tameable").tame(owner);
                addOwnerAsDynamicProperty(duckatrice);
            }, 2);
            //duckatrice.setRotation(duck.getRotation()); didn't really work
            duckatrice.teleport(duck.location, { rotation: duck.getRotation() })
            duckatrice.nameTag = duck.nameTag;
            duckatrice
            for (const dpid of duckatrice.getDynamicPropertyIds()) {
                duckatrice.setDynamicProperty(
                    dpid,
                    duck.getDynamicProperty(dpid)
                );
            }
            const variant = duck.getComponent("variant")?.value ?? 0;
            const markVariant = duck.getComponent("mark_variant")?.value;
            duckatrice.triggerEvent("set_variant" + variant);
            if (markVariant)
                duck.dimension.spawnItem(
                    new ItemStack(`billey:${duckArmors[markVariant]}_pet_armor`),
                    duck.location
                );
            if (duck.hasTag("billey:is_rainbow"))
                duckatrice.triggerEvent("kroma");
            for (const slot of SLOTS) {
                setPetEquipment(duckatrice, slot, getPetEquipment(duck, slot), true);
                const colorPropertyName = `billey:${slot.toLowerCase()}_equipment_color`;
                duckatrice.setProperty(
                    colorPropertyName,
                    duck.getProperty(colorPropertyName)
                );
            }

            entityLoadHappiness({ entity: duckatrice });
            for (const happinessId of getAllHappinessIds()) {
                duckatrice[happinessId].value = duck[happinessId].value;
            }

            playSoundAtEntity(duckatrice, "billey.grow");
            duck.dimension.getPlayers({
                location: duck.location,
                maxDistance: 10
            }).forEach(p => p.sendMessage({
                translate: "chat.billeys_mobs.levelup.duckatrice",
                with: { rawtext: [nameOf(duck), { text: "\n" }] }
            }));

            console.warn("No idea what causes these errors");
            duck.remove();
            return;
        }
        case "billey:duck_transform_frogspawn": {
            duck.addEffect("weakness", 10 * TicksPerSecond);
            system.runTimeout(() => {
                turnNearestFrogspawnToDuckatriceEgg(duck);
            }, 10 * TicksPerSecond);
            return;
        }
        case "billey:duckatrice_egg_hit": {
            const egg = duck;
            playSoundAtEntity(egg, "block.sniffer_egg.crack");
            return;
        }
        case "billey:duckatrice_start_hatching": {
            const egg = duck;
            playSoundAtEntity(egg, "block.sniffer_egg.crack");
            playSoundAtEntity(egg, "mob.zombie.remedy", { volume: 0.5 });
            playSoundAtEntity(egg, "billey.duckatrice.summon");
            return;
        }
        case "billey:duckatrice_hatched": {
            const egg = duck;
            egg.dimension.spawnParticle("minecraft:large_explosion", { x: egg.location.x, y: egg.location.y + 1, z: egg.location.z });
            playSoundAtEntity(egg, "random.explode");
            playSoundAtEntity(egg, "block.sniffer_egg.crack");
            egg.dimension.spawnEntity("billey:duckatrice_boss", egg.location);
            egg.remove();
            return;
        }
    }
});

/**
 * @param {Entity} duck
 */
function turnNearestFrogspawnToDuckatriceEgg(duck) {
    const dimension = duck.dimension;
    const entityPos = duck.location;
    //I know this looks ugly af but I wanted the first 7 ones to be first
    const offsets = [
        { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 },
        { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }, { x: 0, y: -1, z: 0 },
        { x: 1, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }, { x: 1, y: -1, z: 0 },
        { x: -1, y: -1, z: 0 }, { x: 1, y: 0, z: 1 }, { x: -1, y: 0, z: 1 },
        { x: 1, y: 0, z: -1 }, { x: -1, y: 0, z: -1 }, { x: 0, y: 1, z: 1 },
        { x: 0, y: -1, z: 1 }, { x: 0, y: 1, z: -1 }, { x: 0, y: -1, z: -1 },
        { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 }, { x: 1, y: -1, z: 1 },
        { x: -1, y: -1, z: 1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
        { x: 1, y: -1, z: -1 }, { x: -1, y: -1, z: -1 }
    ];

    for (const offset of offsets) {
        const blockPos = {
            x: entityPos.x + offset.x,
            y: entityPos.y + offset.y,
            z: entityPos.z + offset.z
        };
        const block = dimension.getBlock(blockPos);

        if (block && block.typeId == "minecraft:frog_spawn") {
            // Replace frogspawn with a duckatrice egg and exit loop (only converts the first one found)
            dimension.spawnEntity("billey:duckatrice_egg", blockPos);
            block.setPermutation(BlockPermutation.resolve("minecraft:air"));
            playSoundAtEntity(duck, "billey.grow", { pitch: 0.5 });
            return;
        }
    }
}

/**
 * Runs when someone pets a duckatrice (see ./interactions.js)
 * @param {Player} player 
 * @param {Entity} duckatrice 
 */
export function playerPetDuckatrice(player, duckatrice) {
    /** @type {number} */
    const playerHelmet = player.getComponent("equippable").getEquipment("Head");
    const duckatriceLevel = duckatrice.getProperty("billey:level");
    if (
        !playerHelmet
        || (
            playerHelmet.getDynamicProperty("duckatrice_stares")
            && duckatriceLevel <= playerHelmet.getDynamicProperty("duckatrice_stare_level")
        )
        || player.level == 0
    )
        return;
    player.addLevels(-3);
    playSoundAtEntity(player, "random.orb", { pitch: 0.9 });
    const levelRomanNumeral = ROMAN_NUMERALS[duckatriceLevel];
    playerHelmet.setLore([
        ...(playerHelmet.getLore().filter(s => !s.startsWith("§r§6Duckatrice's Stare"))),
        `§r§6Duckatrice's Stare ${levelRomanNumeral}§r`
    ]);
    playerHelmet.setDynamicProperty(
        "duckatrice_stares",
        128
    );
    playerHelmet.setDynamicProperty(
        "duckatrice_stare_level",
        duckatriceLevel
    );
    player.getComponent("equippable").setEquipment("Head", playerHelmet);
    player.sendMessage({ translate: "chat.billeys_mobs.duckatrice_stare_added", with: [levelRomanNumeral] });
}

const ROMAN_NUMERALS = [undefined, "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/**
 * @param {ContainerSlot} slot The slot of the helmet
 * @param {Player} player 
 */
export function decrementDuckatriceStares(slot, player) {
    const amount = slot.getDynamicProperty("duckatrice_stares");
    if (!amount || amount <= 1) {
        slot.setDynamicProperty("duckatrice_stares", undefined);
        slot.setDynamicProperty("duckatrice_stare_level", undefined);
        slot.setLore(
            slot.getLore().filter(s => !s.startsWith("§r§6Duckatrice's Stare"))
        );
        playSoundAtEntity(player, "random.break", { pitch: 1.5 });
        player.sendMessage({ translate: "chat.billeys_mobs.duckatrice_stare_ran_out" });
    }
    else
        slot.setDynamicProperty("duckatrice_stares", amount - 1);
}


/**
 * Runs when someone pets a duckatrice (see ./interactions.js)
 * @param {Player} player 
 * @param {ContainerSlot} helmetSlot
 */
export function duckatriceStareDamage(helmetSlot, player) {
    const raycast = player.getEntitiesFromViewDirection()[0];
    if (
        raycast
        && raycast.distance < 7
        && !(raycast.entity instanceof Player)
        && raycast.entity.target?.id == player.id
    ) {
        /*Level 1 deals 1 damage, level 10 deals 4 damage, 
          and everything in between linearly deals something in between*/
        raycast.entity.applyDamage(
            2 / 3 + 1 / 3 * helmetSlot.getDynamicProperty("duckatrice_stare_level"),
            { cause: "entityAttack", damagingEntity: player }
        );
        decrementDuckatriceStares(helmetSlot, player);
    }
}

/**
 * @param {Player} player 
 * @param {Entity} hostileDuck Duckatrice Boss or Duck Minion
 */
export function duckatriceBossStare(player, hostileDuck) {
    if (
        hostileDuck.target != player
        //|| Math.abs(player.getRotation().x - duckatrice.getRotation().x) > 30
    )
        return;

    const isMinion = hostileDuck.typeId.endsWith("_minion");
    player.applyDamage(
        player.__duckatriceStareTime,
        { cause: "entityAttack", damagingEntity: hostileDuck }
    );
    const hostileDuckHealth = hostileDuck.getComponent("health");
    hostileDuckHealth.setCurrentValue(
        hostileDuckHealth.currentValue + 6 * player.__duckatriceStareTime
    );
    if (isMinion) {

        let bossHealth;
        if (hostileDuck.getComponent("variant").value == 1) {
            bossHealth = hostileDuck.dimension.getEntities({
                type: "billey:duckatrice_boss",
                closest: 1,
                location: hostileDuck.location,
                maxDistance: 48
            })[0]?.getComponent("health");
        }
        else {
            bossHealth = world.getEntity(hostileDuck.getDynamicProperty("crowned_rat_id"))?.getComponent("health");
        }

        bossHealth?.setCurrentValue(
            bossHealth.currentValue + 4 * player.__duckatriceStareTime
        );
        player.onScreenDisplay.setActionBar({
            translate: "chat.billeys_mobs.stop_staring_at_duck_minion" + (
                bossHealth ? 2 : ""
            )
        });
    }
    else
        player.onScreenDisplay.setActionBar({ translate: "chat.billeys_mobs.stop_staring_at_duckatrice" });
    player.__duckatriceStareTime++;
}

world.afterEvents.itemStartUseOn.subscribe(({ source, itemStack }) => {
    if (
        itemStack?.typeId != "billey:duckatrice_spawn_egg"
        || source.hasTag("billeyinfoduckatrice")
    )
        return;
    source.sendMessage({ translate: "ui.billeys_mobs.short_info.duckatrice" });
    source.playSound("random.orb");
    source.addTag("billeyinfoduckatrice");
});