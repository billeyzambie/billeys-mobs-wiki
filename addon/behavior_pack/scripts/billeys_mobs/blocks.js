import { world, BlockPermutation, system } from "@minecraft/server";
import { playSoundAtEntity } from "./utility";


system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent("billey:banana_peel", {
		onStepOn: (({ entity, block }) => {
			if (!entity) return;
			if (!entity.getComponent("is_tamed") && entity.typeId != "minecraft:item" && (entity.typeId != "minecraft:player" || block.typeId == "billey:banana_peel_player_block")) {
				entity.addEffect("slowness", 20 * 2, { amplifier: 5 });
				entity.addEffect("nausea", 20 * 12, { amplifier: 5 });
				playSoundAtEntity(entity, "billey.banana.slip");
				entity.addTag("billey_slipped");
				entity.dimension.spawnEntity("billey:banana_slipper", entity.location);
				//what i did with that entity is probably possible with scripts now
				block.setPermutation(BlockPermutation.resolve("minecraft:air"));
			}
		})
	});
	blockComponentRegistry.registerCustomComponent("billey:on_step_on_beneficial", {
		onStepOn: (({ entity, block }) => {
			if (!entity) return;
			if (entity.getComponent("is_tamed") || entity.typeId == "minecraft:player") {
				switch (block.typeId) {
					case "billey:blue_velvet_slime_block":
						entity.addEffect("speed", 20 * 1, { amplifier: 3 });
						break;
					case "billey:mixed_velvet_slime_block":
						entity.addEffect("speed", 20 * 1, { amplifier: 1 });
						entity.addEffect("regeneration", 20 * 1, { amplifier: 2 });
						break;
				}
			}
		})
	});
	blockComponentRegistry.registerCustomComponent("billey:on_step_on_detrimental", {
		onStepOn: (({ entity, block }) => {
			if (!entity) return;
			if (!entity.getComponent("is_tamed") && entity.getComponent("type_family").hasTypeFamily("monster")) {
				switch (block.typeId) {
					case "billey:velvet_slime_block":
						entity.addEffect("slowness", 20 * 3, { amplifier: 3 });
						entity.addEffect("wither", 20 * 3, { amplifier: 1 });
						break;
				}
			}
		})
	});
});
