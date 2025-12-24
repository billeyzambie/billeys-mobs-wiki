/** Pet accessories that don't deserve their own file */

/** @enum {number} */
const PetEquipmentColor = {
    white: 0,
    orange: 1,
    magenta: 2,
    light_blue: 3,
    yellow: 4,
    lime: 5,
    pink: 6,
    gray: 7,
    light_gray: 8,
    cyan: 9,
    purple: 10,
    blue: 11,
    brown: 12,
    green: 13,
    red: 14,
    black: 15
};

import { registerPetEquipment } from "./registry";

/** Pets that become able to cook when equipped with a chef hat */
const CHEF_PETS = ["billey:rat", "billey:netherrat", "billey:penguin"];

registerPetEquipment("Head", "billey:pet_hat",
    {
        isBrave: false,
        isDyeable: true,
        defaultColor: PetEquipmentColor.brown
    }
);

registerPetEquipment("Head", "billey:pet_chef_hat",
    {
        isBrave: false,
        isDyeable: true,
        defaultColor: PetEquipmentColor.white,
        onEquip: pet => {
            if (CHEF_PETS.includes(pet.typeId))
                pet.triggerEvent("become_chef");
        },
        onUnequip: pet => {
            if (CHEF_PETS.includes(pet.typeId))
                pet.triggerEvent("no_longer_chef");
        }
    }
);

registerPetEquipment("Head", "billey:royal_rat_chef_hat",
    {
        isBrave: false,
        isDyeable: false,
        onEquip: pet => {
            if (CHEF_PETS.includes(pet.typeId))
                pet.triggerEvent("become_chef");
        },
        onUnequip: pet => {
            if (CHEF_PETS.includes(pet.typeId))
                pet.triggerEvent("no_longer_chef");
        }
    }
);

registerPetEquipment("Head", "billey:pet_straw_hat",
    {
        isBrave: false,
        isDyeable: true,
        defaultColor: PetEquipmentColor.red
    }
);

registerPetEquipment("Legs", "billey:pet_bowtie",
    {
        isBrave: false,
        isDyeable: true,
        defaultColor: PetEquipmentColor.red
    }
);

registerPetEquipment("Head", "billey:duck_hat",
    {
        isBrave: true,
        isDyeable: false
    }
);