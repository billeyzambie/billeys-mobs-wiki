import { BlockExplodeAfterEvent, Dimension, ItemStack, Player, system, world } from "@minecraft/server";
import { damageItem, decrementStack, playSoundAtBlockCenter, playSoundAtEntity, spawnItemInBlockCenter } from "./utility";

const SUBSTRATE_IDS = ["minecraft:sand", "minecraft:red_sand", "billey:aquarium_gravel", "minecraft:gravel", "minecraft:dirt"];

const PLANT_IDS = ["minecraft:kelp", "minecraft:seagrass", "minecraft:tube_coral", "minecraft:brain_coral", "minecraft:bubble_coral", "minecraft:fire_coral", "minecraft:horn_coral"];

const BLOCK_BREAK_SOUNDS = {
    "minecraft:sand": "dig.sand",
    "minecraft:red_sand": "dig.sand",
    "billey:aquarium_gravel": "dig.gravel",
    "minecraft:gravel": "dig.gravel",
    "minecraft:dirt": "dig.gravel",
    "minecraft:kelp": "dig.grass",
    "minecraft:seagrass": "dig.grass",
    "minecraft:tube_coral": "dig.stone",
    "minecraft:brain_coral": "dig.stone",
    "minecraft:bubble_coral": "dig.stone",
    "minecraft:fire_coral": "dig.stone",
    "minecraft:horn_coral": "dig.stone"
};

const BLOCK_PLACE_SOUNDS = {
    "minecraft:sand": "dig.sand",
    "minecraft:red_sand": "dig.sand",
    "billey:aquarium_gravel": "dig.gravel",
    "minecraft:gravel": "dig.gravel",
    "minecraft:dirt": "dig.gravel",
    "minecraft:kelp": "use.grass",
    "minecraft:seagrass": "use.grass",
    "minecraft:tube_coral": "dig.stone",
    "minecraft:brain_coral": "dig.stone",
    "minecraft:bubble_coral": "dig.stone",
    "minecraft:fire_coral": "dig.stone",
    "minecraft:horn_coral": "dig.stone"
};

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
    blockComponentRegistry.registerCustomComponent("billey:fish_tank", {
        onBreak: ({ block, brokenBlockPermutation: permutation }) => {
            if (permutation.getState("billey:has_water")) {
                block.setType("flowing_water");
                playSoundAtBlockCenter(block, "ambient.underwater.exit", { volume: 0.5 });
                world.sendMessage(block.dimension.id);
            }
            if (world.gameRules.doTileDrops) {
                const substrate = permutation.getState("billey:substrate");
                if (substrate != "none") {
                    spawnItemInBlockCenter(block, new ItemStack(substrate));
                }
                const plant = permutation.getState("billey:plant");
                if (plant != "none") {
                    spawnItemInBlockCenter(block, new ItemStack(plant));
                }
            }
        },
        onPlayerInteract: ({ block, player }) => {
            const permutation = block.permutation;
            const item = player.getComponent("equippable").getEquipment("Mainhand");
            if (!item) {
                return;
            }
            const itemId = item.typeId;
            if (permutation.getState("billey:substrate") == "none") {
                if (SUBSTRATE_IDS.includes(itemId)) {
                    const newPermutation = permutation.withState(
                        "billey:substrate",
                        itemId
                    );
                    block.setPermutation(newPermutation);
                    decrementStack(player);
                    playSoundAtEntity(player, BLOCK_PLACE_SOUNDS[itemId]);
                }
            }
            else if (itemId == "minecraft:water_bucket" && !permutation.getState("billey:has_water")) {
                const newPermutation = permutation.withState(
                    "billey:has_water",
                    true
                );
                block.setPermutation(newPermutation);
                if (player.getGameMode() != "Creative")
                    player.getComponent("equippable").setEquipment("Mainhand", new ItemStack("bucket"));
                playSoundAtEntity(player, "bucket.empty_water");
            }
            else if (itemId == "minecraft:bucket" && permutation.getState("billey:has_water")) {
                const newPermutation = permutation.withState(
                    "billey:has_water",
                    false
                );
                if (player.getGameMode() != "Creative")
                    player.getComponent("equippable").setEquipment("Mainhand", new ItemStack("water_bucket"));
                playSoundAtEntity(player, "bucket.fill_water");
                const plant = permutation.getState("billey:plant");
                if (plant != "none") {
                    spawnItemInBlockCenter(block, new ItemStack(plant));
                playSoundAtEntity(player, BLOCK_BREAK_SOUNDS[plant]);
                    
                }
                block.setPermutation(newPermutation.withState("billey:plant", "none"));
            }
            else if (item.hasTag("minecraft:is_shovel") && !permutation.getState("billey:has_water")) {
                const removedSubstrate = permutation.getState("billey:substrate");
                const newPermutation = permutation.withState(
                    "billey:substrate",
                    "none"
                );
                block.setPermutation(newPermutation);
                damageItem(player);
                spawnItemInBlockCenter(block, new ItemStack(removedSubstrate));
                playSoundAtEntity(player, BLOCK_BREAK_SOUNDS[removedSubstrate]);
            }
            else if (permutation.getState("billey:plant") == "none") {
                if (PLANT_IDS.includes(itemId) && permutation.getState("billey:has_water")) {
                    const newPermutation = permutation.withState(
                        "billey:plant",
                        itemId
                    );
                    block.setPermutation(newPermutation);
                    decrementStack(player);
                    playSoundAtEntity(player, BLOCK_PLACE_SOUNDS[itemId]);
                }
            }
            else if (itemId == "minecraft:shears") {
                const removedPlant = permutation.getState("billey:plant");
                const newPermutation = permutation.withState(
                    "billey:plant",
                    "none"
                );
                block.setPermutation(newPermutation);
                damageItem(player);
                spawnItemInBlockCenter(block, new ItemStack(removedPlant));
                playSoundAtEntity(player, BLOCK_BREAK_SOUNDS[removedPlant]);
            }
        }
    });
});