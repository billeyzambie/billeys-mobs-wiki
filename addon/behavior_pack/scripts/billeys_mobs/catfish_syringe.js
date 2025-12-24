import { world, system, Player, TicksPerSecond, ContainerSlot, Entity, ItemStack, EntityTypes } from "@minecraft/server";
import { detrimentalEffects, playSoundAtEntity } from "./utility";

/**
 * @type {Player}
 */
let catfishInjector;

system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity, id }) => {
    switch (id) {
        case "billey:set_catfish_injector":
            catfishInjector = sourceEntity;
            return;
        case "billey:catfish_syringe_used":
            sourceEntity.applyDamage(3, {
                cause: "entityAttack",
                damagingEntity: catfishInjector
            });
            if (!sourceEntity.getComponent("is_tamed")) return;
            catfishInjector.getComponent("equippable")
                .setEquipment("Mainhand", new ItemStack("billey:catfish_blood"));
            catfishInjector = undefined;
            return;
        case "billey:shame_bucket_mercat":
            if (world.getAllPlayers().length == 1) return;
            world.sendMessage(`SHAME ON §c${sourceEntity.name.toUpperCase()}§r for trying to crash the server by bucketing a yellow or pink mercat!`);
            return;
    }
});

world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
    if (itemStack.typeId == "billey:catfish_antibodies" && source.getEffects().length)
        useCatfishAntibodies(
            source,
            source.getComponent("equippable").getEquipmentSlot("Mainhand")
        );
});

world.beforeEvents.playerInteractWithEntity.subscribe(data => {
    const { player, itemStack, target } = data;
    if (itemStack?.typeId == "billey:catfish_antibodies" && target.getEffects().length) {
        data.cancel = true;
        system.run(() => useCatfishAntibodies(
            target,
            player.getComponent("equippable").getEquipmentSlot("Mainhand"),
            player
        ));
    }
});

world.afterEvents.effectAdd.subscribe(({ entity, effect }) => {
    if (
        entity.immuneToEffects?.includes(effect.typeId)
        ||
        (entity.typeId == "billey:catfish" && detrimentalEffects.includes(effect.typeId))
    )
        entity.removeEffect(effect.typeId);
});

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (initialSpawn) {
        loadEffectImmunityData(player);
    }
    else if (player.effectImmunityStopId !== undefined && !world.gameRules.keepInventory)
        clearImmunities(player);
});

world.afterEvents.entityLoad.subscribe(({ entity }) =>
    loadEffectImmunityData(entity)
);

/**
 * @param {Entity} entity The entity that will get the effect immunity.
 * @param {ContainerSlot} slot The slot that contains the catfish antibodies item that will be deleted.
 * @param {Entity|undefined} injector The entity that injected it with catfish antibodies. Undefined if it is a player that injected itself.
 */
function useCatfishAntibodies(entity, slot, injector) {
    entity.immuneToEffects = entity.getEffects().map(e => e.typeId);
    if (entity.effectImmunityStopId !== undefined)
        system.clearRun(entity.effectImmunityStopId);
    entity.effectImmunityStopId = system.runTimeout(
        () => {
            if (entity.isValid)
                clearImmunities(entity);
        },
        600 * TicksPerSecond
    );
    entity.setDynamicProperty("immune_to_effects", JSON.stringify(entity.immuneToEffects));
    //entity.setDynamicProperty("time_to_stop_effect_immunity", Date.now() + 600 * 1000);
    entity.getEffects().forEach(effect => entity.removeEffect(effect.typeId));
    playSoundAtEntity(entity, "mob.sheep.shear");
    if ((injector ?? entity).getGameMode() != "Creative")
        slot.setItem(undefined);
    if (injector) {
        if (entity.getComponent("health").currentValue > 1)
            entity.applyDamage(1, {
                cause: "thorns"
            });
    }
    else entity.applyDamage(1, {
        cause: "thorns",
        damagingEntity: injector
    });
}

/**
 * @param {Entity} entity 
 */
function clearImmunities(entity) {
    entity.immuneToEffects = undefined;
    entity.setDynamicProperty("immune_to_effects", undefined);
    entity.effectImmunityStopId = undefined;
    //entity.setDynamicProperty("time_to_stop_effect_immunity", undefined);
}

/**
 * @param {Entity} entity 
 */
function loadEffectImmunityData(entity) {
    const immuneToEffects = entity.getDynamicProperty("immune_to_effects");
    if (!immuneToEffects) return;
    entity.immuneToEffects = JSON.parse(immuneToEffects);
    //const immunityTimeLeftInSeconds = (Date.now() - entity.getDynamicProperty("time_to_stop_effect_immunity") + Date.now() - world.getDynamicProperty("last_leave_time")) / 1000;
    entity.effectImmunityStopId = system.runTimeout(
        () => {
            if (entity.isValid)
                clearImmunities(entity);
        },
        300 * TicksPerSecond
        /**
         * As you can see I was going to make the actual time left of the immunity get saved,
         * but the code for it didn't work on first try so I decided that it wouldn't be worth the effort.
         * Instead, I made any saved effect immunity just last 5 minutes, which is good enough
         * to trick most players into thinking the actual time left was saved.
         */
    );
}
/*
world.afterEvents.playerLeave(() =>
    world.setDynamicProperty("last_leave_time", Date.now())
);*/