import { getDistanceXYZ } from "../utility";
import { PetAbstractHappiness } from "./abstract_happiness";
import { registerPetHappiness } from "./happiness";

const ID = "owner_presence_happiness";

export class OwnerPresenceHappiness extends PetAbstractHappiness {
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
        const owner = pet.getComponent("tameable")?.tamedToPlayer;
        if (
            owner?.isValid
            && owner.dimension == pet.dimension
            && getDistanceXYZ(owner.location, pet.location) < 7
        ) {
            return 60;
        }
        else {
            return -8;
        }
    }
}

registerPetHappiness(
    ID,
    pet => new OwnerPresenceHappiness(pet)
);