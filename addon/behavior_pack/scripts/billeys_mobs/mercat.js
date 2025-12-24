import { ItemStack, Player, system, WeatherType, world } from "@minecraft/server";
import { giveAdvancement } from "./advancements";

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity: mercat }) => {
    if (!mercat?.isValid)
        return;
    if (id != "billey:finish_ritual")
        return;

    const { dimension, location } = mercat;

    let totalRitualPlayers = 0;

    for (const player of world.getAllPlayers()) {
        const nearbyMercats = player.dimension.getEntities({
            maxDistance: 10,
            type: "billey:mercat",
            location: player.location
        });
        if (nearbyMercats.some(m => m.getProperty("billey:in_ritual")))
            totalRitualPlayers += 1;
    }

    if (
        dimension.id == "minecraft:overworld"
        && totalRitualPlayers
        >= world.getAllPlayers().length / 2
    ) {
        if (dimension.getWeather() == WeatherType.Clear)
            dimension.setWeather(WeatherType.Thunder);
        else
            dimension.setWeather(WeatherType.Clear);
    }
    else {
        dimension.spawnItem(new ItemStack("nautilus_shell"), location);
    }
    mercat.removeEffect("slowness");
    mercat.setProperty("billey:in_ritual", false);
});

/** @param {Player} player  */
export function onPlayerGetOnBed(player) {
    const mercats = player.dimension.getEntities({ location: player.location, maxDistance: 15, type: "billey:mercat" });
    for (const mercat of mercats) {
        if (
            !mercat.getProperty("billey:is_sitting")
            && mercat.getProperty("billey:follow_owner_state") == "following"
            && mercat.getComponent("tameable")?.tamedToPlayer == player
        ) {
            player.__isSleepingWithMercat = true;
            return;
        }
    }
    player.__isSleepingWithMercat = undefined;
}

const MERCAT_SLEEP_STREAK_DPID = "mercat_sleep_streak";

/** @param {Player} player  */
export function onPlayerGetOutOfBed(player) {
    if (world.getTimeOfDay() == 0) {
        if (player.__isSleepingWithMercat) {
            player.setDynamicProperty(
                MERCAT_SLEEP_STREAK_DPID,
                (player.getDynamicProperty(MERCAT_SLEEP_STREAK_DPID) ?? 0) + 1
            );

            if (
                player.getDynamicProperty(MERCAT_SLEEP_STREAK_DPID) >= 20
                && !player.hasTag("billeyadv_mercat_napper")
            ) {
                giveAdvancement(player, "mercat_napper");
            }
        }
        else {
            player.setDynamicProperty(
                MERCAT_SLEEP_STREAK_DPID,
                0
            );
        }
    }
    player.__isSleepingWithMercat = undefined;
}