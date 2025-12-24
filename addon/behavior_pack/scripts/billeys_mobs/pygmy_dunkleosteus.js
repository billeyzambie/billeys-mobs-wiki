import { world, system, EquipmentSlot, ContainerSlot, ItemStack, Entity, InvalidContainerError } from "@minecraft/server";
import { decrementStack, itemEnglishName, nameOf, playSoundAtEntity, titleCase } from "./utility";
import { addOwnerAsDynamicProperty } from "./better_pet_owner_saving";

//This entire file is a fooking mess because I wanted to do it in an hour

/**
 * The durability of a single pygmy dunk scute
 */
const PYGMY_DUNK_SCUTE_DURABILITY = 100;
const ARMOR_SLOT_NAMES = [
	"Head",
	"Chest",
	"Legs",
	"Feet"
];
const REINFORCIBLE_ITEM_TYPE_IDS = [
	"billey:duck_hat",
	"minecraft:elytra",
	"minecraft:turtle_helmet",
	"minecraft:iron_helmet",
	"minecraft:iron_chestplate",
	"minecraft:iron_leggings",
	"minecraft:iron_boots"
];

const INVIS_MARK_VARIANT = 56;

/**
 * @param {Entity} pygmyDunk
 */
function setPygmyDunkMarkVariant(pygmyDunk) {
	const markVariantProperty = pygmyDunk.getProperty("billey:mark_variant");
	const markVariantComponentValue = pygmyDunk.getComponent("mark_variant").value;

	if (markVariantProperty == INVIS_MARK_VARIANT && markVariantComponentValue != INVIS_MARK_VARIANT) {
		pygmyDunk.setProperty("billey:mark_variant", markVariantComponentValue);
		return;
	}

	const variantValue = pygmyDunk.getComponent("variant").value;

	if (
		markVariantProperty != INVIS_MARK_VARIANT
		&& (
			markVariantProperty < variantValue * 7
			|| markVariantProperty >= (variantValue + 1) * 7
		)
	) {
		return;
	}

	pygmyDunk.setProperty("billey:mark_variant", (
		variantValue * 7
		+
		Math.floor(Math.random() * 7)
	));
}

system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity: pygmyDunk, id }) => {
	if (id == "billey:pygmy_dunk_set_mark_variant")
		setPygmyDunkMarkVariant(pygmyDunk);
});

world.afterEvents.entityLoad.subscribe(({ entity }) => {
	if (entity.typeId == "billey:pygmy_dunkleosteus")
		setPygmyDunkMarkVariant(entity);
});

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource: { damagingEntity } }) => {
	if (!damagingEntity) return;
	if (damagingEntity.typeId != "billey:pygmy_dunkleosteus"
		|| deadEntity.typeId != "billey:pizzafish")
		return;
	if (damagingEntity.getComponent("is_tamed")) return;
	const pizzafishOwner = deadEntity.getComponent("tameable").tamedToPlayer;
	if (!pizzafishOwner) {
		damagingEntity.dimension.getEntities({
			type: "minecraft:player",
			maxDistance: 4,
			location: damagingEntity.location,
			closest: 1
		})[0]
			?.sendMessage("§7The pizzafish was either not yours or not tamed");
		return;
	}
	damagingEntity.getComponent("tameable").tame(pizzafishOwner);
	pizzafishOwner.sendMessage(["§7You have tamed ", nameOf(damagingEntity)]);
	addOwnerAsDynamicProperty(damagingEntity);
});

world.afterEvents.itemUse.subscribe(({ source: player, itemStack }) => {
	if (itemStack.typeId != "billey:pygmy_dunkleosteus_scutes") return;
	const equippable = player.getComponent("equippable");
	let armorSlot;
	for (const slotName of ARMOR_SLOT_NAMES) {
		const armorSlot2 = equippable.getEquipmentSlot(slotName);
		if (armorSlot2?.hasItem()) {
			if (armorSlot2.getDynamicProperty("reinforcement"))
				continue;
			if (
				!REINFORCIBLE_ITEM_TYPE_IDS.includes(armorSlot2.typeId)
				&&
				!armorSlot2.typeId.endsWith("_plushie")
			)
				continue;
			if (armorSlot?.hasItem())
				break;
			armorSlot = armorSlot2;
		}
	}
	if (!armorSlot) return;
	const newArmorItem = armorSlot.getItem();
	newArmorItem.setDynamicProperty("reinforcement", PYGMY_DUNK_SCUTE_DURABILITY);
	newArmorItem.setLore([
		...newArmorItem.getLore(),
		"§r§6Reinforced"
	]);
	armorSlot.setItem(newArmorItem);
	decrementStack(player);
});

world.afterEvents.entityHurt.subscribe(
	({ hurtEntity, damage }) => {
		if (!hurtEntity.isValid) return;
		let reinforcedArmorProtection = 0;
		for (const slotName of ARMOR_SLOT_NAMES) {
			const armor = hurtEntity.getComponent("equippable").getEquipment(slotName);
			if (!armor) continue;
			if (armor.maxAmount != 1) continue;
			const reinforcementDurability = armor.getDynamicProperty("reinforcement");
			if (reinforcementDurability === undefined) continue;
			const newReinforcementDurability = reinforcementDurability - 1;
			if (newReinforcementDurability > 0)
				armor.setDynamicProperty("reinforcement", newReinforcementDurability);
			else {
				armor.setDynamicProperty("reinforcement", undefined);
				armor.setLore(
					armor.getLore().filter(l => l != "§r§6Reinforced")
				);
				playSoundAtEntity(hurtEntity, "random.break", { pitch: 1.5 });
				let color = "§f";
				if (armor.getComponent("enchantable").getEnchantments().length)
					color = "§b";
				if (armor.nameTag == `§r${color}Reinforced ${itemEnglishName(armor)}`)
					armor.nameTag = "";
			}
			hurtEntity.getComponent("equippable").setEquipment(slotName, armor);
			if (armor.typeId.startsWith("minecraft:iron_"))
				reinforcedArmorProtection += 0.125;
			else
				reinforcedArmorProtection += 0.25;
		};
		if (!reinforcedArmorProtection) return;
		const health = hurtEntity.getComponent("health");
		health.setCurrentValue(health.currentValue + damage * reinforcedArmorProtection);
	},
	{
		entityTypes: ["minecraft:player"] //just found out this is a thing, pretty cool
	}
);