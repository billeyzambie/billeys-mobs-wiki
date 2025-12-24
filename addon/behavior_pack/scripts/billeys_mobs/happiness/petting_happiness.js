import { world } from "@minecraft/server";
import { PetAbstractHappiness } from "./abstract_happiness";
import { MAX_HAPPINESS, registerPetHappiness } from "./happiness";

const ID = "petting_happiness";

export class PettingHappiness extends PetAbstractHappiness {
    /** @override */
    getId() {
        return ID;
    }

    /** @override */
    getWeight() {
        return 0.5;
    }

    /** 
     * @override
     * @returns {number} the change in this happiness's value after the happy tick,
     * a happy tick is every 20th tick, which is every second basically.
     * 
     * MAX_HAPPINESS / 3 is added to this whenever the pet is interacted with (eg. petted)
     */
    tick() {
        return this.pet.hasComponent("is_tamed") ? -4 : 0;
    }
}

registerPetHappiness(
    ID,
    pet => new PettingHappiness(pet)
);

world.beforeEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
    const pettingHappiness = target.petting_happiness;
    if (pettingHappiness)
        pettingHappiness.value += MAX_HAPPINESS / 5;
});