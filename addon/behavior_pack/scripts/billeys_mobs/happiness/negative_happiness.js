import { PetAbstractHappiness } from "./abstract_happiness";
import { DEFAULT_HAPPINESS_VALUE } from "./happiness";

/** 
 * @abstract
 * Happiness that can only contribute negatively
 */
export class PetNegativeHappiness extends PetAbstractHappiness {
    /** @override */
    getAbsoluteMax() {
        return DEFAULT_HAPPINESS_VALUE;
    }
}