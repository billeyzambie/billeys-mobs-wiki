import { world } from "@minecraft/server";
import { damageItem } from "./utility";

world.afterEvents.entityHitEntity.subscribe(({ hitEntity, damagingEntity }) => {
	if ( damagingEntity.isValid &&
		damagingEntity.getComponent("equippable")?.getEquipment("Mainhand")) {
		let item = damagingEntity.getComponent("equippable").getEquipment("Mainhand");
		switch (item.typeId) {
			case "billey:swordfish":
				damageItem(damagingEntity);
				break;
			case "billey:golden_swordfish":
				damageItem(damagingEntity);
				break;
			case "billey:mergoose_sword":
				damageItem(damagingEntity);
				break;
			case "billey:shark_tooth_sword":
				damagingEntity.addTag("immunetosharksword");
				let lol = damagingEntity;
				if (hitEntity.isValid) {
					hitEntity.addTag("immunetosharksword");
					lol = hitEntity;
				};
				if (lol.isInWater)
					damagingEntity.runCommand("execute @s ^^^2 damage @e[tag=!tamed,type=!xp_orb,type=!item,family=!inanimate,family=!wolf,tag=!immunetosharksword,r=2.25] 11 entity_attack entity @s");
				else
				damagingEntity.runCommand("execute @s ^^^2 damage @e[tag=!tamed,type=!xp_orb,type=!item,family=!inanimate,family=!wolf,tag=!immunetosharksword,r=3.25] 11 entity_attack entity @s");
				damagingEntity.removeTag("immunetosharksword");
				if (hitEntity.isValid) hitEntity.removeTag("immunetosharksword");
				lol.dimension.spawnParticle("billey:wave", lol.location);
				damageItem(damagingEntity);
				break;
		}
	}
});
