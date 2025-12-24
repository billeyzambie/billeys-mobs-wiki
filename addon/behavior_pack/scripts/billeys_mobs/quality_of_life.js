import { world, system, Player, Entity, BlockVolume, InputPermissionCategory, EntityDamageCause } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { DIMENSIONS, floorVector, nameOf, titleCase, vectorToColorfulString, vectorToString } from "./utility";
import { xpOfNextLevel } from "./leveling";
import { calculateTotalEffectiveHappinessPercentage, calculateTotalEffectiveHappinessPercentage2, getAllHappinessIds, getMentalStateColor, getMentalStateName, MAX_HAPPINESS, valueToEffectiveValue } from "./happiness/happiness";
import { INFOLESS_PETS, showPetTypeInfo } from "./info_book";
import { listPetsToPlayerForm } from "./better_pet_owner_saving";
import { removePetFromDatabase } from "./pet_database";

world.afterEvents.entityDie.subscribe(
    ({ deadEntity }) => {
        if (!deadEntity.isValid)
            return;
        const chunkLoader = deadEntity.dimension.spawnEntity(
            "billey:chunk_loader",
            deadEntity.location
        );
        const subscription = world.afterEvents.playerSpawn.subscribe(({ player }) => {
            if (player.id != deadEntity.id)
                return;
            world.afterEvents.playerSpawn.unsubscribe(subscription);
            //tpAllFollowingPetsUsingStructure(player, chunkLoader);
            system.run(chunkLoader.remove);
        });
    },
    {
        entityTypes: ["minecraft:player"]
    }
);

/** @param {Player} player  */
export async function showSettingForm(player) {
    const form = new ModalFormData()
        .title({ translate: "ui.billeys_mobs.info.category.settings" })
        .toggle(
            { translate: "ui.billeys_mobs.settings.can_hit_own_pet" },
            { defaultValue: player.hasTag("billey:can_hit_own_pet") }
        )
        .toggle(
            { translate: "ui.billeys_mobs.settings.can_hit_other_pet" },
            { defaultValue: !player.hasTag("billey:cant_hit_other_pet") }
        )
        .textField(
            { translate: "ui.billeys_mobs.settings.double_sneak_seconds" },
            "0.5",
            { defaultValue: (player.getDynamicProperty("double_sneak_seconds") ?? 0.5).toString() }
        );
    const { canceled, formValues } = await form.show(player);
    if (canceled) return;
    if (formValues[0])
        player.addTag("billey:can_hit_own_pet");
    else
        player.removeTag("billey:can_hit_own_pet");
    if (formValues[1])
        player.removeTag("billey:cant_hit_other_pet");
    else
        player.addTag("billey:cant_hit_other_pet");

    const doubleSneakSecondsString = formValues[2];
    const doubleSneakSeconds = Number(doubleSneakSecondsString);
    if (!doubleSneakSecondsString) {
        player.setDynamicProperty("double_sneak_seconds", 0.5);
    }
    else if (!isNaN(doubleSneakSeconds) && doubleSneakSeconds > 0)
        player.setDynamicProperty("double_sneak_seconds", doubleSneakSeconds);
    else
        player.sendMessage({ translate: "chat.billeys_mobs.not_a_positive_number", with: [doubleSneakSecondsString] });
}

let nextXPushDirection = 1;
let nextZPushDirection = 1;
/** 
 * @param {Player} player The owner of the pets
 * @param {boolean} alwaysUnjumble Push the pet around even if it's only one
*/
export function tpAllFollowingPets(player, alwaysUnjumble) {
    for (const dimension of DIMENSIONS) {
        const followingPets = dimension
            /**
             * the tamed tag is added to all tamed billey mobs.
             * it was used back in the day when scripts didn't yet exist
             * to allow commands to detect if a mob is tamed or not,
             * eg. angel cats giving regeneration.
             * Here it wasn't needed but probably
             * slightly optimizes this function.
             */
            .getEntities({
                tags: ["tamed"]
            })
            .filter(entity =>
                entity.getProperty("billey:is_sitting") === false
                && entity.getComponent("tameable")?.tamedToPlayerId == player.id
                && isFollowingOwner(entity)
            );
        for (const pet of followingPets) {
            pet.teleport(player.location, { dimension: player.dimension });
            if (alwaysUnjumble || followingPets.length > 1)
                pushAround(pet);
        }
        //removeWaystoneLoader(player);
    }
}

/** 
 * @param {Player} player The owner of the pets
 * @param {Entity} chunkLoader 
 * Teleports all following pets by saving them as structures, deleting them, and then 
 * placing the structure. This fixes the invisible pet after tp vanilla bug
*/
export function tpAllFollowingPetsUsingStructure(player, chunkLoader, doNotRepeat) {
    /** @type {Entity[]} */
    const followingPets = [];
    const skyLocation = {
        x: player.location.x,
        y: player.dimension.heightRange.max - 1,
        z: player.location.z
    };
    for (const dimension of DIMENSIONS) {
        const dimensionFollowingPets = dimension
            .getEntities()
            .filter(entity =>
                entity.getProperty("billey:is_sitting") === false
                && entity.getComponent("tameable")?.tamedToPlayerId == player.id
                && isFollowingOwner(entity)
            );
        for (const pet of dimensionFollowingPets) {
            pet.teleport(skyLocation, { dimension: player.dimension });
            pet.setDynamicProperty("unjumble_on_load", true);
        }
        followingPets.push(...dimensionFollowingPets);
    }
    const { dimension } = player;
    const structureId = `billey:${player.id}_tped_pets`;
    if (world.structureManager.get(structureId))
        world.structureManager.delete(structureId);
    world.structureManager.createFromWorld(
        structureId,
        dimension, skyLocation, skyLocation
    );
    dimension.getEntitiesAtBlockLocation(skyLocation)
        .forEach(e => { if (!(e instanceof Player)) e.remove(); });
    world.structureManager.place(structureId, dimension, player.location, {
        includeBlocks: false
    });
    world.structureManager.delete(structureId);
    chunkLoader?.remove();
    removeWaystoneLoader(player);
    system.runTimeout(() => {
        if (!doNotRepeat) {
            tpAllFollowingPetsUsingStructure(player, undefined, true);
            system.run(() => {
                tpAllFollowingPets(player, true);
            });
        }
    }, 2);
}

world.afterEvents.entityLoad.subscribe(({ entity }) => {
    if (entity.getDynamicProperty("unjumble_on_load")) {
        pushAround(entity);
        entity.setDynamicProperty("unjumble_on_load", undefined);
    }
});

/**
 * @param {Entity} entity 
 */
function pushAround(entity) {
    const unitX = Math.random();
    const unitY = Math.sqrt(1 - unitX * unitX);
    const x = unitX / 2 * nextXPushDirection;
    const z = unitY / 2 * nextZPushDirection;
    if (Math.random() < 0.5)
        nextXPushDirection *= -1;
    else
        nextZPushDirection *= -1;
    entity.applyImpulse({ x, y: 0, z });
}

/** 
 * @param {Entity} pet
 */
function isFollowingOwner(pet) {
    if (!pet.isValid) {
        world.sendMessage(`§cError: The '${pet.typeId}' was not actually loaded. §ePlease let Bill know.`);
    }
    const followOwnerState = pet.getProperty("billey:follow_owner_state");
    if (followOwnerState == "unknown") {
        world.sendMessage(`§cError: Property 'billey:follow_owner_state' was 'unknown' on '${pet.nameTag}' the '${pet.typeId}' even though it was tamed. §ePlease let Bill know.`);
    }
    return followOwnerState == "following";
}

world.afterEvents.playerDimensionChange.subscribe(({ player }) => {
    tpAllFollowingPetsUsingStructure(player);
});

/** @param {Player} player */
export function removeWaystoneLoader(player) {
    const waystoneLoader = player.__waystoneLoader;
    /* @type {Entity|undefined} */
    if (waystoneLoader?.isValid)
        waystoneLoader.remove();
    player.__waystoneLoader = undefined;
}

world.afterEvents.entityLoad.subscribe(({ entity }) => {
    if (entity.typeId == "billey:chunk_loader")
        entity.remove();
});

world.afterEvents.playerInteractWithBlock.subscribe(({ block, player }) => {
    if (!block.isValid || !block.typeId.includes("waystone"))
        return;
    removeWaystoneLoader(player);
    player.__waystoneLoader = player.dimension.spawnEntity(
        "billey:chunk_loader",
        block.location
    );
});

world.afterEvents.entityHitEntity.subscribe(({ damagingEntity, hitEntity }) => {
    if (
        !(damagingEntity instanceof Player)
        || !damagingEntity.isSneaking
        || !hitEntity.typeId.startsWith("billey:")
        || (!hitEntity.getComponent("tameable")?.isTamed && !hitEntity.hasComponent("is_tamed"))
    ) {
        return;
    }

    const isOwner = damagingEntity == hitEntity.getComponent("tameable")?.tamedToPlayer;

    if (
        isOwner && damagingEntity.hasTag("billey:can_hit_own_pet")
        || !isOwner && !damagingEntity.hasTag("billey:cant_hit_other_pet")
    ) {
        return;
    }

    showPetStatForm(damagingEntity, hitEntity);
});

/**
 * @param {Player} player 
 * @param {Entity} pet 
 * @param {boolean} fromInfoBook 
 */
export async function showPetStatForm(player, pet, fromInfoBook) {
    const petIsEntity = pet instanceof Entity;
    const form = new ActionFormData();
    const petNameRawText = nameOf(pet);
    form.title(petNameRawText);
    let maxHealth;
    let currentHealth;
    if (petIsEntity) {
        const healthComponent = pet.getComponent("health");
        maxHealth = Math.round(Math.min(healthComponent.defaultValue, healthComponent.effectiveMax));
        currentHealth = Math.round(healthComponent.currentValue);
    }
    else {
        maxHealth = pet.maxHealth;
        currentHealth = pet.currentHealth;
    }
    const healthPercentage = currentHealth / maxHealth;
    let healthColor = "§a";
    if (healthPercentage >= 1)
        /* do nothing */;
    else if (healthPercentage < 0.25 || currentHealth < 5)
        healthColor = "§4";
    else if (healthPercentage < 0.5 || currentHealth < 8)
        healthColor = "§c";
    else if (healthPercentage < 0.75 || currentHealth < 11)
        healthColor = "§6";
    else if (healthPercentage < 1)
        healthColor = "§e";

    let happinessPercentage;
    if (petIsEntity)
        happinessPercentage = calculateTotalEffectiveHappinessPercentage2(pet);
    else
        happinessPercentage = pet.happinessPercentage;

    const mentalStateColor = getMentalStateColor(happinessPercentage);
    const mentalStateName = getMentalStateName(happinessPercentage);

    /** @type {import("@minecraft/server").RawMessage[]} */
    let body = [
        { translate: "ui.billeys_mobs.pet_stats.owner" },
        { text: `: §b${pet.getDynamicProperty?.("owner_name") ?? pet.ownerName}§r\n` },
        { translate: "ui.billeys_mobs.pet_stats.health" },
        { text: `: ${healthColor + currentHealth}§r / ${"§a" + maxHealth}§r\n` }
    ];
    let actions = [];

    /** @type {number|undefined} */
    const level = pet.getProperty?.("billey:level") ?? pet.level;
    if (level && !(pet.hasComponent?.("is_baby") ?? pet.isBaby)) {
        body.push(
            {
                translate: "ui.billeys_mobs.pet_stats.level",
                with: [level.toString()]
            },
            { text: "§r\n" }
        );
        if (level < 10) {
            const nextLevelXp = xpOfNextLevel(level);
            const thisLevelXp = xpOfNextLevel(level - 1);
            const currentXp = Math.min(
                Math.floor(10 * (pet.getProperty?.("billey:xp") ?? pet.xp)),
                nextLevelXp - 1
            );
            const xpLeft = nextLevelXp - currentXp;
            body.push(
                {
                    translate: "ui.billeys_mobs.pet_stats.xp",
                    with: [
                        (level + 1).toString(),
                        (currentXp - thisLevelXp).toString(),
                        (nextLevelXp - thisLevelXp).toString(),
                        xpLeft.toString()
                    ]
                },
                { text: "§r\n" }
            );
        }
    }

    body.push(
        {
            translate: "ui.billeys_mobs.pet_stats.mental_state",
            with: {
                rawtext: [
                    { text: mentalStateColor },
                    { translate: "ui.billeys_mobs.mental_state." + mentalStateName }
                ]
            }
        },
        { text: "§r\n" }
    );

    body.push(
        {
            translate: "ui.billeys_mobs.pet_stats.position",
            with: {
                rawtext: [
                    { text: vectorToColorfulString(floorVector(pet.location)) }
                ]
            }
        },
        { text: "§r\n" },
        {
            translate: "ui.billeys_mobs.pet_stats.dimension",
            with: {
                rawtext: [
                    { translate: pet.dimension.id.replace("minecraft:", "") }
                ]
            }
        }
    );

    if (!petIsEntity) body.push(
        {
            text: "§r\n\n§6"
        },
        {
            translate: "ui.billeys_mobs.pet_stats.not_loaded"
        }
    );

    if (!INFOLESS_PETS.has(pet.typeId)) {
        body.push(
            {
                text: "§r\n\n"
            },
            {
                translate: "ui.billeys_mobs.short_info." + pet.typeId.split(":")[1]
            }
        );

        form.button({ translate: "ui.billeys_mobs.pet_stats.learn_more" });
        actions.push(() => showPetTypeInfo(player, pet.typeId.split(":")[1]));
    }

    if (pet.getComponent?.("tameable")?.tamedToPlayer == player) {
        form.button({ translate: "ui.billeys_mobs.pet_stats.teleport_pet" });
        actions.push(() => {
            if (pet.isValid)
                pet.teleport(player.location, { dimension: player.dimension });
            else 
                player.sendMessage({ translate: "chat.billeys_mobs.pet_no_longer_exists", with: { rawtext: [petNameRawText] } });
        });
    }

    if (player.playerPermissionLevel > 0 || player.hasTag("is_op")) {
        form.button({ translate: "ui.billeys_mobs.pet_stats.teleport_to_pet", with: ["\n"] });
        actions.push(() => {
            const petDimension = world.getDimension(pet.dimension.id);
            if (pet.isValid || !petDimension.getBlock({ x: pet.location.x, y: 70, z: pet.location.z })?.isValid)
                player.teleport(pet.location, { dimension: petDimension });
            else {
                player.sendMessage({ translate: "chat.billeys_mobs.pet_no_longer_exists", with: { rawtext: [petNameRawText] } });
            }
        });
    }

    form.button({ translate: fromInfoBook ? "gui.back" : "ui.billeys_mobs.pet_stats.see_all_your_pets" });
    actions.push(() => listPetsToPlayerForm(player));

    form.body({ rawtext: body });
    let { selection, canceled } = await form.show(player);

    if (!canceled)
        actions[selection]();
}

/**
 * @param {Player} player 
 * @param {Entity} pet 
 */
async function showTechnicalDetailForm(player, pet) {
    const form = new ActionFormData();
    form.title({ translate: "ui.billeys_mobs.pet_stats.technical_details" });
    let body = [];
    const happinessPercentage = calculateTotalEffectiveHappinessPercentage2(pet);
    body.push({ text: `Total Happiness: ${(happinessPercentage).toFixed(2)}\n` });
    for (const happinessId of getAllHappinessIds()) {
        body.push({ text: `§r\n${happinessId}: ${((pet[happinessId].effectiveValue) / MAX_HAPPINESS).toFixed(2)}` });//(${((pet[happinessId].value) / MAX_HAPPINESS).toFixed(2)})
    }
    for (const dpid of pet.getDynamicPropertyIds()) {
        body.push({ text: `§r\n\n${dpid.replace("equipmentLegs", "equipmentBowtie")}: ${displayDynamicProperty(pet.getDynamicProperty(dpid))}` });
    }
    form.body({ rawtext: body });
    form.button({ translate: "gui.back" });
    form.button({ translate: "gui.ok" });

    const { selection } = await form.show(player);
    if (selection === 0)
        showPetStatForm(player, pet);
}

function displayDynamicProperty(a) {
    if (a instanceof Number)
        return a.toFixed(2);
    if (a.x != undefined)
        return vectorToString(a);
    return JSON.stringify(a);
}

world.afterEvents.dataDrivenEntityTrigger.subscribe(({ eventId, entity }) => {
    if (eventId == "say_owner_hit_pet_info") {
        entity.extinguishFire();
    }
});

world.afterEvents.entityDie.subscribe(({ damageSource, deadEntity }) => {
    const killer = damageSource.damagingEntity;
    if (!deadEntity.isValid || !killer?.isValid)
        return;
    if (killer.typeId.startsWith("billey:")) {
        const killerHealth = killer.getComponent("health");
        killerHealth.setCurrentValue(
            Math.min(killerHealth.currentValue + deadEntity.getComponent("health").effectiveMax / 5, killerHealth.effectiveMax)
        );
    }
});

world.afterEvents.entityHurt.subscribe(({ damageSource, hurtEntity }) => {
    if (!hurtEntity.isValid)
        return;

    if (damageSource.cause == "drowning"
        && hurtEntity.getProperty("billey:follow_owner_state") == "following"
    ) {
        const owner = hurtEntity.getComponent("tameable").tamedToPlayer;
        if (owner?.isValid) {
            hurtEntity.teleport(owner.location, { dimension: owner.dimension });
        }
    }

});