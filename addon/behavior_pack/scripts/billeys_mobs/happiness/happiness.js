import { Entity, system, TicksPerSecond, world } from "@minecraft/server";
import { PetAbstractHappiness } from "./abstract_happiness";
import { nameOf } from "../utility";

const HAPPY_TICKS_PER_SECOND = 1;
export const SECONDS_PER_HAPPY_TICK = 1 / HAPPY_TICKS_PER_SECOND;
export const TICKS_PER_HAPPY_TICK = TicksPerSecond / HAPPY_TICKS_PER_SECOND;
/** Change to a higher value for a timelapse */
const TIMELAPSE = 1;

//amount of seconds in 4 hours
export const MAX_HAPPINESS = 14400;
export const DEFAULT_HAPPINESS_VALUE = MAX_HAPPINESS / 2;

const IGNORE_OK = true;

/** @param {Entity} pet  */
export function happinessTick(pet) {
    for (const happinessId of HAPPINESS_IDS) {
        /** @type {PetAbstractHappiness} */
        const happiness = pet[happinessId];
        if (happiness)
            happiness.value += happiness.tick() * TIMELAPSE;
    }
    if (
        false
        && calculateTotalEffectiveHappinessPercentage2(pet) < 0 
        && pet.hasComponent("is_tamed")
        && !(pet.__nextUntameTick && pet.__nextUntameTick > system.currentTick)
    ) {
        pet.__nextUntameTick = system.currentTick + 60 * TicksPerSecond;
        pet.triggerEvent("untame");
        pet.getComponent("tameable").tamedToPlayer?.sendMessage({
            translate: "chat.billeys_mobs.pet_depressed_untamed",
            with: {
                rawtext: [
                    nameOf(pet)
                ]
            }
        });
    }
}

export function calculateTotalEffectiveHappiness(pet, ignoreOk) {
    let totalValue = 0;
    let totalWeight = 0;
    for (const happinessId of HAPPINESS_IDS) {
        /** @type {PetAbstractHappiness} */
        const happiness = pet[happinessId];
        let weightMultiplier = 1;
        if (ignoreOk) {
            if (
                happiness?.getAbsoluteMax() == DEFAULT_HAPPINESS_VALUE
                || happiness?.getAbsoluteMin() == DEFAULT_HAPPINESS_VALUE
            ) {
                weightMultiplier = Math.abs(happiness.value - DEFAULT_HAPPINESS_VALUE);
            }
            else {
                weightMultiplier = 2 * DEFAULT_HAPPINESS_VALUE ** 2 + (happiness.value - DEFAULT_HAPPINESS_VALUE) ** 2;
                weightMultiplier = Math.sqrt(weightMultiplier);
            }
        }
        const weight = happiness.getWeight() * weightMultiplier;
        totalValue += happiness.effectiveValue * weight;
        totalWeight += weight;
    }
    return totalValue / totalWeight;
}

export function calculateTotalEffectiveHappinessPercentage(pet) {
    return calculateTotalEffectiveHappiness(pet, false) / MAX_HAPPINESS;
}

export function calculateTotalEffectiveHappinessPercentage2(pet) {
    return calculateTotalEffectiveHappiness(pet, true) / MAX_HAPPINESS;
}

export function getMentalStateName(happinessPercentage) {
    //depressed range
    if (happinessPercentage <= -0.67) return "rock_bottom";
    if (happinessPercentage <= -0.33) return "horribly_depressed";
    if (happinessPercentage < 0.0) return "depressed";

    //typical range
    if (happinessPercentage <= 0.1) return "miserable";
    if (happinessPercentage <= 0.2) return "sad";
    if (happinessPercentage <= 0.4) return "slightly_down";
    if (happinessPercentage <= 0.6) return "ok";
    if (happinessPercentage <= 0.75) return "content";
    if (happinessPercentage <= 0.9) return "happy";
    if (happinessPercentage <= 1.0) return "delighted";

    //extremely happy range
    if (happinessPercentage <= 1.33) return "thrilled";
    if (happinessPercentage <= 1.67) return "euphoric";
    if (happinessPercentage > 1.67) return "overjoyed";

    return "error";
}

export function getMentalStateColor(happinessPercentage) {
    //depressed range
    if (happinessPercentage <= -0.67) return "§4";
    if (happinessPercentage <= -0.33) return "§4";
    if (happinessPercentage < 0.0) return "§c";

    //typical range
    if (happinessPercentage <= 0.1) return "§6";
    if (happinessPercentage <= 0.2) return "§6";
    if (happinessPercentage <= 0.4) return "§e";
    if (happinessPercentage <= 0.6) return "§f";
    if (happinessPercentage <= 0.75) return "§a";
    if (happinessPercentage <= 0.9) return "§a";
    if (happinessPercentage <= 1.0) return "§2";

    //extremely happy range
    if (happinessPercentage <= 1.33) return "§b";
    if (happinessPercentage <= 1.67) return "§9";
    if (happinessPercentage > 1.67) return "§d";

    return "§l";
}

/** @param {Entity} pet  */
export function loadHappiness(pet) {
    for (const happyNew of CREATE_NEW_HAPPINESS) {
        happyNew(pet);
    }
}


/** @type {string[]} */
let HAPPINESS_IDS = [];

export function getAllHappinessIds() {
    return HAPPINESS_IDS;
}

/** @type {((pet: Entity)=> PetAbstractHappiness)[]}} */
let CREATE_NEW_HAPPINESS = [];

/** 
 * @param {string} happinessId 
 * @param {(pet: Entity)=>PetAbstractHappiness} createNewHappiness
 */
export function registerPetHappiness(happinessId, createNewHappiness) {
    HAPPINESS_IDS.push(happinessId);
    CREATE_NEW_HAPPINESS.push(createNewHappiness);
}

/** 
 * @param {number} value
 * make the depressed and extremely happy ranges harder to get
 */
export function valueToEffectiveValue(value) {
    if (value > MAX_HAPPINESS)
        return Math.max(MAX_HAPPINESS, value - MAX_HAPPINESS);
    if (value < 0)
        return Math.min(0, value + MAX_HAPPINESS);
    return value;
}