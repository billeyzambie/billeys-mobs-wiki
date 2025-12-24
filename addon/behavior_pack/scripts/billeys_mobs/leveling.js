import { world, system, Player, Dimension, DataDrivenEntityTriggerAfterEvent, Entity, TicksPerSecond } from "@minecraft/server";
import { getPetEquipmentId } from "./pet_equipment/_index";
import { add, playSoundAtEntity } from "./utility";
import { calculateTotalEffectiveHappinessPercentage2 } from "./happiness/happiness";

world.afterEvents.entityHurt.subscribe(({ hurtEntity, damageSource, damage }) => {
    if (damage < 0.25 || hurtEntity instanceof Player || !hurtEntity.hasComponent("health"))
        return;
    const damager = damageSource.damagingEntity;
    if (!damager?.typeId.startsWith("billey:") || !damager.isValid)
        return;
    if (hurtEntity.typeId.includes("dummy"))
        return;
    //is minion and is friendly minion
    const isMinion = damager.typeId.endsWith("_minion") && damager.getComponent("variant")?.value == 2;
    //level can't be 0 so this is enough to test if it's undefined
    if ((!damager?.getProperty("billey:level") || damager.hasComponent("is_baby")) && !isMinion)
        return;
    let xpTarget = damager;
    let xpMultiplier = 1;
    if (isMinion) {
        xpTarget = damager.dimension.getEntities()
            .find(e => e.id == damager.getDynamicProperty("crowned_rat_id"));
        if (!xpTarget)
            return;
        xpMultiplier /= 4;
    }
    addPetLevelingXP(xpTarget, 0.6 * xpMultiplier, damager);
    if (!xpTarget.__isCheckingLevel)
        system.run(() => {
            xpTarget.triggerEvent("check_level");
            xpTarget.__isCheckingLevel = false;
        });
    xpTarget.__isCheckingLevel = true;

    if (
        damager.getComponent("type_family").hasTypeFamily("duck")
        && damager.getProperty("billey:level") >= 3
    ) {
        hurtEntity.addEffect("wither", 5 * TicksPerSecond);
    }
});

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
    if (!deadEntity.isValid || deadEntity instanceof Player || !deadEntity.hasComponent("health"))
        return;
    const damager = damageSource.damagingEntity;
    if (!damager?.typeId.startsWith("billey:") || !damager.isValid)
        return;
    if (deadEntity.typeId.includes("dummy"))
        return;
    //is minion and is friendly minion
    const isMinion = damager.typeId.endsWith("_minion") && damager.getComponent("variant").value == 2;
    //level can't be 0 so this is enough to test if it's undefined
    if ((!damager?.getProperty("billey:level") || damager.hasComponent("is_baby")) && !isMinion)
        return;
    let xpTarget = damager;
    let xpMultiplier = 1;
    if (isMinion) {
        xpTarget = damager.dimension.getEntities()
            .find(e => e.id == damager.getDynamicProperty("crowned_rat_id"))
        if (!xpTarget)
            return;
        xpMultiplier /= 4;
    }
    addPetLevelingXP(xpTarget, 1 * xpMultiplier, damager);
    if (!xpTarget.__isCheckingLevel)
        system.run(() => {
            xpTarget.triggerEvent("check_level");
            xpTarget.__isCheckingLevel = false;
        });
    xpTarget.__isCheckingLevel = true;
});

/**
 * @param {Entity} mob 
 * @param {number} amount 
 * @param {Entity|undefined} mobToTakeEffectsFrom 
 */
export function addPetLevelingXP(mob, amount, mobToTakeEffectsFrom) {
    mobToTakeEffectsFrom ??= mob;
    let multiplier = 1;
    if (getPetEquipmentId(mobToTakeEffectsFrom, "Head")?.startsWith("billey:anniversary_pet_hat"))
        multiplier *= 2;
    const happyPercentage = calculateTotalEffectiveHappinessPercentage2(mob);
    multiplier *= happyPercentage + 1;
    mob.setProperty(
        "billey:xp",
        mob.getProperty("billey:xp") + amount * multiplier
    );
}

/** @param {Entity} pet  */
function secondaryTargetsOf(pet) {
    const owner = pet.getComponent("tameable")?.tamedToPlayer;
    const count = pet.getProperty("billey:level") ?? 1;
    let i = 0;
    return pet.dimension.getEntities({
        location: pet.target?.location ?? pet.location, maxDistance: 10
    })
        .filter(e => (e.target == pet || e.target == owner
            || (e.getComponent("type_family")?.hasTypeFamily("monster") && !e.hasComponent("is_tamed")))
            && pet.target != e && !e.__isBeingFuried && i++ < count
        );
}

const FURY_STEP_TICKS = 2;

/** 
 * @param {Entity} pet
 * @param {Entity[]} targets 
*/
function fury(pet, targets) {
    const owner = pet.getComponent("tameable")?.tamedToPlayer;
    if (!owner || owner.dimension != pet.dimension)
        return;
    targets ??= secondaryTargetsOf(pet);
    const petTarget = pet.target;
    if (petTarget)
        targets = [...targets, petTarget];

    if (!targets.length)
        return;

    const duration = FURY_STEP_TICKS * targets.length;
    targets.forEach(e => {
        e.addEffect("slowness", duration, { amplifier: 255, showParticles: false });
        e.__isBeingFuried = true;
    });
    pet.addEffect("water_breathing", duration, { amplifier: 255, showParticles: false });
    let i = 0;
    const originalLocation = pet.location;
    function furyStep() {
        let target = targets[i];
        if (target.isValid) {
            let facingLocation;
            if (targets[i + 1]?.isValid) {
                facingLocation = targets[i + 1].location;
            }
            else {
                facingLocation = originalLocation;
            }
            pet.teleport(target.location, { facingLocation });
            target.applyDamage(25, {
                cause: "entityAttack",
                damagingEntity: pet
            });
            target.__isBeingFuried = undefined;
        }
        i++;
        if (i < targets.length)
            system.runTimeout(furyStep, FURY_STEP_TICKS);
        else
            system.runTimeout(
                () => playSoundAtEntity(pet, "billey.fury_end"),
                FURY_STEP_TICKS
            );

    }
    furyStep();
    playSoundAtEntity(pet, "billey.fury_start")
}

/*
world.beforeEvents.playerInteractWithEntity.subscribe(data => {
    const { target, itemStack } = data;
    if (itemStack?.typeId == "minecraft:emerald") {
        data.cancel = true;
        system.run(() =>
            fury(target)
        );
    }
});//put a * / (without the space) after this to turn fury back on

world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
    if (eventId != "billey:pet_target_acquired" || !entity.isValid)
        return;
    const level = entity.getProperty("billey:level");
    if (!level)
        return;
    const chance = (level / 9 - 1 / 9) ** 2;
    if (chance < Math.random())
        return;
    system.run(() => {
        const secondaryTargets = secondaryTargetsOf(entity);
        fury(entity, secondaryTargets);
    });
});

/** @param {number} level */
export function xpOfNextLevel(level) {
    return 100 * Math.floor(3 * level ** 1.5) + 100 * Math.floor(2.4 ** (level + 1) / 10);
}

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
    if (!sourceEntity?.isValid)
        return;
    switch (id) {
        case "billey:banana_duck_banana_xp": {
            addPetLevelingXP(sourceEntity, 2.5 / sourceEntity.getProperty("billey:level"));
            return;
        }
    }
});