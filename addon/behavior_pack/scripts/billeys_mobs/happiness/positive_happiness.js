import { PetAbstractHappiness } from "./abstract_happiness";
import { DEFAULT_HAPPINESS_VALUE } from "./happiness";

/** 
 * @abstract
 * Happiness that can only contribute positively 
 */
export class PetPositiveHappiness extends PetAbstractHappiness {
    /** @override */
    getAbsoluteMin() {
        return DEFAULT_HAPPINESS_VALUE;
    }
}