import { world, ItemStack, system, EquipmentSlot, GameMode } from "@minecraft/server";
import { calculateDamage, playSoundAtEntity } from "./utility";

/**
 * See utility.js/shoot
 */
world.beforeEvents.itemUse.subscribe((data) => {
	//this file is kinda shittily coded because it was among the first things i did with scripts
	//if you are seeing this comment then i forgot to improve it
	switch (data.itemStack.typeId) {
		case "billey:loaded_piranha_launcher":
			if (data.source.isInWater || data.source.isSneaking
				|| data.source.getItemCooldown("piranha_launcher"))
				data.cancel = true;
			else {
				system.run(() => {
					let piranhaCount = 1;
					if (data.itemStack.getLore().length) piranhaCount = data.itemStack.getLore()[0];
					if (data.source.getGameMode() == GameMode.Creative) return;
					if (piranhaCount <= 1) {
						let emptyLauncher = new ItemStack("billey:piranha_launcher");
						emptyLauncher.nameTag = data.itemStack.nameTag;
						emptyLauncher.getComponent("enchantable").addEnchantments(data.itemStack.getComponent("enchantable").getEnchantments());
						emptyLauncher.getComponent("durability").damage = data.itemStack.getComponent("durability").damage + calculateDamage(data.itemStack);
						if (emptyLauncher.getComponent("durability").damage == emptyLauncher.getComponent("durability").maxDurability) {
							data.source.getComponent("equippable").setEquipment(EquipmentSlot.Mainhand, undefined);
							playSoundAtEntity(data.source, "random.break");
						}
						else data.source.getComponent("equippable").setEquipment(EquipmentSlot.Mainhand, emptyLauncher);
					}
					else {
						let item = data.itemStack;
						item.setLore([(piranhaCount - 1).toString()]);
						item.getComponent("durability").damage += calculateDamage(item);
						if (item.getComponent("durability").damage == item.getComponent("durability").maxDurability) {
							data.source.getComponent("equippable").setEquipment(EquipmentSlot.Mainhand, new ItemStack("billey:piranha", item.getLore()[0] * 1));
							playSoundAtEntity(data.source, "random.break");
						}
						else data.source.getComponent("equippable").setEquipment(EquipmentSlot.Mainhand, item);
					}
				});
			};
			break;
		case "billey:mergoose_sword":
			system.run(() => {
				if (data.source.getGameMode() == GameMode.Creative) return;
				let item = data.itemStack;
				item.getComponent("durability").damage += calculateDamage(item);
				if (item.getComponent("durability").damage == item.getComponent("durability").maxDurability) {
					data.source.getComponent("equippable").setEquipment(EquipmentSlot.Mainhand, undefined);
					playSoundAtEntity(data.source, "random.break");
				}
				else data.source.getComponent("equippable").setEquipment(EquipmentSlot.Mainhand, item);
			});
			break;
	}
});