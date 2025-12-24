import { world, system, Player, Entity } from "@minecraft/server";
import { add, normalize, scale, subtract, validateHeightOf } from "./utility";
import { setKillNextLoad } from "./rat_potions";

system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity: entity, id, message }) => {
    switch (id) {
        case "billey:rat_minion_transform": {
            if (!entity?.isValid) return;
            let l = entity.location;
            const { min, max } = entity.dimension.heightRange;
            if (l.y < min + 0.5) l.y = min + 1;
            if (l.y > max - 0.5) l.y = max - 1;
            const structureId = "billey:" + entity.id;
            if (world.structureManager.get(structureId)) {
                setKillNextLoad(message && !entity.getDynamicProperty("of_rat_king"));
                world.structureManager.place(structureId, entity.dimension, l);
                world.structureManager.delete(structureId);
                entity.remove();
            }
            else entity.kill();
            return;
        }
        case "billey:rat_king_finish_cooking": {
            if (!entity?.isValid) return;
            entity.getComponent("rideable")?.getRiders()[0]?.remove();
            let loc = entity.location;
            loc.y += 1;
            if (!validateHeightOf(entity, loc.y)) return;
            let potionId;
            if (entity.getDynamicProperty("has_been_hit_by_mob") && entity.getProperty("billey:phase") > 1) {
                potionId = Math.random() < 0.33 ? "billey:rat_king_deter_potion" : "billey:rat_potion";
                entity.setDynamicProperty("has_been_hit_by_mob", false);
            }
            else if (Math.random() < 0.5)
                potionId = "billey:rat_king_deter_potion";
            else
                potionId = "billey:rat_king_boost_potion";
            const potion = entity.dimension.spawnEntity(potionId, loc);
            potion.getComponent("projectile").shoot({ x: 0, y: 0.5, z: 0 });
            potion.setDynamicProperty("of_rat_king", true); //only used by the rat potion
            return;
        }
        case "billey:set_health": {
            if (!entity?.isValid) return;
            if (entity.getDynamicProperty("cant_set_health")) return;
            entity.getComponent("health").setCurrentValue(message * 1);
            return;
        }
        case "billey:cant_set_health": {
            if (!entity?.isValid) return;
            entity.setDynamicProperty("cant_set_health", true);
            return;
        }
        case "billey:drop_target_equipment": {
            if (!entity?.isValid) return;
            const { target } = entity;
            if (!target?.isValid)
                return;
            dropMainhandEquipment(target, entity);
            return;
        }
    }
});

/** 
 * @param {Entity} target 
 * @param {Entity} robber 
 * */
function dropMainhandEquipment(target, robber) {
    const equippable = target.getComponent("equippable");
    if (!equippable)
        return;
    const itemStack = equippable.getEquipment("Mainhand");
    if (!itemStack || itemStack.lockMode != "none")
        return;
    if (!target.__justGotRobbed)
        equippable.setEquipment("Mainhand", undefined);
    target.__justGotRobbed = true;
    system.run(() => {
        const lol = normalize(subtract(
            robber.location,
            target.location
        ));
        const itemEntity = robber.dimension.spawnItem(itemStack, add(robber.location, lol));
        itemEntity.applyImpulse(
            scale(lol, 0.1)
        );
        target.__justGotRobbed = false;
    });
}

//clear the structure even if the rat minion is removed in an unusual way,
//eg. by /kill, or by a hypothetical addon with a "remove mob" item or something
world.afterEvents.entityRemove.subscribe(({ typeId, removedEntityId }) => {
    if (typeId == "billey:rat_minion")
        world.structureManager.delete("billey:" + removedEntityId);
});

world.afterEvents.entityHitEntity.subscribe(({ hitEntity, damagingEntity }) => {
    if (!hitEntity.isValid) return;
    if (damagingEntity.typeId == "billey:rat_king") {
        const { x, z } = normalize(subtract(hitEntity.location, damagingEntity.location));
        const phase = damagingEntity.getProperty("billey:phase");
        hitEntity.applyKnockback(
            {
                x: x * 0.5 * phase, z: z * 0.5 * phase
            },
            0.25 * phase
        );
        if (phase == 1)
            dropMainhandEquipment(hitEntity, damagingEntity);
    }
    else if (hitEntity.typeId == "billey:rat_king_chef_hitbox") {
        if (!(damagingEntity instanceof Player)) return;
        const ratKing = hitEntity.getComponent("riding").entityRidingOn;
        ratKing.triggerEvent("cooking_interrupted");
        hitEntity.remove();
        damagingEntity.onScreenDisplay.setActionBar("§aChef hit!");
        damagingEntity.playSound("random.orb");
        const chefHits = ratKing.getProperty("billey:chef_hits");
        if (chefHits < 2)
            ratKing.setProperty("billey:chef_hits", chefHits + 1);
    }
    else if (hitEntity.typeId == "billey:rat_king" && damagingEntity.typeId != "minecraft:player") {
        hitEntity.setDynamicProperty("has_been_hit_by_mob", true);
        if (damagingEntity.isValid)
            damagingEntity.addTag("billey:rat_king_target");
    }
});

world.afterEvents.entitySpawn.subscribe(({ entity }) => {
    if (entity.typeId != "minecraft:lightning_bolt") return;
    if (!entity.isValid) return;
    const { dimension, location } = entity;
    const player = dimension.getEntities({
        type: "minecraft:player",
        location: location,
        maxDistance: 16,
        closest: 1
    })[0];
    if (!player) return;
    const rats = [
        ...dimension.getEntities({
            type: "billey:rat",
            location: location,
            maxDistance: 10,
            closest: 5,
            tags: ["tamed"]
        }),
        ...dimension.getEntities({
            type: "billey:netherrat",
            location: location,
            maxDistance: 10,
            closest: 2,
            tags: ["tamed"]
        })
    ];
    if (rats.length < 7) return;
    for (const rat of rats) {
        /*
        save the variant of the rats as a temporary custom
        field so that getComponent is only called 7 times instead of 22.
        Hopefully helps with performance
        */
        rat.__variant = rat.getComponent("variant").value;
    }
    for (const rat of rats) for (const otherRat of rats) {
        if (rat == otherRat)
            continue;
        if (rat.typeId == otherRat.typeId && rat.__variant == otherRat.__variant)
            return;
    }
    let unnamedRatAmount = 0;
    for (const rat of rats) {
        if (rat.nameTag)
            world.sendMessage(rat.nameTag + " was sacrificed to the Rat King by " + player.name);
        else
            unnamedRatAmount++;
        rat.dimension.spawnParticle(
            "minecraft:explosion_particle",
            {
                x: rat.location.x,
                y: rat.location.y + 0.5,
                z: rat.location.z
            }
        );
        rat.remove();
    }
    if (unnamedRatAmount)
        world.sendMessage(unnamedRatAmount + " unnamed rats were sacrificed to the Rat King by " + player.name);
    dimension.spawnEntity("billey:rat_king", location);
});