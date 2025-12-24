import { Entity, system, world } from "@minecraft/server";
import { getPetEquipmentId } from "./_index";
import { normalize, playSoundAtEntity, scale, subtract } from "../utility";

/*All plushies are automatically registered as pet head equipment in
the ../plushies.js file. Rubber duckies are technically plushies so
they don't need to be registered again here*/

world.afterEvents.entityHitEntity.subscribe(({ hitEntity, damagingEntity }) => {
    /** @type {Entity} */
    let rubberDuckyPet;
    /** @type {Entity} */
    let target;
    if (hitEntity.isValid
        && getPetEquipmentId(hitEntity, "Head") == "billey:rubber_ducky") {
        rubberDuckyPet = hitEntity;
        target = damagingEntity;
    }
    else if (damagingEntity.isValid
        && getPetEquipmentId(damagingEntity, "Head") == "billey:rubber_ducky") {
        rubberDuckyPet = damagingEntity;
        if (rubberDuckyPet.__rubberDuckying)
            return rubberDuckyPet.__rubberDuckying = false;
        target = hitEntity;
    }
    else {
        return;
    }

    if (hitEntity.getComponent("tameable")?.tamedToPlayer == damagingEntity)
        return;
    target.applyKnockback(
        scale(normalize(subtract(target.location, rubberDuckyPet.location)), 0.75),
        0.5
    );
    rubberDuckyPet.__rubberDuckying = true;
    rubberDuckyPet.playAnimation("animation.billeys_mobs.rubber_ducky.squish");
    playSoundAtEntity(rubberDuckyPet, "billey.duck.say", { pitch: 1.6 });
    if (rubberDuckyPet.typeId != "billey:slime_wyvern")
        system.runTimeout(() => {
            if (rubberDuckyPet.isValid) {
                if (target.isValid) {
                    target.applyKnockback(
                        scale(normalize(subtract(target.location, rubberDuckyPet.location)), 0.75),
                        0.5
                    );
                    target.applyDamage(3, { damagingEntity: rubberDuckyPet, cause: "entityAttack" });
                }
                else
                    rubberDuckyPet.__rubberDuckying = false;
            }
        }, 10);
});