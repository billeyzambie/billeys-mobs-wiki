import { system, world } from "@minecraft/server";
import { loadDatabase, saveDatabase } from "./big_dynamic_properties";

export class PetDatabase {
    /** @readonly */
    static get ID() {
        return "pet_database";
    }
    static #hasLoaded = false;
    /** @readonly */
    static get hasLoaded() {
        return this.#hasLoaded;
    }
    static #database = {};
    static get database() {
        return this.#database;
    }
    static set database(value) {
        this.#database = value;
    }
    static load() {
        system.run(async () => {
            PetDatabase.database = await loadDatabase(PetDatabase.ID);
            this.#hasLoaded = true;
        });
    }
}

PetDatabase.load();

let dataBaseIsBeingSaved = false;

async function savePetDatabase() {
    dataBaseIsBeingSaved = true;
    //console.log("§eSaving pet database...");
    await saveDatabase(PetDatabase.ID, PetDatabase.database);
    //console.log("§aPet database saved!");
    dataBaseIsBeingSaved = false;
}

/** Save the pet database unless it's already currently being saved */
export function trySavePetDatabase() {
    if (!dataBaseIsBeingSaved && PetDatabase.hasLoaded)
        savePetDatabase();
}

export function removePetFromDatabase(petId, ownerId) {
    if (ownerId)
        delete PetDatabase.database[ownerId][petId];
    else for (const ownerId of Object.keys(PetDatabase.database))
        delete PetDatabase.database[ownerId][petId];
    trySavePetDatabase();
}