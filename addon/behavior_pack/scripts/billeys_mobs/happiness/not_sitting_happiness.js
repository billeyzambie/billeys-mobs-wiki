import { PetAbstractHappiness } from "./abstract_happiness";
import { registerPetHappiness } from "./happiness";

const ID = "not_sitting_happiness";

export class NotSittingHappiness extends PetAbstractHappiness {
    /** @override */
    getId() {
        return ID;
    }

    /** @override */
    getWeight() {
        return 1;
    }

    /** 
     * @override
     * @returns {number} the change in this happiness's value after the happy tick,
     * a happy tick is every 20th tick, which is every second basically
     */
    tick() {        
        const pet = this.pet;
        return pet.getProperty("billey:is_sitting") ? -16 : 48;
    }
}

registerPetHappiness(
    ID,
    pet => new NotSittingHappiness(pet)
);