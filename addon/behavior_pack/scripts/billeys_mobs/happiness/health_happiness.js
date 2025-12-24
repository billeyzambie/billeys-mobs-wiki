import { DEFAULT_HAPPINESS_VALUE, MAX_HAPPINESS, registerPetHappiness } from "./happiness";
import { PetNegativeHappiness } from "./negative_happiness";

const ID = "health_happiness";

export class HealthHappiness extends PetNegativeHappiness {
    /** @override */
    getId() {
        return ID;
    }

    /** @override */
    getWeight() {
        return 3;
    }

    /** 
     * @override
     * @returns {number} the change in this happiness's value after the happy tick,
     * a happy tick is every 20th tick, which is every second basically
     */
    tick() {
        const pet = this.pet;
        const healthComponent = pet.getComponent("health");
        const maxHealth = Math.min(healthComponent.defaultValue, healthComponent.effectiveMax);
        const currentHealth = Math.min(healthComponent.currentValue, healthComponent.effectiveMax);
        const hurtValue = (currentHealth - maxHealth) / maxHealth;
        if (hurtValue < 0)
            return 480 * hurtValue;
        else
            return 480;
    }

    /** @override */
    get effectiveValue() {
        const healthComponent = this.pet.getComponent("health");
        const maxHealth = Math.min(healthComponent.defaultValue, healthComponent.effectiveMax);
        const currentHealth = Math.min(healthComponent.currentValue, healthComponent.effectiveMax);
        const percentage = 1.5 * (currentHealth / maxHealth) - 1;
        return (super.effectiveValue + MAX_HAPPINESS * percentage) / 2
    }
}

registerPetHappiness(
    ID,
    pet => new HealthHappiness(pet)
);