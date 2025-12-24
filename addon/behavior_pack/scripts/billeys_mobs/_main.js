import { world, system, Player, ItemStack, CommandPermissionLevel, CustomCommandStatus } from "@minecraft/server";
import "./pet_database";
import "./happiness/petting_happiness";
import "./food";
import "./interactions";
import "./shooters";
import "./interval";
import "./blocks";
import "./swords";
import "./rat_potions";
import "./info_book";
import "./pigeon_mission";
import "./advancements";
import "./morph";
import "./rat_king";
import "./better_pet_owner_saving";
import "./pet_equipment/_index";
import "./catfish_syringe";
import "./pygmy_dunkleosteus";
import "./quality_of_life";
import "./plushies";
import "./roasts";
import "./duckatrice";
import "./leveling";
import "./happiness/happiness";
import "./happiness/owner_presence_happiness";
import "./happiness/buddy_presence_happiness";
import "./happiness/not_sitting_happiness";
import "./happiness/health_happiness";
import "./happiness/travel_happiness";
import "./version";
import "./mercat";
import "./giraffe_cat";
import "./end_rod_projectile";
import "./berry_goose";
import "./fish_tank";
import { playSoundAtEntity } from "./utility";
import { loadPiranhaLauncher } from "./interactions";
import { addOwnerAsDynamicProperty } from "./better_pet_owner_saving";

//this file is a mess

const DEBUG_MODE = false;

if (DEBUG_MODE) {
	system.run(() => world.sendMessage("<Billey's Mobs> §eDebug Mode!"));
	const insignificantEvents = ["switch_movement", "add_sittable", "remove_sittable", "minecraft:entity_spawned"];
	const insignificantScriptEvents = ["billey:add_script_tag"];
	world.afterEvents.dataDrivenEntityTrigger.subscribe(e => {
		if (!insignificantEvents.includes(e.eventId))
			world.sendMessage("§e" + e.entity.typeId + "§f : §e" + e.eventId);
		const modifiers = e.getModifiers();
		/** @type {string[]} */
		let addedComponentGroups = [];
		modifiers.forEach(m => { addedComponentGroups = addedComponentGroups.concat(m.addedComponentGroups); })
		let removedComponentGroups = [];
		modifiers.forEach(m => { removedComponentGroups = removedComponentGroups.concat(m.removedComponentGroups); })
		e.entity.__componentGroups ??= [];
		e.entity.__componentGroups = e.entity.__componentGroups.filter(c => !removedComponentGroups.includes(c));
		addedComponentGroups.forEach(a => {
			if (!e.entity.__componentGroups.includes(a))
				e.entity.__componentGroups.push(a);
		});
	});
	system.afterEvents.scriptEventReceive.subscribe(e => {
		if (!insignificantScriptEvents.includes(e.id))
			world.sendMessage("§b" + e.sourceEntity.typeId + "§f : §b" + e.id + "§f : §b" + e.message);
	});
	world.afterEvents.entitySpawn.subscribe(e => {
		world.sendMessage("§f" + e.entity.typeId + "§7 : §f" + e.cause);
	});
	world.beforeEvents.playerInteractWithEntity.subscribe(({ player, target, itemStack }) => {
		if (itemStack?.typeId == "minecraft:blaze_rod")
			system.run(() => {
				player.sendMessage("§6" + JSON.stringify(target.__componentGroups));
			});
	});
}

world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
	if (eventId == "minecraft:ageable_grow_up")
		playSoundAtEntity(entity, "billey.grow");
});

let parentColor = 0;
let otherParentColor = 0;
const variantToColor = {
	"billey:duck": [2, 5, 0, 1, 6, 3, 4, 7]
};

let ratParentVariant = 0;
let ratOtherParentVariant = 0;
let ratParentMarkVariant = 0;
let ratOtherParentMarkVariant = 0;

/** @type {Player} */
let piranhaLoader;

//pygmy dunks have their own thing
const OLD_PATTERN_PETS = ["billey:rat", "billey:netherrat", "billey:terraphin"];

world.afterEvents.entityLoad.subscribe(world.afterEvents.entitySpawn.subscribe(({ entity }) => {
	if (OLD_PATTERN_PETS.includes(entity.typeId)) {
		system.run(() => {
			if (entity.getProperty("billey:mark_variant") == 1000) {
				entity.setProperty("billey:mark_variant", entity.getComponent("mark_variant").value);
			}
		});
	}
}));

system.afterEvents.scriptEventReceive.subscribe(data => {
	if (!data.sourceEntity?.isValid) return;
	switch (data.id) {
		case "billey:add_script_tag":
			data.sourceEntity.addTag("billey_script_working");
			break;
		case "billey:tame_to_nearest_player":
			system.run(() => {
				data.sourceEntity.getComponent("tameable").tame(
					data.sourceEntity.dimension.getEntities({
						type: "minecraft:player",
						closest: 1
					})[0]
				);
				addOwnerAsDynamicProperty(data.sourceEntity);
			});
			break;
		case "billey:handle_crossbreed":
			switch (data.message) {
				case "parent":
					const parentVariant = data.sourceEntity.getComponent("variant")?.value ?? 0;
					parentColor = variantToColor[data.sourceEntity.typeId][parentVariant];
					break;
				case "other":
					const otherParentVariant = data.sourceEntity.getComponent("variant")?.value ?? 0;
					otherParentColor = variantToColor[data.sourceEntity.typeId][otherParentVariant];
					break;
				case "baby":
					const random = Math.random();
					if (random > 0.5) var newColor = Math.ceil((parentColor + otherParentColor) / 2)
					else var newColor = Math.floor((parentColor + otherParentColor) / 2);
					const newVariant = variantToColor[data.sourceEntity.typeId].indexOf(newColor);
					data.sourceEntity.triggerEvent("set_variant" + newVariant);
					break;
			}
			break;
		case "billey:set_owner_name":
			data.sourceEntity.setDynamicProperty("owner_name", data.message);
			break;
		case "billey:handle_rat_crossbreed":
			//this ensures that the crossbred rat will always look like a mix of its parents
			//and not identical to one of them as happened 50% of the time before this script
			const rat = data.sourceEntity;
			switch (data.message) {
				case "parent":
					ratParentVariant = rat.getComponent("variant").value;
					ratParentMarkVariant = rat.getProperty("billey:mark_variant");
					break;
				case "other":
					ratOtherParentVariant = rat.getComponent("variant").value;
					ratOtherParentMarkVariant = rat.getProperty("billey:mark_variant");
					break;
				case "baby":
					if (ratParentVariant == rat.getComponent("variant").value)
						rat.setProperty("billey:mark_variant", ratOtherParentMarkVariant);
					else// if (ratOtherParentVariant == rat.getComponent("variant").value)
						rat.setProperty("billey:mark_variant", ratParentMarkVariant);
					break;
			}
			break;
		case "billey:load_piranha_launcher_player":
			piranhaLoader = data.sourceEntity;
			break;
		case "billey:load_piranha_launcher_piranha":
			loadPiranhaLauncher(piranhaLoader, data.sourceEntity, piranhaLoader.getComponent("equippable").getEquipment("Mainhand"));
			playSoundAtEntity(piranhaLoader, "mob.cow.milk");
			piranhaLoader = undefined;
			break;
	}
});

system.beforeEvents.watchdogTerminate.subscribe(data => {
	data.cancel = true;
});

const LOADER_DPID = "prev_loader_id";

system.beforeEvents.startup.subscribe(data => {
	data.customCommandRegistry.registerCommand(
		{
			name: "billey:giveinfobook",
			description: "commands.billeys_mobs.giveinfobook.description",
			cheatsRequired: false,
			status: CustomCommandStatus.Success,
			permissionLevel: CommandPermissionLevel.Any
		},
		(origin) => {
			const entity = origin.sourceEntity;
			const player = entity instanceof Player ? entity : undefined;

			if (!player) {
				return {
					status: CustomCommandStatus.Failure,
					message: "commands.billeys_mobs.must_be_by_player",
				};
			}

			const container = player.getComponent("inventory")?.container;
			if (!container) {
				return { status: CustomCommandStatus.Failure, message: "commands.billeys_mobs.no_inventory" };
			}

			if (container.emptySlotsCount > 0) {
				system.run(() => {
					const item = new ItemStack("billey:info_book");
					item.keepOnDeath = true;
					container.addItem(item);
				});
				return { status: CustomCommandStatus.Success, message: "commands.billeys_mobs.giveinfobook.success" };
			}
			else {
				return { status: CustomCommandStatus.Failure, message: "commands.billeys_mobs.full_inventory" };
			};

		}
	);
	data.customCommandRegistry.registerCommand(
		{
			name: "billey:preparetp",
			description: "commands.billeys_mobs.preparetp.description",
			cheatsRequired: false,
			status: CustomCommandStatus.Success,
			permissionLevel: CommandPermissionLevel.Any
		},
		(origin) => {
			const entity = origin.sourceEntity;
			const player = entity instanceof Player ? entity : undefined;

			if (!player) {
				return {
					status: CustomCommandStatus.Failure,
					message: "commands.billeys_mobs.must_be_by_player",
				};
			}

			system.run(() => {
				const prevLoaderId = player.getDynamicProperty(LOADER_DPID);
				if (prevLoaderId) {
					world.getEntity(prevLoaderId)?.remove();
				}
				const newLoader = player.dimension.spawnEntity("billey:chunk_loader", player.location);
				player.setDynamicProperty(LOADER_DPID, newLoader.id);
			});

			return {
				status: CustomCommandStatus.Success,
				message: "commands.billeys_mobs.preparetp.success",
			};

		}
	);
});

world.beforeEvents.chatSend.subscribe((data) => {

	const message = data.message.replace("ex!m", "!");
	if (message.startsWith("!run ")) {
		data.cancel = true;
		system.run(() => {
			data.sender.runCommand(message.slice(5, undefined))
		})
	}
	else if (message.startsWith("!sayas ")) {
		data.cancel = true;
		let message = "";
		message.split(" ").forEach((x, index) => {
			if (index > 1) {
				message += " " + x;
			}
			index++;
		});
		system.run(() => {
			world.sendMessage("<" + message.split(" ")[1] + ">" + message)
		})
	}
	else if (message.startsWith("!raw ")) {
		data.cancel = true;
		system.run(() => {
			world.sendMessage(message.slice(5, undefined))
		})
	}
	else if (message.startsWith("!lore ")) {
		data.cancel = true;
		system.run(() => {
			let item = data.sender.getComponent("equippable").getEquipment("Mainhand");
			item.setLore([message.slice(6, undefined)]);
			data.sender.getComponent("equippable").setEquipment("Mainhand", item);
		})
	}
	else if (message == "!ket") {
		data.cancel = true;
		system.run(() => {
			data.sender.runCommand("kill @e[tag=!tamed]")
		})
	}
	else if (message == "!removebilleytags") {
		data.cancel = true;
		system.run(() => {
			data.sender.getTags().forEach(tag => {
				if (tag.includes("billey")) data.sender.removeTag(tag);
			});
		})
	}
	else if (message == "!givebilleyinfobook") {
		data.cancel = true;
		system.run(() => {
			const container = data.sender.getComponent("inventory").container;
			if (container.emptySlotsCount)
				container.addItem(new ItemStack("billey:info_book"));
			else
				data.sender.sendMessage("§cThere are no empty slots in your inventory.");
		})
	}
	else if (message == "!resetinfobook") {
		data.cancel = true;
		system.run(() => {
			data.sender.setDynamicProperty("got_info_book2", undefined);
		})
	}
});