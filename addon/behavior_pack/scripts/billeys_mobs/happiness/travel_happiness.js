import { Entity, system } from "@minecraft/server";
import { getDistanceXYZ } from "../utility";
import { PetAbstractHappiness } from "./abstract_happiness";
import { MAX_HAPPINESS, registerPetHappiness, TICKS_PER_HAPPY_TICK } from "./happiness";
import { INFO } from "./buddy_presence_happiness";

const ID = "travel_happiness";
const INTERVAL = 10;

export class TravelHappiness extends PetAbstractHappiness {
    /** @override */
    getId() {
        return ID;
    }

    /** @override */
    getWeight() {
        return 2;
    }

    /** @type {import("@minecraft/server").Vector3} */
    prevLocation;

    /** @override */
    getDefaultValue() {
        return MAX_HAPPINESS;
    }

    /**
     * @param {Entity} pet 
     */
    constructor(pet) {
        super(pet);
        this.prevLocation = pet.location;
    }

    /** 
     * @override
     * @returns {number} the change in this happiness's value after the happy tick,
     * a happy tick is every 20th tick, which is every second basically
     */
    tick() {
        if (system.currentTick % (TICKS_PER_HAPPY_TICK * INTERVAL) != 0)
            return 0;
        const mobSize = INFO[this.pet.typeId]?.size ?? 1;
        const scaledDistance = getDistanceXYZ(this.prevLocation, this.pet.location) / Math.sqrt(mobSize);
        return (scaledDistance - 3) * 60;
    }
}

registerPetHappiness(
    ID,
    pet => new TravelHappiness(pet)
);