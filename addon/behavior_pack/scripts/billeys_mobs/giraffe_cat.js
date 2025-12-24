import { Block, Entity, EntityDamageCause, EntityMarkVariantComponent, LiquidType, Player, system, TicksPerSecond, world } from "@minecraft/server";
import { add, clamp, getDistanceXYZ, getDistanceXZ, playSoundAtEntity, scale, subtract } from "./utility";
import { refreshBravery } from "./pet_equipment/_index";
import { addPetLevelingXP } from "./leveling";

/** @type {Entity|undefined} */
let parent;
/** @type {Entity|undefined} */
let otherParent;

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
    if (!sourceEntity?.isValid)
        return;

    switch (id) {
        case "billey:giraffe_cat_born_parent":
            parent = sourceEntity;
            return;
        case "billey:giraffe_cat_born_other":
            otherParent = sourceEntity;
            return;
        case "billey:giraffe_cat_born_baby":

            if (parent.typeId == "minecraft:cat" && otherParent.typeId == "billey:giraffe_cat") {
                sourceEntity.setProperty(
                    "billey:variant",
                    parent.getComponent("variant")?.value ?? 0
                );
                sourceEntity.setProperty(
                    "billey:is_cat_hybrid",
                    true
                );
                const health = sourceEntity.getComponent("health");
                health.setCurrentValue(health.effectiveMax);
            }
            else if (otherParent.typeId == "minecraft:cat" && parent.typeId == "billey:giraffe_cat") {
                sourceEntity.setProperty(
                    "billey:variant",
                    otherParent.getComponent("variant")?.value ?? 0
                );
                sourceEntity.setProperty(
                    "billey:is_cat_hybrid",
                    true
                );
                const health = sourceEntity.getComponent("health");
                health.setCurrentValue(health.effectiveMax);
            }
            else if (Math.random() < 0.5) {
                sourceEntity.setProperty(
                    "billey:variant",
                    parent.getProperty("billey:variant")
                );
                sourceEntity.setProperty(
                    "billey:is_cat_hybrid",
                    parent.getProperty("billey:is_cat_hybrid")
                );
            }
            else {
                sourceEntity.setProperty(
                    "billey:variant",
                    otherParent.getProperty("billey:variant")
                );
                sourceEntity.setProperty(
                    "billey:is_cat_hybrid",
                    otherParent.getProperty("billey:is_cat_hybrid")
                );
            }

            if (Math.random() < 0.5) {
                sourceEntity.setProperty(
                    "billey:has_snout",
                    parent.getProperty("billey:has_snout") ?? true
                );
            }
            else {
                sourceEntity.setProperty(
                    "billey:has_snout",
                    otherParent.getProperty("billey:has_snout") ?? true
                );
            }

            return;
        case "billey:giraffe_cat_start_ladder": {
            const { location, dimension } = sourceEntity;
            const owner = sourceEntity.getComponent("tameable").tamedToPlayer;
            const roundedOwnerYRot = Math.round(owner.getRotation().y / 45) * 45;

            playSoundAtEntity(sourceEntity, "billey.grow");

            sourceEntity.teleport(
                {
                    x: Math.floor(location.x) + 0.5,
                    y: location.y,
                    z: Math.floor(location.z) + 0.5
                },
                {
                    rotation: {
                        x: 0,
                        y: roundedOwnerYRot
                    }
                }
            );

            let blockInFront = sourceEntity.dimension.getBlock(add(sourceEntity.location,
                { x: -Math.sin(roundedOwnerYRot * Math.PI / 180), y: 1, z: Math.cos(roundedOwnerYRot * Math.PI / 180) }
            ));
            let blockAbove = sourceEntity.dimension.getBlock(add(sourceEntity.location,
                { x: 0, y: 1, z: 0 }
            ));


            if (isSolidOrSlabOrLeaves(blockAbove.above()) || isSolidOrSlabOrLeaves(blockAbove)) {
                sourceEntity.triggerEvent("stop_ladder");
                return;
            }

            if (!isSolidOrSlabOrLeaves(blockInFront))
                return;

            blockAbove = blockAbove.above();

            for (let ladderHeight = 2; ladderHeight <= 64; ladderHeight++) {
                if (location.y + ladderHeight >= dimension.heightRange.max) {
                    sourceEntity.setProperty("billey:ladder_height", ladderHeight);
                    return;
                }

                blockInFront = blockInFront.above();
                blockAbove = blockAbove.above();
                if (
                    (
                        !isSolidOrSlabOrLeaves(blockInFront)
                        && !isSolidOrSlabOrLeaves(blockInFront.above())
                    )
                    || isSolidOrSlabOrLeaves(blockAbove)
                    || ladderHeight == 64
                ) {
                    sourceEntity.setProperty("billey:ladder_height", ladderHeight);
                    return;
                }
            }

            return;
        }
        case "billey:giraffe_cat_increment_ladder": {
            const currentHeight = sourceEntity.getProperty("billey:ladder_height");
            if (currentHeight >= 64)
                return;

            const blockAbove = sourceEntity.dimension.getBlock({
                ...sourceEntity.location,
                y: sourceEntity.location.y + currentHeight + 1
            });

            if (!blockAbove || isSolidOrSlabOrLeaves(blockAbove))
                return;

            sourceEntity.setProperty("billey:ladder_height", currentHeight + 1);
            playSoundAtEntity(sourceEntity, "billey.grow2", { pitch: 1 + Math.random() / 5 - 0.1 });

            return;
        }
        case "billey:giraffe_cat_stop_ladder":
            playSoundAtEntity(sourceEntity, "billey.shrink");
            return;
        case "billey:giraffe_cat_digging_stopped":
            const health = sourceEntity.getComponent("health");
            if (!sourceEntity.getProperty("billey:is_on_dirt") || health.currentValue < health.defaultValue)
                return;

            const giraffeCatYRot = sourceEntity.getRotation().y;
            const dugOutMobLocation = add(sourceEntity.location,
                { x: -Math.sin(giraffeCatYRot * Math.PI / 180), y: 0, z: Math.cos(giraffeCatYRot * Math.PI / 180) }
            );

            let totalWeight = 0;
            for (const burrowingMobInfo of BURROWING_MOB_INFOS) {
                const weight = burrowingMobInfo.weight;
                totalWeight += weight;
            }

            const random = Math.random() * totalWeight;

            let weightAddedSoFar = 0;
            for (const burrowingMobInfo of BURROWING_MOB_INFOS) {
                const weight = burrowingMobInfo.weight;

                if (weightAddedSoFar <= random && random < weightAddedSoFar + weight) {
                    const dugOutMob = sourceEntity.dimension.spawnEntity(
                        burrowingMobInfo.typeId,
                        dugOutMobLocation
                    );
                    dugOutMob.applyDamage(1, { cause: "entityAttack", damagingEntity: sourceEntity });
                    dugOutMob.applyImpulse({ x: 0, y: 0.05, z: 0 });
                    return;
                }

                weightAddedSoFar += weight;
            }

            return;

        case "billey:giraffe_cat_decrement_ladder":
            playSoundAtEntity(sourceEntity, "billey.shrink2", { pitch: 1 + Math.random() / 5 - 0.1 });
            return;

        case "billey:giraffe_cat_try_start_yeet":
            if (sourceEntity.getProperty("billey:is_digging") || sourceEntity.getProperty("billey:is_yeeting") || sourceEntity.hasComponent("is_baby"))
                return;

            const rideable = sourceEntity.getComponent("rideable");
            if (sourceEntity.target) {
                const owner = sourceEntity.getComponent("tameable").tamedToPlayer;

                const nearbyEntities = sourceEntity.dimension.getEntities({
                    location: sourceEntity.location,
                    maxDistance: 2.5,
                    tags: ["tamed"]
                });

                for (const entity of nearbyEntities) {
                    if (
                        entity.typeId != "billey:giraffe_cat"
                        && entity.getProperty("billey:follow_owner_state") == "following"
                        && !entity.getProperty("billey:is_sitting")
                        && !entity.getComponent("riding")?.entityRidingOn
                        && owner
                        && owner == entity.getComponent("tameable").tamedToPlayer
                    ) {
                        if (!entity.getComponent("type_family").hasTypeFamily("mob")) {
                            world.sendMessage(`§cEntity type ${entity.typeId} does not have the mob type family. Please let Bill know.`)
                            return;
                        }
                        sourceEntity.triggerEvent("start_yeeting");
                        rideable.addRider(entity);
                        sourceEntity.addEffect("slowness", 2 * TicksPerSecond, { amplifier: 255, showParticles: false });

                        const target = sourceEntity.target ?? entity.target;
                        sourceEntity.teleport(sourceEntity.location, { facingLocation: target.location });

                        return;
                    }
                }
            }
            else {
                rideable.ejectRiders();
            }
            return;

        case "billey:giraffe_cat_yeet": {
            const rideable = sourceEntity.getComponent("rideable");
            const rider = rideable.getRiders()[0];
            if (!rider)
                return;

            rideable.ejectRiders();

            const target = sourceEntity.target ?? rider.target;
            if (target) {
                sourceEntity.teleport(sourceEntity.location, { facingLocation: target.location });

                playSoundAtEntity(
                    sourceEntity,
                    "random.bow",
                    { pitch: 0.6 + Math.random() / 5 - 0.1, volume: 2 }
                );
                const yeetTime = 20;

                const targetApproximateFutureLocation = add(
                    target.location,
                    scale(target.getVelocity(), yeetTime)
                );

                yeetEntityTo(rider, targetApproximateFutureLocation, yeetTime);
                rider.__damageEntityAfterYeet = target;
                rider.__giraffeCat = sourceEntity;

                rider.addTag("billey:brave");
                rider.setDynamicProperty("refresh_bravery_on_target_escape", true);
            }

            return;
        }
    }
});

world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
    if (eventId == "billey:pet_target_escape"
        && entity.isValid)
        refreshBraveryOnLoad({ entity });

});

const refreshBraveryOnLoad = world.afterEvents.entityLoad.subscribe(({ entity }) => {
    if (entity.isValid && entity.getDynamicProperty("refresh_bravery_on_target_escape")) {
        refreshBravery(entity);
        entity.setDynamicProperty("refresh_bravery_on_target_escape", undefined);
    }
});

/**
 * 
 * @param {Block} block 
 * @returns {boolean}
 */
function isSolidOrSlabOrLeaves(block) {
    return block?.isValid
        && !block.isAir
        && (
            block.isSolid
            || block.typeId.includes("slab")
            || block.typeId.includes("leaves")
        );
}

/**
 * @param {Entity} giraffeCat
 */
export function giraffeCatTick(giraffeCat) {
    if (system.currentTick % 5 == 0)
        giraffeCatOnDirtTick(giraffeCat);
    giraffeCatBendOverTick(giraffeCat);
    if (giraffeCat.getProperty("billey:is_ladder"))
        giraffeCatLadderTick(giraffeCat);

}
/**
 * @param {Entity} giraffeCat
 */
function giraffeCatOnDirtTick(giraffeCat) {
    const { location, dimension } = giraffeCat;
    const { min, max } = dimension.heightRange;
    if (location.y > max || location.y < min + 1) {
        giraffeCat.setProperty("billey:is_on_dirt", false);
        return;
    }
    const blockBelowCat = dimension.getBlock({
        x: location.x,
        y: location.y - 1,
        z: location.z
    });

    if (!blockBelowCat)
        return;

    giraffeCat.setProperty("billey:is_on_dirt",
        blockBelowCat.hasTag("dirt")
    );
}

/**
 * @param {Entity} giraffeCat
 */
function giraffeCatBendOverTick(giraffeCat) {
    const { location, dimension } = giraffeCat;
    const { min, max } = dimension.heightRange;
    if (location.y > max - 1 || location.y < min + 1) {
        giraffeCat.setProperty("billey:should_bend_over", false);
        return;
    }
    const blockAboveCat = dimension.getBlock(location)?.above();

    if (!blockAboveCat)
        return;

    giraffeCat.setProperty(
        "billey:should_bend_over",
        isSolidOrSlabOrLeaves(blockAboveCat)
    );
}

/**
 * @param {Entity} giraffeCat
 */
function giraffeCatLadderTick(giraffeCat) {
    const { location, dimension } = giraffeCat;
    const ladderHeight = giraffeCat.getProperty("billey:ladder_height");
    const yRot = giraffeCat.getRotation().y;
    const neckLocXZ = add(
        { x: -Math.sin(yRot * Math.PI / 180) * 0.4, z: Math.cos(yRot * Math.PI / 180) * 0.4 },
        location
    );

    dimension.getPlayers({ location: location, maxDistance: 64 }).forEach(player => {
        if (
            getDistanceXZ(neckLocXZ, player.location) < 0.6
            && player.location.y >= location.y
            && player.location.y < location.y + ladderHeight
        ) {
            if (player.isJumping) {
                player.addEffect("levitation", 5, { amplifier: 2, showParticles: false });
                player.__climbingGiraffeCat = giraffeCat;
            }
            else
                player.addEffect("slow_falling", 5, { amplifier: 0, showParticles: false });
        }
    });
}

/**
 * @param {Player} player 
 */
export function playerLandAfterClimbingGiraffeCat(player) {
    /** @type {Entity} */
    const giraffeCat = player.__climbingGiraffeCat;
    if (
        giraffeCat.isValid
        && giraffeCat.getProperty("billey:is_ladder")
        && player.location.y > giraffeCat.location.y
        && giraffeCat.getComponent("tameable").tamedToPlayer == player
        && giraffeCat.getProperty("billey:follow_owner_state") == "following"
    ) {
        giraffeCat.teleport(player.location, { dimension: player.dimension });
        giraffeCat.triggerEvent("stop_ladder");
        giraffeCat.triggerEvent("remove_sittable");
        system.run(() => giraffeCat.triggerEvent("add_sittable"));
    }
    player.__climbingGiraffeCat = undefined;
}

/** @type {{typeId: string, weight: number}[]} */
let BURROWING_MOB_INFOS = [
    { typeId: "billey:rat", weight: 2 },
    { typeId: "billey:hamster", weight: 3 },
    { typeId: "billey:kiwi", weight: 1 }
];

export function registerBurrowingMob({ typeId, weight }) {
    BURROWING_MOB_INFOS.push({ typeId, weight });
}

/*Other addons can register mobs giraffe cats can dig up by doing this when the world loads:
system.sendScriptEvent("billey:register_burrowing_mob", JSON.stringify({ typeId: "your:entity", weight: yourNumber }))
The weight doesn't have to be an integer, also make sure to make it small if your mob is useless.
*/
system.afterEvents.scriptEventReceive.subscribe(({ id, message }) => {
    if (id == "billey:register_burrowing_mob") {
        registerBurrowingMob(JSON.parse(message));
    }
});

/** Vanilla Minecraft's gravitational acceleration in blocks per square tick */
const GRAVITATIONAL_ACCELERATION = -0.08;

/**
 * @param {Entity} thrownEntity 
 * @param {import("@minecraft/server").Vector3} targetLocation 
 * @param {number} timeInTicks The amount of time it should take for the entity to reach the targetLocation
 */
function yeetEntityTo(thrownEntity, targetLocation, timeInTicks) {
    const fromLocation = thrownEntity.location;

    const velocityY =
        targetLocation.y / timeInTicks
        - fromLocation.y / timeInTicks
        - 0.5 * GRAVITATIONAL_ACCELERATION * timeInTicks;

    const resultVelocity = {
        x: (targetLocation.x - fromLocation.x) / timeInTicks,
        y: velocityY,
        z: (targetLocation.z - fromLocation.z) / timeInTicks
    };
    thrownEntity.clearVelocity();
    thrownEntity.__yeetedVelocity = resultVelocity;

    if (thrownEntity.getProperty("billey:follow_owner_state") == "following") {
        thrownEntity.triggerEvent("eventwander_silent");
        thrownEntity.setDynamicProperty("follow_on_load", true);
    }

    MOBS_BEING_YEETED.push(thrownEntity);
}

const YEET_MOB_COLLISION_RADIUS = 2;

/** @type {Entity[]} */
let MOBS_BEING_YEETED = [];

/** Simulate simpler physics without air resistance for yeeted mobs */
function yeetedMobPhysics() {
    try {
        for (const mob of MOBS_BEING_YEETED) {
            if (!mob.isValid) {
                unyeetMob(mob);
                continue;
            }

            mob.clearVelocity();

            mob.__yeetedVelocity = add(mob.__yeetedVelocity, { x: 0, y: GRAVITATIONAL_ACCELERATION, z: 0 });

            const nextLocation = add(mob.__location ?? mob.location, mob.__yeetedVelocity);

            const blockAtNextLocation = mob.dimension.getBlock(nextLocation);
            if (
                !blockAtNextLocation.isValid
                || isSolidOrSlabOrLeaves(blockAtNextLocation)
                || (
                    mob.__damageEntityAfterYeet?.isValid
                    && getDistanceXYZ(mob.__damageEntityAfterYeet.location, mob.location) < YEET_MOB_COLLISION_RADIUS
                )
            ) {
                unyeetMob(mob);
                continue;
            }

            mob.teleport(nextLocation);

            mob.__location = mob.location;
        }
    }
    catch (e) {
        console.warn(e);
        MOBS_BEING_YEETED.forEach(unyeetMob);
    }
    system.run(yeetedMobPhysics);
}

//Start the loop
system.run(yeetedMobPhysics);

/** @param {Entity} mob  */
function unyeetMob(mob) {
    MOBS_BEING_YEETED = MOBS_BEING_YEETED.filter(m => m != mob);
    mob.__location = undefined;
    mob.__yeetedVelocity = undefined;
    /** @type {Entity} */
    const damageEntityAfterYeet = mob.__damageEntityAfterYeet;
    if (
        damageEntityAfterYeet?.isValid
        && mob.isValid
        && getDistanceXYZ(damageEntityAfterYeet.location, mob.location) < YEET_MOB_COLLISION_RADIUS
    ) {
        system.run(() => {
            /** @type {Entity|undefined} */
            const giraffeCat = mob.__giraffeCat;
            let minDamage = 3;
            if (giraffeCat?.isValid) {
                minDamage = getGiraffeCatAttackDamage(giraffeCat) / 2;
                addPetLevelingXP(giraffeCat, 0.3);
            }

            if (damageEntityAfterYeet.isValid && mob.isValid) {
                damageEntityAfterYeet.applyDamage(
                    Math.max(mob.getComponent("health").effectiveMax / 10, minDamage),
                    { cause: "entityAttack", damagingEntity: mob }
                );
            }
        });
    }
    mob.__damageEntityAfterYeet = undefined;
    mob.__giraffeCat = undefined;
    followSilently({ entity: mob });
}

const followSilently = world.afterEvents.entityLoad.subscribe(({ entity }) => {
    if (entity.getDynamicProperty("follow_on_load")) {
        entity.triggerEvent("eventfollow_silent");
        entity.setDynamicProperty("follow_on_load", undefined);
    }
});

/**
 * @param {Entity} giraffeCat
 */
function getGiraffeCatAttackDamage(giraffeCat) {
    const level = giraffeCat.getProperty("billey:level");

    const minLevel = 1;
    const maxLevel = 10;
    const minDamage = 6;
    const maxDamage = 25;

    const fraction = (level - minLevel) / (maxLevel - minLevel);
    const interpolatedDamage = minDamage + (maxDamage - minDamage) * fraction;

    return Math.round(interpolatedDamage);
}