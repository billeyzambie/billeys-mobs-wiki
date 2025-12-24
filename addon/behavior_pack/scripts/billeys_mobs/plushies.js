import { world, system, ItemStack, EnchantmentType, Player } from "@minecraft/server";
import { registerPetEquipment } from "./pet_equipment/registry";
import { normalize, subtract } from "./utility";

const SIMPLE_PLUSHIES = ["billey:rubber_ducky"];
const PLUSHIES = ["billey:slime_wyvern_plushie", "billey:rubber_ducky", "billey:mercat_plushie"];

for (const plushie of PLUSHIES) {
	registerPetEquipment("Head", plushie, {
		isBrave: plushie == "billey:rubber_ducky",
		isDyeable: false
	});
}

system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) =>
	itemComponentRegistry.registerCustomComponent("billey:plushie", {
		onUseOn: ({ itemStack: item }) => {
			const subscription = world.afterEvents.entitySpawn.subscribe(({ entity }) => {
				if (entity.typeId != "billey:plushie") return;
				world.afterEvents.entitySpawn.unsubscribe(subscription);

				entity.nameTag = item.nameTag ?? "";
				const enchantments = item.getComponent("enchantable")?.getEnchantments() ?? [];

				const serializedEnchantments = serializeEnchantments(item);
				entity.setDynamicProperty("enchantment_data", serializedEnchantments);
				if (enchantments.length)
					entity.setProperty("billey:is_enchanted", true);

				for (const dpid of item.getDynamicPropertyIds()) {
					if (dpid.startsWith("ENTITY_"))
						entity.setDynamicProperty(
							dpid.slice(7),
							item.getDynamicProperty(dpid)
						);
					else
						entity.setDynamicProperty(
							"ITEM_" + dpid,
							item.getDynamicProperty(dpid)
						);
				}

				entity.setDynamicProperty("ITEM_LORE", JSON.stringify(item.getLore()));

			});
		}
	})
);

/** @type {Player|undefined} */
let plushieSqueezer;

system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity, id }) => {
	switch (id) {
		case "billey:set_plushie_squeezer":
			plushieSqueezer = sourceEntity;
			return;
		case "billey:plushie_say_owner": {
			if (!plushieSqueezer?.isValid) return;
			/** @type {string|undefined} */
			const ownerName = sourceEntity.getDynamicProperty("ITEM_owner_name");
			const variant = sourceEntity.getComponent("variant")?.value ?? 0;
			if (ownerName) {
				plushieSqueezer.sendMessage({
					translate: "ui.billeys_mobs.info.plushie" + variant,
					with: [ownerName]
				});
			}
			else if (!SIMPLE_PLUSHIES.includes(PLUSHIES[variant]))
				plushieSqueezer.sendMessage({
					translate: "ui.billeys_mobs.info.plushie.no_owner"
				});
			plushieSqueezer = undefined;
			return;
		}
		case "billey:plushie_destroyed": {
			const variant = sourceEntity.getComponent("variant").value;
			const item = new ItemStack(PLUSHIES[variant]);

			item.nameTag = sourceEntity.nameTag;

			const serializedEnchantments = sourceEntity.getDynamicProperty("enchantment_data");
			deserializeEnchantments(item, serializedEnchantments)

			for (const dpid of sourceEntity.getDynamicPropertyIds()) {
				if (dpid == "ITEM_LORE")
					item.setLore(JSON.parse(sourceEntity.getDynamicProperty(dpid)));
				else if (dpid.startsWith("ITEM_"))
					item.setDynamicProperty(
						dpid.slice(5),
						sourceEntity.getDynamicProperty(dpid)
					);
				else if (dpid != "enchantment_data")
					item.setDynamicProperty(
						"ENTITY_" + dpid,
						sourceEntity.getDynamicProperty(dpid)
					);
			}

			sourceEntity.dimension.spawnItem(
				item,
				sourceEntity.location
			);
			sourceEntity.remove();
			return;
		}
	}
});

/**
 * @param {ItemStack} item 
 * @param {string} serializedEnchantments 
 */
export function deserializeEnchantments(item, serializedEnchantments) {
	const enchantable = item.getComponent("enchantable");
	if (serializedEnchantments && enchantable)
		serializedEnchantments.split(",").forEach(e => {
			const lol = e.split(" ");
			enchantable.addEnchantment(
				{
					level: lol[1] * 1, // * 1 converts the string to a number
					type: new EnchantmentType(lol[0])
				}
			);
		});
}

/** @param {ItemStack} item  */
export function serializeEnchantments(item) {
	let serializedEnchantments = "";
	const enchantable = item.getComponent("enchantable");
	if (!enchantable) return;
	const enchantments = enchantable.getEnchantments();
	for (let index = 0; index < enchantments.length; index++) {
		const e = enchantments[index];
		if (index) serializedEnchantments += ",";
		serializedEnchantments += `${e.type.id} ${e.level}`;
	}
	return serializedEnchantments;
}