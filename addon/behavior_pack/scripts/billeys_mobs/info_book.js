import { world, ItemStack, Player, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { showAdvancementForm } from "./advancements";
import { BILLEYS_MOBS } from "./billeys_mobs_list";
import { showSettingForm } from "./quality_of_life";
import { add, magnitudeXY, magnitudeXZ, subtract } from "./utility";
import { getIsAnniversary, giveAnniversaryPetHatsOfAlreadyDoneAdvancements } from "./pet_equipment/anniversary_hats";
import { showPetEquipmentInfoForm } from "./pet_equipment/info_book_page";
import { listPetsToPlayerForm } from "./better_pet_owner_saving";

const categories = [
	"recommended",
	"dinosaur",
	"other",
	"water",
	"pet_equipment",
	"boss",
	"advancement",
	"cat",
	"settings",
	"your_pets"
];

export const INFOLESS_PETS = new Set([
	"billey:rat_minion",
	"billey:duck_minion",
	"billey:pigeon_minion",
	"billey:deinonychus_minion",
	"billey:yutyrannus_minion"
]);

const tipCount = 10;

world.afterEvents.playerSpawn.subscribe(({ player }) => {
	if (!player.getDynamicProperty("got_info_book2")) {
		player.__prevRotation = player.getRotation();
		player.__toGetInfoBook = true;
	}
});

/**
 * @param {Player} player 
 */
export function giveInfoBookOnMove(player) {
	if (player.__hasMoved && player.__hasLooked) {

		system.runTimeout(() => {
			if (!player.isValid)
				return;

			const mainhand = player.getComponent("equippable").getEquipmentSlot("Mainhand");

			const infoBook = new ItemStack("billey:info_book");
			infoBook.keepOnDeath = true;

			if (mainhand.hasItem() && mainhand.lockMode != "none") {
				player.dimension.spawnItem(infoBook, player.location);
			}
			else {
				const item = mainhand.getItem();
				mainhand.setItem(infoBook);
				const headLocation = player.getHeadLocation();
				system.runTimeout(() => {
					//if mainhand.hasitem() didnt work
					try {
						player.dimension.spawnItem(item, player.location)
							.applyImpulse(headLocation);
					} catch (error) { }
					player.sendMessage({ text: "\n" });
					player.sendMessage({ translate: "chat.billeys_mobs.got_info_book" });
					player.playSound("random.orb");
					player.playSound("billey.duckatrice.summon", { pitch: 2.0 });
					player.setDynamicProperty("got_info_book2", true);
				}, 2);
				system.runTimeout(() => {
					giveAnniversaryPetHatsOfAlreadyDoneAdvancements(player);
				}, 12);
			}
		}, 40);

		player.__toGetInfoBook = undefined;
		player.__hasMoved = undefined;
		player.__hasLooked = undefined;
		player.__prevRotation = undefined;
	}

	player.__hasMoved ||= !!magnitudeXZ(player.getVelocity());
	player.__hasLooked ||= player.__prevRotation && !!magnitudeXY(subtract(player.getRotation(), player.__prevRotation));
}

world.afterEvents.itemUse.subscribe(({ itemStack, source: player }) => {
	if (itemStack.typeId == "billey:info_book")
		showInfoBookForm(player);
});

/**
 * @param {Player} player 
 */
export function showInfoBookForm(player) {
	const form = new ActionFormData();
	form.title({ translate: "item.billey:info_book" });

	let bodyText = [];

	if (getIsAnniversary()) {
		bodyText = [{ translate: "ui.billeys_mobs.info.anniversary" }, { "text": "\n\n§r" }];
	}

	bodyText = [...bodyText, { translate: "ui.billeys_mobs.info.body" }];
	form.body({ rawtext: bodyText });
	categories.forEach(c => {
		form.button({
			rawtext: [
				{ translate: "ui.billeys_mobs.info.category." + c },
				{ text: "\n§r§8" },
				{ translate: `ui.billeys_mobs.info.category.${c}.desc` },
			]
		}, c == "settings" ? "textures/ui/icon_setting" : "textures/billey_icons/" + c);
	});
	form.show(player).then(({ canceled, selection }) => {
		if (!canceled) {
			/**
			 * @type {string}
			*/
			const c = categories[selection];

			if (c == "advancement")
				return showAdvancementForm(player);
			if (c == "settings")
				return showSettingForm(player);
			if (c == "pet_equipment")
				return showPetEquipmentInfoForm(player);
			if (c == "your_pets")
				return listPetsToPlayerForm(player);

			const mobs = BILLEYS_MOBS.filter(mob => {
				if (mob.category instanceof Array)
					return mob.category.includes(c);
				else return mob.category == c;
			});
			const form = new ActionFormData();
			form.title({ translate: "ui.billeys_mobs.info.category." + c });
			form.body({ translate: "ui.billeys_mobs.info.select_mob" });
			mobs.forEach(mob => {
				form.button(
					{ translate: `entity.billey:${mob.id}.name` },
					"textures/billey_icons/" + mob.id
				);
			});
			form.button({ translate: "gui.back" });
			form.show(player).then(({ canceled, selection }) => {
				if (canceled)
					return;
				if (selection == mobs.length)
					return showInfoBookForm(player);
				const mob = mobs[selection * 1];
				showPetTypeInfo(player, mob.id);
			});
		}
	});
}

export function showPetTypeInfo(player, petTypeIdWithoutNamespace) {
	player.sendMessage({
		rawtext: [
			{ text: "\n" },
			{
				translate: "ui.billeys_mobs.info." + petTypeIdWithoutNamespace,
				with: ["\n"]
			}
		]
	});
	const tipNumber = player.getDynamicProperty("next_tip") ?? 1;
	player.sendMessage({
		rawtext: [
			{ text: "\n" },
			{ translate: "ui.billeys_mobs.info.tip" + tipNumber },
			{ text: "\n\n§fOpen the chat to read " },
			{ translate: `entity.billey:${petTypeIdWithoutNamespace}.name` },
			{ text: "'s info." }
			/*as you can see i was originally going for everything to be
			translateable but eventually i gave up*/
		]
	});
	if (tipNumber == tipCount)
		player.setDynamicProperty("next_tip", 1);
	else
		player.setDynamicProperty("next_tip", tipNumber + 1);
}