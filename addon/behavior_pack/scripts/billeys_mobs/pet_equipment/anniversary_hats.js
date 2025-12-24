import { world, system, Entity, ItemStack } from "@minecraft/server";
import { dropAllPetEquipment, getPetEquipmentId } from "./_index";
import { add, validateHeightOf } from "../utility";
import { registerPetEquipment } from "./registry";

registerPetEquipment("Head", "billey:anniversary_pet_hat_6",
    {
        isBrave: false,
        isDyeable: false
    }
);

import { Player } from "@minecraft/server";
import { ADVANCEMENTS } from "../advancement_list";

const ANNIVERSARY_CELEBRATION_END_DATE = new Date("2025-03-01T00:00:00Z");

export function getIsAnniversary() {
    return new Date() < ANNIVERSARY_CELEBRATION_END_DATE;
}

/**
 * @param {Player} player 
 */
export function giveAnniversaryPetHatsOfAlreadyDoneAdvancements(player) {
    let amountOfHats = 0;
    for (const adv of ADVANCEMENTS) {
        if (player.hasTag("billeyadv_" + adv.name))
            amountOfHats++;
    }
    if (amountOfHats) {
        const anniversaryPetHat = new ItemStack("billey:anniversary_pet_hat_6");
        anniversaryPetHat.setLore(["§r§b" + player.name]);
        anniversaryPetHat.setDynamicProperty("owner_name", player.name);
        anniversaryPetHat.setDynamicProperty("owner_id", player.id);
        for (let i = 0; i < amountOfHats; i++)
            player.dimension.spawnItem(anniversaryPetHat, player.location);
        player.sendMessage({
            translate: "chat.billeys_mobs.anniversary_got_advancements",
            with: [amountOfHats.toString()]
        });
    }
}