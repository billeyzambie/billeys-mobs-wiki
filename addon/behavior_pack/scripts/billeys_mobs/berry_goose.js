import { Player, system, world } from "@minecraft/server";
import { playSoundAtEntity } from "./utility";

world.afterEvents.entityHurt.subscribe(({ hurtEntity, damage, damageSource }) => {
    const damager = damageSource.damagingEntity;
    if (
        !damager?.isValid
        || !hurtEntity?.isValid
        || damageSource.cause != "entityAttack"
        || damage <= 0
        || (
            hurtEntity.typeId != "billey:berry_goose"
            && (
                !hurtEntity instanceof Player
                || !(hurtEntity.getDynamicProperty("gooseberry_thorn_time") > 0)
            )
        )
    ) {
        return;
    }
    let thornDamageAmount;
    if (hurtEntity instanceof Player) {
        const gooseberryThornTime = hurtEntity.getDynamicProperty("gooseberry_thorn_time");
        thornDamageAmount = Math.max(1, gooseberryThornTime / 600);
        playSoundAtEntity(hurtEntity, "billey.goose.say", { pitch: 0.6 + 0.2 * Math.random() })
    }
    else {
        thornDamageAmount = hurtEntity.getProperty("billey:level") ?? 1;
        thornDamageAmount = Math.floor(thornDamageAmount * 1.5);
    }
    damager.applyDamage(thornDamageAmount, { cause: "entityAttack", damagingEntity: hurtEntity });
});

/** @param {Player} player  */
export function tickGooseberryThorns(player) {
    const prevTime = player.getDynamicProperty("gooseberry_thorn_time");
    player.setDynamicProperty("gooseberry_thorn_time", prevTime - 1);
}

system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent("billey:potion_3",
        {
            onConsume: ({ source, itemStack }) => {
                const effectName = itemStack.typeId.slice(7, -9);
                const effectDuration = effectName == "instant_health" ? 1 : 1200;
                source.addEffect(effectName, effectDuration, { amplifier: 2 });
            }
        }
    );
});