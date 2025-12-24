import { world, system, Entity } from "@minecraft/server";
import { dropAllPetEquipment, getPetEquipmentId } from "./_index";
import { add, validateHeightOf } from "../utility";
import { registerPetEquipment } from "./registry";
import { addOwnerAsDynamicProperty } from "../better_pet_owner_saving";

registerPetEquipment("Head", "billey:rat_crown",
    {
        /**
         * Makes pets defend their owner even if they usually don't.
         * The isBrave property is true for all
         * pet equipment that makes the pet stronger.
         */
        isBrave: true,
        isDyeable: false
    }
);

world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
    if (eventId != "billey:pet_target_acquired"
        || !entity.isValid)
        return;
    if (getPetEquipmentId(entity, "Head") == "billey:rat_crown") {

        /**
         * @type {Entity[]}
         */
        let ratMinions = [];

        entity.dimension.getEntities({ families: ["rat_minion"] })
            .filter(r => r.getDynamicProperty("crowned_rat_id") == entity.id)
            .forEach(r => {
                r.getComponent("health").resetToMaxValue();
                ratMinions.push(r);
            });

        const prevMinionCount = ratMinions.length;

        if (!validateHeightOf(entity)) return;
        const crownedRatOwner = entity.getComponent("tameable").tamedToPlayer;
        const tpLocs = [
            { x: 1, y: 0, z: 1 },
            { x: 1, y: 0, z: -1 },
            { x: -1, y: 0, z: 1 },
            { x: -1, y: 0, z: -1 }
        ];
        const isDuckatrice = entity.typeId == "billey:duckatrice";
        for (let i = 0; i < tpLocs.length - prevMinionCount; i++) {
            let minionTypeId;
            if (isDuckatrice) {
                if (Math.random() < 0.05 && entity.getProperty("billey:level") >= 10)
                    minionTypeId = "billey:yutyrannus_minion";
                else if (Math.random() < 0.2 && entity.getProperty("billey:level") >= 6)
                    minionTypeId = "billey:deinonychus_minion";
                else if (Math.random() < 0.35 && entity.getProperty("billey:level") >= 3)
                    minionTypeId = "billey:pigeon_minion";
                else
                    minionTypeId = "billey:duck_minion";
            }
            else {
                minionTypeId = "billey:rat_minion";
            }
            const ratMinion = entity.dimension.spawnEntity(minionTypeId, entity.location, { spawnEvent: "from_crowned_rat" });
            ratMinions.push(ratMinion);
            ratMinion.setRotation(entity.getRotation());
            if (entity.nameTag)
                ratMinion.nameTag = "§7" + entity.nameTag + "§r";
            ratMinion.setDynamicProperty("crowned_rat_id", entity.id);
            ratMinion.addTag("tamed");
            ratMinion.tryTeleport(add(tpLocs[i], ratMinion.location), {
                checkForBlocks: true
            });
            if (!i) entity.target?.applyDamage(1, {
                damagingEntity: ratMinion,
                cause: "entityAttack"
            });
        }
        system.runTimeout(
            () => ratMinions.forEach(ratMinion => {
                //crownedRatOwner is undefined if the crowned rat's owner is offline
                //getComponent("tameable") was also undefined once, i forgot in what situation
                if (crownedRatOwner?.isValid) {
                    ratMinion.getComponent("tameable")?.tame(crownedRatOwner);
                    addOwnerAsDynamicProperty(ratMinion);
                }

                //make the rat minions angry at the crowned rat's target
                if (entity.isValid && entity.target) {
                    ratMinion.applyDamage(1, {
                        damagingEntity: entity.target,
                        cause: "entityAttack"
                    });
                    ratMinion.clearVelocity();
                    ratMinion.applyImpulse(entity.getVelocity());
                }
            }), 2
        );
    }
    if (entity.typeId.endsWith("_minion")) {
        const owner = entity.getComponent("tameable").tamedToPlayer;
        if (owner && owner == entity.target?.getComponent("tameable")?.tamedToPlayer)
            entity.triggerEvent("start_despawn");
    }
});

system.afterEvents.scriptEventReceive.subscribe(
    async ({ id, sourceEntity: ratMinion }) => {
        if (id != "billey:friendly_rat_minion_despawn" || !ratMinion?.isValid)
            return;
        await dropAllPetEquipment(ratMinion);
        ratMinionPoof(ratMinion);
    }
);

/** @param {Entity} ratMinion  */
function ratMinionPoof(ratMinion) {
    ratMinion.dimension.spawnParticle(
        "minecraft:explosion_particle",
        {
            x: ratMinion.location.x,
            y: ratMinion.location.y + 0.5,
            z: ratMinion.location.z
        }
    );
    ratMinion.remove();
}