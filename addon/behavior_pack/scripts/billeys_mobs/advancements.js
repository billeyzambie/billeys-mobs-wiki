import { world, system, ItemStack, Player, Entity } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { playSoundAtEntity, translateItem } from "./utility";
import { showInfoBookForm } from "./info_book";
import { ADVANCEMENTS } from "./advancement_list";
import { getIsAnniversary } from "./pet_equipment/anniversary_hats";

const XP_PER_POWER_BANANA = 35;

let advancementPlayerCompletionOrder = {};

/** Color used for the first 3 players that completed an advancement */
const MEDAL_COLORS = ["§q", "§s", "§p"];

/**
 * @param {Player} player 
 * @param {string} advancementName 
 */
export function giveAdvancement(player, advancementName) {
    if (!(player instanceof Player))
        return world.sendMessage(`§cError: Billey's Mobs advancements can only be given to players. Attempted to give ${message} to ${player.typeId}.`);
    const advancement = ADVANCEMENTS.find(a => a.name == advancementName);
    if (!advancement)
        return world.sendMessage(`§cError: Failed to give Billey's Mobs advancement "${message}" to ${player.name}. Advancement of name "${message}" not found.`);
    world.sendMessage({ rawtext: [{ translate: advancement.isChallenge ? "chat.challenge.task" : "chat.advancement.task", with: { rawtext: [{ text: player.name }, { translate: "advancements.billeys_mobs." + advancement.name }] } }] });
    player.addTag("billeyadv_" + advancement.name);
    /** @type {string[]} */
    let completedPlayers = advancementPlayerCompletionOrder[advancement.name] ??= [];
    let xp = advancement.xp;
    if (completedPlayers.length)
        xp /= 2;
    player.addExperience(xp);
    playSoundAtEntity(player, "random.orb");
    const powerBananas = Math.floor(xp / XP_PER_POWER_BANANA);
    if (powerBananas) {
        const item = new ItemStack("billey:power_banana", powerBananas);
        player.dimension.spawnItem(item, player.location);
    }
    if (advancement.trophy) {
        const trophyItem = new ItemStack(advancement.trophy);
        trophyItem.setLore(["§r§b" + player.name]);
        trophyItem.setDynamicProperty("owner_name", player.name);
        player.dimension.spawnItem(
            trophyItem,
            player.location
        );
    }
    if (advancement.completionMessage)
        player.sendMessage({ rawtext: [{ text: "§7" }, { translate: advancement.completionMessage }] });
    completedPlayers.push(player.name);
    world.setDynamicProperty(
        "advancement_player_completion_order",
        JSON.stringify(advancementPlayerCompletionOrder)
    );
    if (getIsAnniversary()) {
        const anniversaryPetHat = new ItemStack("billey:anniversary_pet_hat_6");
        anniversaryPetHat.setLore(["§r§b" + player.name]);
        anniversaryPetHat.setDynamicProperty("owner_name", player.name);
        player.dimension.spawnItem(anniversaryPetHat, player.location);
        player.sendMessage({ translate: "chat.billeys_mobs.anniversary_hat" });
    }
}

/**
 * @param {Entity} slimeWyvern 
 */
function slimeWyvernLevel10Advancement(slimeWyvern) {
    const player = slimeWyvern.getComponent("tameable").tamedToPlayer;
    if (!player?.isValid) return;
    if (player.hasTag("billeyadv_slime_wyvern_level_10")) return;
    giveAdvancement(player, "slime_wyvern_level_10");
    slimeWyvern.addTag("billey:has_given_lvl10_adv");
}

system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity, id, message }) => {
    switch (id) {
        case "billey:advancement":
            if (!sourceEntity.isValid) return;
            giveAdvancement(sourceEntity, message);
            break;
        case "billey:slime_wyvern_level_10":
            if (!sourceEntity.isValid) return;
            slimeWyvernLevel10Advancement(sourceEntity);
            break;
    }
});

/**
 * @param {Player} player 
 */
export async function showAdvancementForm(player) {
    const form = new ActionFormData();
    form.title({ translate: "ui.billeys_mobs.advancements" });
    form.body({ translate: "ui.billeys_mobs.advancements.body" });
    const advs = ADVANCEMENTS
        .filter(a => !a.isHidden || player.hasTag("billeyadv_" + a.name))
        .sort((a, b) => {
            const aIsCompleted = player.hasTag("billeyadv_" + a.name);
            const bIsCompleted = player.hasTag("billeyadv_" + b.name);
            return aIsCompleted - bIsCompleted;
            //subtracting booleans turns them to numbers before subtracting them
        });
    for (const a of advs) {
        const isCompleted = player.hasTag("billeyadv_" + a.name);
        /** @type {import("@minecraft/server").RawMessage[]} */
        let rawText = [{ translate: "advancements.billeys_mobs." + a.name }];
        if (isCompleted)
            rawText = [
                ...rawText,
                { text: "\n" },
                { translate: "ui.billeys_mobs.advancements." + (isCompleted ? "completed" : "not_completed") }
            ];
        form.button(
            {
                rawtext: rawText
            },
            a.icon
        );
    }
    form.button({ translate: "gui.back" });
    const { selection, canceled } = await form.show(player);
    if (canceled) return;
    if (selection == advs.length)
        return showInfoBookForm(player);
    const adv = advs[selection * 1];
    const form2 = new ActionFormData();
    form2.title({ translate: "advancements.billeys_mobs." + adv.name });
    /** @type {string[]} */
    const completedPlayerNames = advancementPlayerCompletionOrder[adv.name] ?? [];
    let rankText = "";
    for (let i = 0; i < completedPlayerNames.length; i++) {
        const color = MEDAL_COLORS[i] ?? "§7";
        rankText += `\n${color} ${i + 1}.§r ${completedPlayerNames[i]}`;
    }
    const isCompleted = player.hasTag("billeyadv_" + adv.name);
    /** @type {import("@minecraft/server").RawMessage[]} */
    let rawText = [
        { translate: `advancements.billeys_mobs.${adv.name}.desc` },
        { text: "\n\n" },
        { translate: "advancements.billeys_mobs.info.rewards" },
        {
            translate: "advancements.billeys_mobs.info.rewards.xp",
            with: ["\n", adv.xp.toString()]
        }
    ];
    const powerBananas = Math.floor(adv.xp / XP_PER_POWER_BANANA);
    if (powerBananas)
        rawText = [
            ...rawText,
            {
                translate: "advancements.billeys_mobs.info.rewards.bananas",
                with: ["\n", powerBananas.toString()]
            }
        ];
    if (adv.trophy)
        rawText = [
            ...rawText,
            {
                translate: "advancements.billeys_mobs.info.rewards.item",
                with: {
                    rawtext: [
                        { text: "\n" },
                        translateItem(adv.trophy)
                    ]
                }
            }
        ];
    if (adv.isHidden)
        rawText = [
            ...rawText,
            { text: "\n\n§e" },
            { translate: "advancements.billeys_mobs.info.is_hidden" }
        ];
    else if (isCompleted)
        rawText = [
            ...rawText,
            { text: "\n\n§a" },
            { translate: "advancements.billeys_mobs.info.is_completed" }
        ];
    if (rankText)
        rawText = [
            ...rawText,
            { text: "\n\n§r" },
            { translate: "advancements.billeys_mobs.info.players_who_have_completed" },
            { text: rankText }
        ];
    else
        rawText = [
            ...rawText,
            { text: "\n\n§e" },
            { translate: "advancements.billeys_mobs.info.be_the_first" }
        ];
    form2.body({
        rawtext: rawText
    });
    form2.button({ translate: "gui.back" });
    const { selection: selection2 } = await form2.show(player);
    if (selection2 === 0)
        showAdvancementForm(player);
}

system.run(() => {
    const lol = world.getDynamicProperty("advancement_player_completion_order");
    if (lol)
        advancementPlayerCompletionOrder = JSON.parse(lol);
    else {
        ADVANCEMENTS.forEach(adv => {
            advancementPlayerCompletionOrder[adv.name] = [];
        });
        world.setDynamicProperty(
            "advancement_player_completion_order",
            JSON.stringify(advancementPlayerCompletionOrder)
        );
    }
});

// AYY LMAO👽👽👽