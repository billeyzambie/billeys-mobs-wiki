import { Player } from "@minecraft/server";
import { getAllPetEquipmentIds } from "./registry";
import { ActionFormData } from "@minecraft/server-ui";
import { showInfoBookForm } from "../info_book";



/**
 * @param {Player} player 
 */
export async function showPetEquipmentInfoForm(player) {
    const form = new ActionFormData();
    form.title({ translate: "ui.billeys_mobs.pet_equipment" });
    form.body({ translate: "ui.billeys_mobs.pet_equipment.body", with: ["\n"] });
    const petEquipmentIds = getAllPetEquipmentIds().filter(id => id.startsWith("billey:"));
    for (const id of petEquipmentIds) {
            //id.slice(7) removes the billey:
            form.button(`item.${id}`, "textures/billeyitems/" + id.slice(7));
    }
    form.button({ translate: "ui.billeys_mobs.pet_equipment.get_more" }, "textures/billey_icons/just_cosmetics")
    form.button({ translate: "gui.back" });
    const { selection, canceled } = await form.show(player);
    if (canceled)
        return;
    else if (selection == petEquipmentIds.length) {
        showJustCosmeticsForm(player);
        return;
    }
    else if (selection == petEquipmentIds.length + 1) {
        showInfoBookForm(player);
        return;
    }
    else {
        const form = new ActionFormData();
        /** @type {string} */
        const id = petEquipmentIds[selection];
        form.title({ translate: `item.${id}` });
        form.body({ translate: "ui.billeys_mobs.item_info." + id.slice(7), with: ["\n"] });
        form.button({ translate: "gui.back" });
        if (
            (await form.show(player)).selection === 0
        ) {
            showPetEquipmentInfoForm(player);
        }
    }
}

/**
 * @param {Player} player 
 */
async function showJustCosmeticsForm(player) {
    const form = new ActionFormData();
    form.title({ translate: "ui.billeys_mobs.just_cosmetics" });
    form.body({ translate: "ui.billeys_mobs.just_cosmetics.body", with: ["\n"] });
    form.button({ translate: "gui.back" });
    if ((await form.show(player)).selection === 0)
        showPetEquipmentInfoForm(player);
}