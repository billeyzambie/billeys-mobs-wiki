import { EntityDamageCause, TicksPerSecond, world } from "@minecraft/server";

world.afterEvents.projectileHitEntity.subscribe(data => {
    const { projectile, source } = data;
    const target = data.getEntityHit().entity;
    if (
        projectile.typeId != "billey:end_rod_projectile"
        || !source?.isValid
        || !target?.isValid
        || (target != source.target && target.target != source)
    ) {
        return;
    }

    target.applyDamage(2, {
        damagingEntity: source,
        cause: EntityDamageCause.entityAttack
    });

    target.addEffect("weakness", 10 * TicksPerSecond, { amplifier: 1 });
});