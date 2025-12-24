import { system, world } from "@minecraft/server";
import { nameOf } from "./utility";

const INSULTS = [
    "L",
    "ez",
    "get rekt",
    "lol",
    "lmao"
];

world.afterEvents.entityDie.subscribe(
    ({ damageSource }) => {
        const { damagingEntity } = damageSource;
        if (
            !damagingEntity?.isValid
            ||
            !damagingEntity.typeId.startsWith("billey:")
            ||
            damagingEntity.typeId == "billey:duck_centipede"
            ||
            damagingEntity.typeId == "billey:rat_king"
            ||
            damagingEntity.typeId == "billey:rat_minion"
            ||
            damagingEntity.typeId == "billey:yutyrannus"
            ||
            damagingEntity.typeId == "billey:duckatrice_boss"
        )
            return;

        const damagerName = nameOf(damagingEntity);

        /** @type {number} */
        const insultIndex = world.getDynamicProperty("next_insult_index") ?? 0;
        const insult = INSULTS[insultIndex];

        system.runTimeout(
            () => world.sendMessage([
                "<",
                damagerName, //damagerName is not a string but rather a RawMessage
                "> " + insult
            ]),
            20
        );

        world.setDynamicProperty(
            "next_insult_index",
            (insultIndex + 1) % INSULTS.length
        );
    },
    {
        entityTypes: ["minecraft:player"]
    }
);