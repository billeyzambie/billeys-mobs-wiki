import { world, system, Entity, ItemStack, Dimension, Player } from "@minecraft/server";
import { getPetEquipmentId, setPetEquipment } from "./pet_equipment/_index";
import { PetDatabase, removePetFromDatabase } from "./pet_database";
import { compareStrings, floorVector, getDistanceXYZ, getDistanceXZ, nameOf, vectorToColorfulString } from "./utility";
import { calculateTotalEffectiveHappinessPercentage2 } from "./happiness/happiness";
import { ActionFormData } from "@minecraft/server-ui";
import { showPetStatForm } from "./quality_of_life";
import { showInfoBookForm } from "./info_book";

/** @type {Entity[]} */
let loadedPets = [];
/** @type {string[]} */
let loadedPetIds = [];

function petUnloaded(petId) {
    loadedPets = loadedPets.filter(p => p.id != petId);
    loadedPetIds = loadedPetIds.filter(id => id != petId);
}

function* saveLoadedPetsInDatabase() {
    try {
        if (PetDatabase.hasLoaded) for (const pet of loadedPets) {
            if (!pet.isValid) {
                petUnloaded(pet.id);
                const prevData = petDataArrayToPetObject(PetDatabase.database[pet.__ownerId][pet.id]);
                if (!prevData)
                    continue;
                if (world.getDimension(prevData.dimension.id).getBlock(prevData.location)?.isValid) {
                    removePetFromDatabase(pet.id, prevData.ownerId);
                }
                else if (pet.__wasFollowing && !pet.__dontSayUnloadMessage) {
                    const owner = world.getAllPlayers().find(p => p.id == pet.__ownerId);
                    if (!owner)
                        continue;
                    owner.sendMessage({
                        translate: "chat.billeys_mobs.pet_unloaded",
                        with: {
                            rawtext: [
                                {
                                    text: "\n"
                                },
                                nameOf(prevData),
                                {
                                    text: vectorToColorfulString(prevData.location)
                                }
                            ]
                        }
                    });
                }
                continue;
            }
            PetDatabase.database[pet.__ownerId] ??= {};
            const healthComponent = pet.getComponent("health");
            const maxHealth = Math.round(Math.min(healthComponent.defaultValue, healthComponent.effectiveMax));
            const currentHealth = Math.round(healthComponent.currentValue);
            PetDatabase.database[pet.__ownerId][pet.id] = [
                pet.id,
                pet.typeId,
                pet.nameTag,
                pet.__ownerId,
                pet.hasComponent("is_baby"),
                pet.getDynamicProperty("owner_name"),
                maxHealth,
                currentHealth,
                pet.getProperty("billey:level"),
                pet.getProperty("billey:xp"),
                Math.round(calculateTotalEffectiveHappinessPercentage2(pet) * 100) / 100,
                floorVector(pet.location),
                { id: pet.dimension.id }
            ];
            pet.__wasFollowing = pet.getProperty("billey:follow_owner_state") == "following" && !pet.getProperty("billey:is_sitting");
            pet.__wasFollowing ||= pet.__yeetedVelocity;
            yield;
        }
    }
    catch (e) {
        console.warn("[Billey's Mobs] Error in saveLoadedPetsInDatabase loop: " + e);
    }
    system.run(() => system.runJob(saveLoadedPetsInDatabase()));
}

system.runJob(saveLoadedPetsInDatabase());

/** @param {any[]} petDataArray  */
function petDataArrayToPetObject(petDataArray) {
    const petObject = {};
    if (!petDataArray)
        return undefined;
    //this is only needed for some of my testing worlds before i changed the thing
    if (petDataArray.id)
        return petDataArray;
    petObject.id = petDataArray[0];
    petObject.typeId = petDataArray[1];
    petObject.nameTag = petDataArray[2];
    petObject.ownerId = petDataArray[3];
    petObject.isBaby = petDataArray[4];
    petObject.ownerName = petDataArray[5];
    petObject.maxHealth = petDataArray[6];
    petObject.currentHealth = petDataArray[7];
    petObject.level = petDataArray[8];
    petObject.xp = petDataArray[9];
    petObject.happinessPercentage = petDataArray[10];
    petObject.location = petDataArray[11];
    petObject.dimension = petDataArray[12];
    return petObject;
}

/** @param {Player} player  */
export async function listPetsToPlayerForm(player) {
    if (PetDatabase.hasLoaded) {
        const form = new ActionFormData();
        form.title({ translate: "ui.billeys_mobs.info.category.your_pets" });

        const petsOfPlayerObject = PetDatabase.database[player.id];
        const pets = petsOfPlayerObject ? Object.values(petsOfPlayerObject)
            .map(p => petDataArrayToPetObject(p))
            .sort((x, y) => {
                let a = x.nameTag;
                let b = y.nameTag;
                if (!b) {
                    if (a)
                        return -1;
                    else {
                        const levelDifference = (y.level ?? 1) - (x.level ?? 1);
                        if (levelDifference)
                            return levelDifference;
                        else return compareStrings(x.typeId, y.typeId);
                    }
                }
                else if (!a) return 1;
                else {
                    return compareStrings(a, b);
                }
            }) : [];
        for (const pet of pets) {
            let buttonRawText = [nameOf(pet)];
            if ((pet.level ?? 1) > 1)
                buttonRawText.push(
                    { text: "\n" },
                    { translate: "ui.billeys_mobs.pet_stats.level_simple", with: [pet.level.toString()] }
                );
            form.button({ rawtext: buttonRawText }, "textures/billey_icons/" + pet.typeId.split(":")[1]);
        }
        form.button({ translate: "gui.back" });


        let body = [{ translate: "ui.billeys_mobs.info.category.your_pets.body", with: ["\n"] }];

        if (!pets.length)
            body.push({ text: "\n\n" }, { translate: "ui.billeys_mobs.info.category.your_pets.body_no_pets" });

        form.body({ rawtext: body });


        const { canceled, selection } = await form.show(player);
        if (canceled)
            return;
        if (selection == pets.length) {
            showInfoBookForm(player);
            return;
        }
        const petId = pets[selection].id;
        const petNameTag = pets[selection].nameTag;
        const petTypeId = pets[selection].typeId;
        const petObject = petDataArrayToPetObject(PetDatabase.database[player.id][petId]);
        if (!petObject) {
            player.sendMessage({ translate: "chat.billeys_mobs.pet_no_longer_exists", with: { rawtext: [nameOf({ typeId: petTypeId, nameTag: petNameTag })] } });
            return;
        }
        const pet = world.getEntity(petId) ?? petObject;
        if (!(pet instanceof Entity) && world.getDimension(pet.dimension.id).getBlock(pet.location)?.isValid) {
            player.sendMessage({ translate: "chat.billeys_mobs.pet_no_longer_exists", with: { rawtext: [nameOf(pet)] } });
            removePetFromDatabase(pet.id, pet.ownerId);
            return;
        }
        showPetStatForm(player, pet, true);
    }
    else
        player.sendMessage({ translate: "chat.billeys_mobs.pets_still_loading" })
}

/**
 * @param {Entity} pet 
 * Adds the mob owner's name and id as dynamic properties so they can be accessed even when owner is offline.
 * Was used for making pets remember their owner after being loaded by a script structure
 * back when there was a bug where they'd forget their owner after being loaded
 */
export function addOwnerAsDynamicProperty(pet) {
    const tameable = pet.getComponent("tameable");
    if (!tameable)
        return world.sendMessage(pet.nameTag + " the " + pet.typeId.split(":")[1].replaceAll("_", " ") +
            " doesn't have the tameable component, please let the creator of billey's mobs know so he can fix this");
    const owner = tameable.tamedToPlayer;
    const prevOwnerId = pet.getDynamicProperty("owner_id");
    //if it's the first time this is executed for this pet
    if (!prevOwnerId) {
        pet.setDynamicProperty("tame_date", Date.now());
    }
    if (prevOwnerId && prevOwnerId != owner.id)
        removePetFromDatabase(pet.id, prevOwnerId);
    if (owner) {
        pet.setDynamicProperty("owner_id", owner.id);
        pet.setDynamicProperty("owner_name", owner.name);
        pet.__ownerId = owner.id;
    }
    else if (prevOwnerId)
        pet.__ownerId = prevOwnerId;
    if (!loadedPets.includes(pet))
        loadedPets.push(pet);
    if (!loadedPetIds.includes(pet.id))
        loadedPetIds.push(pet.id);
}

world.afterEvents.entityLoad.subscribe(({ entity }) => {
    if (entity.typeId.startsWith("billey:") && entity.getComponent("is_tamed"))
        addOwnerAsDynamicProperty(entity);
});

world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
    if (entity.typeId.startsWith("billey:") && eventId.startsWith("minecraft:entity_born")) {
        addOwnerAsDynamicProperty(entity);
        mob.setDynamicProperty("tame_date_is_birthdate", true);
    }
});

const PRETTY_COLORS = [1, 2, 3, 4, 5, 6, 9, 10, 11, 13, 14, 15];

world.beforeEvents.playerInteractWithEntity.subscribe(({ target }) => {
    /*
    Note to self: if I ever add a pet that's tamed without hand-feeding it,
    this won't work
    */
    const mobWasntTamed = !target.hasComponent("is_tamed");
    const mobHadntOwner = !target.getComponent("tameable")?.tamedToPlayerId;
    system.run(() => {
        if (
            (target.typeId.startsWith("billey:") || target.typeId == "minecraft:cat")
            && mobWasntTamed && target.hasComponent("is_tamed")
        ) {
            addOwnerAsDynamicProperty(target);
            if (
                mobHadntOwner && !target.getComponent("type_family").hasTypeFamily("fish")
                && !getPetEquipmentId(target, "Legs")
            ) {
                setPetEquipment(target, "Legs", new ItemStack("billey:pet_bowtie"));
                target.setProperty(
                    "billey:legs_equipment_color",
                    PRETTY_COLORS[Math.floor(Math.random() * PRETTY_COLORS.length)]
                );
            }
        }
    });
});

world.beforeEvents.entityRemove.subscribe(({removedEntity})=>{
    if (removedEntity.typeId.startsWith("billey:") && removedEntity.hasComponent("minecraft:is_tamed")) {
        removePetFromDatabase(removedEntity.id);
    }
});