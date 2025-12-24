import { world, ItemStack, system, GameMode, Entity, Player, EntityMovementAmphibiousComponent } from "@minecraft/server";
import { addItemToPigeon, pigeonUI } from "./pigeon_mission";
import { playerPetDuckatrice } from "./duckatrice";
import { PettingHappiness } from "./happiness/petting_happiness";
import { DEFAULT_HAPPINESS_VALUE, MAX_HAPPINESS } from "./happiness/happiness";
import { xpOfNextLevel } from "./leveling";
import { showPetStatForm } from "./quality_of_life";

const lvl10XP = 10 * 810 //xp_level10

world.beforeEvents.playerInteractWithEntity.subscribe(data => {
	let mob = data.target;
	let player = data.player;
	let dimension = player.dimension;
	let item = data.itemStack;
	if (!item) {
		if (player.isSneaking && mob.typeId.startsWith("billey:") && mob.getComponent("is_tamed")) {
			data.cancel = true;
			system.run(() => {
				player.playAnimation("animation.billeys_mobsplayer.pet");
				mob.triggerEvent("bepetted");
				if (mob.typeId.includes("cat"))
					dimension.playSound("mob.cat.purr", mob.location);
				if (mob.typeId == "billey:pigeon" && mob.getProperty("billey:has_backpack")
					&& player.name == mob.getDynamicProperty("owner_name")) {
					pigeonUI(player, mob, dimension);
				}
				if (mob.typeId == "billey:duckatrice") {
					playerPetDuckatrice(player, mob);
				}
			});
		}
	}
	else if (player.isSneaking && mob.typeId == "billey:pigeon" && mob.getProperty("billey:has_backpack")
		&& player.name == mob.getDynamicProperty("owner_name")) {
		data.cancel = true;
		system.run(() => {
			addItemToPigeon(player, mob, item, dimension);
		})
	}
	else if (item.typeId == "billey:pigeon_backpack" && mob.typeId == "billey:pigeon"
		&& mob.getProperty("billey:has_backpack") && player.name == mob.getDynamicProperty("owner_name")) {
		let container = mob.getComponent("inventory").container;
		let items = [];
		for (let index = 0; index < container.size; index++) {
			let λ = container.getItem(index);
			if (λ) items.push(λ);
		}
		system.run(() => {
			items.forEach(ξ => dimension.spawnItem(ξ, mob.location));
		})
	}
	else if (item.typeId == "minecraft:leather" && mob.hasComponent("is_tamed")) {
		//this was the very first thing i did with scripts so it's shittily done
		//if you're reading this then i forgot to improve it
		data.cancel = mob.typeId.startsWith("billey:");
		if (mob.nameTag == "") {
			player.runCommand("tellraw @s {\"rawtext\":[{\"text\":\"\\n§d\"},{\"translate\":\"entity." + mob.typeId + ".name" + "\"}]}");
		} else {
			player.runCommand("tellraw @s {\"rawtext\":[{\"text\":\"\\n§d" + mob.nameTag + "\"}]}");
		}
		if (mob.typeId.startsWith("billey:") && mob.getComponent("is_tamed"))
			player.runCommand("tellraw @s {\"rawtext\":[{\"text\":\"Owner:§9 " +
				mob.getDynamicProperty("owner_name") + "\"}]}");
		let currentXP = Math.floor(10 * mob.getProperty("billey:xp"));
		let level = mob.getProperty("billey:level");
		player.runCommand("tellraw @s {\"rawtext\":[{\"text\":\"Health:§9 " + Math.floor(mob.getComponent("health").currentValue) + " / " + mob.getComponent("health").effectiveMax + "\"}]}");
		let nextXP = xpOfNextLevel(level);
		if (level)
			player.runCommand("tellraw @s {\"rawtext\":[{\"text\":\"Level:§9 " + level + "\"}]}");
		if (level < 10) {
			player.runCommand("tellraw @s {\"rawtext\":[{\"text\":\"XP:§9 " + currentXP + "\"}]}");
			player.runCommand("tellraw @s {\"rawtext\":[{\"text\":\"XP required for Level " + (level + 1) + ":§a " + nextXP + " §7(" + Math.max(nextXP - currentXP, 1) + " left)" + "\"}]}");
		}
		if (data.cancel) {
			system.run(() => {
				showPetStatForm(player, mob);
			});
		}
		//player.runCommand("tellraw @s {\"rawtext\":[{\"translate\":\"chat.billeys_mobs.not_levelable\"}]}");
	}
	else if (item.typeId.startsWith("billey:to_level") && mob.getProperty("billey:level")
		&& mob.hasComponent("is_tamed") && !mob.hasComponent("is_baby")) {
		data.cancel = true;
		system.run(() => {
			mob.triggerEvent(item.typeId.slice(7));
			mob.addEffect("instant_health", 1, { amplifier: 255 });
			if (player.getGameMode() != GameMode.Creative)
				player.getComponent("equippable").setEquipment("Mainhand", undefined);
		});
	}/*
	const mobWasntTamed = !mob.getComponent("is_tamed");
	system.run(() => {
		if (mobWasntTamed && mob.getComponent("is_tamed")) {
			mob.setDynamicProperty("owner_name", player.name);
			mob.setDynamicProperty("owner_id", player.id);
		}
	});*/
});

/**
 * @param {Player} player 
 * @param {Entity} piranha 
 * @param {ItemStack} item 
 */
export function loadPiranhaLauncher(player, piranha, item) {
	if (item.typeId == "billey:piranha_launcher") {
		let name = item.nameTag;
		let durability = item.getComponent("durability").damage;
		let enchantments = item.getComponent("enchantable").getEnchantments();
		item = new ItemStack("billey:loaded_piranha_launcher");
		item.getComponent("durability").damage = durability;
		item.setLore(["0"]);
		item.getComponent("enchantable").addEnchantments(enchantments);
		item.nameTag = name;
	}
	else if (!item.getLore().length) item.setLore(["1"]);
	if (item.getLore() * 1 < 64) {
		item.setLore([(item.getLore() * 1 + 1).toString()]);
		player.getComponent("equippable").setEquipment("Mainhand", item);
		player.startItemCooldown("piranha_launcher", 20);
		piranha.remove();
	} else player.sendMessage({ translate: "chat.billeys_mobs.piranha64" });
}

world.afterEvents.playerInteractWithEntity.subscribe((data) => {
	let item = data.itemStack;
	if (!item) return;
	let mob = data.target;
	let player = data.player;
	if ((item.typeId == "billey:piranha_launcher" || item.typeId == "billey:loaded_piranha_launcher") && mob.typeId == "billey:piranha" && (mob.getComponent("is_tamed") === undefined || mob.getComponent("variant").value != 2 || mob.hasTag("thrown_piranha"))) {
		loadPiranhaLauncher(player, mob, item);
	}
});