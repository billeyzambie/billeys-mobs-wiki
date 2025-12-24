import { getDistanceXYZ } from "../utility";
import { PetAbstractHappiness } from "./abstract_happiness";
import { MAX_HAPPINESS, registerPetHappiness } from "./happiness";

const ID = "buddy_presence_happiness";

export const INFO = {
    "billey:banana_duck": {
        //How important having a buddy is to this mob
        weight: 2,
        //The mob's evolutionary tree oversimplified, closer relatives give more happiness, must be of length 4
        family: ["duck", "bird", "theropod", "vertebrate"],
        //Very rough approximation of the mob's size in blocks, more similar size -> more happiness
        size: 1
    },
    "billey:duck": {
        weight: 2,
        family: ["duck", "bird", "theropod", "vertebrate"],
        size: 1
    },
    "billey:goose": {
        weight: 2,
        family: ["duck", "bird", "theropod", "vertebrate"],
        size: 1
    },
    "billey:duckatrice": {
        weight: 2,
        family: ["duck", "bird", "theropod", "vertebrate"],
        size: 3
    },
    "billey:rat": {
        weight: 2,
        family: ["rat", "rodent", "mammal", "vertebrate"],
        size: 1
    },
    "billey:netherrat": {
        weight: 1,
        family: ["rat", "rodent", "mammal", "vertebrate"],
        size: 1
    },
    "billey:hamster": {
        weight: 0.5,
        family: ["hamster", "rodent", "mammal", "vertebrate"],
        size: 0.5
    },
    "billey:penguin": {
        weight: 3,
        family: ["penguin", "bird", "theropod", "vertebrate"],
        size: 1
    },
    "billey:pigeon": {
        weight: 1,
        family: ["pigeon", "bird", "theropod", "vertebrate"],
        size: 0.75
    },
    "billey:kiwi": {
        weight: 1,
        family: ["kiwi", "bird", "theropod", "vertebrate"],
        size: 1
    },
    "billey:mergoose": {
        weight: 0.5,
        family: ["mergoose", "bird", "theropod", "vertebrate"],
        size: 0.75
    },
    "billey:terraphin": {
        weight: 1,
        family: ["terraphin", "cetacean", "mammal", "vertebrate"],
        size: 2
    },
    "billey:yutyrannus": {
        weight: 3,
        family: ["yutyrannus", "tyrannosaur", "theropod", "vertebrate"],
        size: 3
    },
    "billey:deinonychus": {
        weight: 2,
        family: ["deinonychus", "dromaeosaur", "theropod", "vertebrate"],
        size: 1.5
    },
    "billey:slime_wyvern": {
        weight: 1,
        //scaly reptile is not a real clade but it makes sense here
        family: ["slime_wyvern", "dragon", "scaly_reptile", "vertebrate"],
        size: 1.5
    },
    "minecraft:cat": {
        weight: 1,
        family: ["cat", "felid", "mammal", "vertebrate"],
        size: 1
    },
    "billey:giraffe_cat": {
        weight: 1,
        family: ["cat", "felid", "mammal", "vertebrate"],
        size: 1
    },
    "billey:zombie_cat": {
        weight: 1,
        family: ["cat", "felid", "mammal", "vertebrate"],
        size: 1
    },
    "billey:skeleton_cat": {
        weight: 1,
        family: ["cat", "felid", "mammal", "vertebrate"],
        size: 1
    },
    "billey:zombified_cat": {
        weight: 1,
        family: ["cat", "felid", "mammal", "vertebrate"],
        size: 1
    },
    "billey:endercat": {
        weight: 1,
        family: ["cat", "felid", "mammal", "vertebrate"],
        size: 1
    },
    "billey:flyingcat": {
        weight: 1,
        family: ["cat", "felid", "mammal", "vertebrate"],
        size: 1
    },
    "billey:endflyingcat": {
        weight: 1,
        family: ["cat", "felid", "mammal", "vertebrate"],
        size: 1
    },
    "billey:flyingpig": {
        weight: 1,
        family: ["pig", "pig", "mammal", "vertebrate"],
        size: 1
    },
    "billey:mercat": {
        weight: 1,
        family: ["cat", "felid", "mammal", "vertebrate"],
        size: 1
    },
    "billey:pickle_cat": {
        weight: 1,
        family: ["cat", "felid", "mammal", "vertebrate"],
        size: 1
    }
};

export class BuddyPresenceHappiness extends PetAbstractHappiness {
    /** @override */
    getId() {
        return ID;
    }

    /** @override */
    getWeight() {
        return INFO[this.pet.typeId]?.weight ?? 0;
    }

    bestMatchHappiness = 0.5;

    /** 
     * @override
     * @returns {number} the change in this kind of happiness's value after the happy tick,
     * a happy tick is every 20th tick, which is every second basically
     */
    tick() {
        const pet = this.pet;
        const info = INFO[pet.typeId];
        if (!info) return 0;
        /** @type {string[]} */
        const family = info.family;
        let bestMatchScore = 0;
        const mobSize = info?.size ?? 1;

        for (const entity of pet.dimension.getEntities({ location: pet.location, maxDistance: 7 * mobSize })) {
            if (entity == pet) continue;

            const otherInfo = INFO[entity.typeId];
            if (!otherInfo) continue;

            /** @type {string[]} */
            const otherFamily = otherInfo.family;

            let relationScore = 0;

            for (let i = 0; i < 4; i++) {
                if (family[i] == otherFamily[i]) {
                    relationScore += 4 - i;
                    break;
                }
            }

            const sizeDifference = Math.abs(info.size - otherInfo.size);
            relationScore += Math.max(0, 2 - sizeDifference * 0.5);

            if (relationScore > bestMatchScore) {
                bestMatchScore = relationScore;
            }
        }

        //transform the 0 to 6 range to -1 to 2 (the effective happiness range)
        this.bestMatchHappiness = bestMatchScore / 2 - 1;

        let result = -30 + bestMatchScore * 30;
        if (result < 0)
            result /= 2;
        return result;
    }

    /** @override */
    get effectiveValue() {
        return (super.effectiveValue + this.bestMatchHappiness * MAX_HAPPINESS) / 2
    }
}

registerPetHappiness(
    ID,
    pet => new BuddyPresenceHappiness(pet)
);