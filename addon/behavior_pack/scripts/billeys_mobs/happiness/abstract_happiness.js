import { Entity, world } from "@minecraft/server";
import { calculateTotalEffectiveHappinessPercentage, DEFAULT_HAPPINESS_VALUE, MAX_HAPPINESS, valueToEffectiveValue } from "./happiness";
import { clamp } from "../utility";

/** @abstract */
export class PetAbstractHappiness {
    /** 
     * @abstract 
     * @returns {string}
    */
    getId() {
        throw new Error("Cannot call unimplemented abstract method getId of class PetAbstractHappiness")
    }

    /** 
     * @abstract 
     * @returns {number}
    */
    getWeight() {
        return 1;
    }

    getDefaultValue() {
        return DEFAULT_HAPPINESS_VALUE;
    }

    /** @type {Entity} */
    #pet;

    /** 
     * @param {Entity} value 
     * @readonly
    */
    get pet() {
        return this.#pet;
    }

    getAbsoluteMin() {
        return -2 * MAX_HAPPINESS;
    }

    getAbsoluteMax() {
        return 3 * MAX_HAPPINESS;
    }

    /** @param {number} value */
    set value(value) {
        const happinessPercentage = calculateTotalEffectiveHappinessPercentage(this.pet);

        //Make the extremes harder to get to, and only obtainable if the pet is already sad/happy overall
        if (value < -1 * MAX_HAPPINESS && this.value > -1 * MAX_HAPPINESS &&  happinessPercentage > 0.125){
            value = -1 * MAX_HAPPINESS;
        }
        else if (value > 2 * MAX_HAPPINESS && happinessPercentage < 0.875)
            value = 2 * MAX_HAPPINESS;

        value = clamp(this.getAbsoluteMin(), this.getAbsoluteMax(), value);

        let deltaValue = value - this.value;

        //Make recovery from depression harder
        if (happinessPercentage < 0 && deltaValue > 0)
            deltaValue /= 4;

        this.pet.setDynamicProperty(this.getId(), this.value + deltaValue);
    }

    get value() {
        return this.pet.getDynamicProperty(this.getId()) ?? this.getDefaultValue();
    }

    /** 
     * @readonly
    */
    get effectiveValue() {
        return valueToEffectiveValue(this.value);
    }

    /** @param {Entity} pet */
    constructor(pet) {
        pet[this.getId()] = this;
        this.#pet = pet;
    }

    /** 
     * @abstract
     * @returns {number} the change in this happiness's value after the happy tick
     */
    tick() {
        return 0;
    }
}