import { world } from "@minecraft/server";
import { beneficalEffects, playSoundAtEntity } from "./utility";
import { trueBeneficialEffects } from "./utility";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";

//will switch to custom component when hcf is removed,
//since currently turning it on breaks them

//also, this way of doing it only works for players and not foxes, geese, etc.


//Later comment: HCF is now finally gone, will switch to custom components soon
world.afterEvents.itemCompleteUse.subscribe(data => {
	switch (data.itemStack.typeId) {
		case "billey:pizzapiece":
			let random = Math.random();
			if (random >= 0.95)
				data.source.addEffect("slowness", 60, { amplifier: 2 });
			else if (random >= 0.5)
				data.source.addEffect("regeneration", 140, { amplifier: 3 });
			break;
		case "billey:sand_banana":
			data.source.addEffect(beneficalEffects[Math.floor(Math.random() * beneficalEffects.length)], 200, { amplifier: 1 });
			if (Math.random() >= 0.95) data.source.addEffect("levitation", 40);
			break;
		case "billey:power_banana":
			trueBeneficialEffects.forEach(effect => {
				data.source.addEffect(effect, 200, { amplifier: 2 });
			});
			break;
		case "billey:betta_fish":
			data.source.addEffect("night_vision", 240);
			data.source.addEffect("blindness", 40);
			data.source.addEffect("nausea", 100);
			data.source.addEffect("levitation", 20, { amplifier: 1 });
			break;
		case "billey:chocolate_catfish":
			data.source.addEffect("speed", 400, { amplifier: 3 });
			data.source.runCommand("execute @s[tag=!billeyadv_chocolate_catfish] ~~~ scriptevent billey:advancement chocolate_catfish");
			break;
		case "billey:cooked_snail":
			data.source.addEffect("strength", 300);
			break;
		case "billey:cooked_snail_s":
			data.source.addEffect("speed", 300);
			break;
		case "billey:cooked_snail_w":
			data.source.addEffect("regeneration", 300);
			break;
		case "billey:glistering_melon_goose":
			data.source.addEffect("speed", 200, { amplifier: 1 });
			data.source.addEffect("regeneration", 200, { amplifier: 1 });
			data.source.addEffect("instant_health", 1, { amplifier: 30 });
			data.source.addEffect("levitation", 20);
			break;
		case "billey:raw_hamster":
			if (Math.random() >= 0.5)
				data.source.addEffect("fatal_poison", 200, { amplifier: 1 });
			break;
		case "billey:ice_cream":
			//ice cream gives different effects based on biome.
			//Detecting biome with scripts is currently impossible
			//so i used a workaround with a dummy entity
			data.source.addTag("billey_just_ate_ice_cream");
			data.source.dimension.spawnEntity("billey:ice_cream_effects", data.source.location);
			break;
		case "billey:raw_mergoose_tongue":
			data.source.applyDamage(7, { cause: "thorns" });
			break;
		case "billey:cooked_mergoose_tongue":
			data.source.applyDamage(4, { cause: "thorns" });
			data.source.addEffect("regeneration", 100);
			data.source.addEffect("strength", 140, { amplifier: 1 });
			break;
		case "billey:poultry_orange":
			data.source.removeEffect("poison");
			data.source.removeEffect("fatal_poison");
			data.source.removeEffect("wither");
			break;
		case "billey:pickle_juice":
			if (Math.random() >= 0.9) data.source.addEffect("fatal_poison", 100);
			if (Math.random() >= 0.9) data.source.addEffect("poison", 100, { amplifier: 1 });
			if (Math.random() >= 0.67) data.source.addEffect("speed", 100, { amplifier: 1 });
			if (Math.random() >= 0.67) data.source.addEffect("night_vision", 100, { amplifier: 1 });
			break;
		case "billey:rat_beer":
			data.source.addEffect("strength", 300, { amplifier: 2 });
			data.source.addEffect("nausea", 300);
			if (Math.random() >= 0.9) data.source.addEffect("poison", 100);
			if (Math.random() >= 0.5) data.source.addEffect("weakness", 100);
			break;
		case "billey:warped_wine":
			data.source.applyDamage(4, { cause: "fire" });
			data.source.addEffect("haste", 300, { amplifier: 3 });
			data.source.addEffect("nausea", 300);
			if (Math.random() >= 0.9) data.source.addEffect("poison", 100);
			if (Math.random() >= 0.5) data.source.addEffect("mining_fatigue", 100);
			break;
		case "billey:swordcooked":
			if (Math.random() >= 0.95) data.source.addEffect("water_breathing", 200);
			/*let form = new ActionFormData().title("Teleport to Pet").body("Select the pet you want to teleport to");
			let pets = data.source.dimension.getEntities({ tags: ["tamed"] })
			.filter(pet => pet.typeId.startsWith("billey:"))
			.sort( (x,y) => {
				let a = x.nameTag;
				let b = y.nameTag;
				if (!b) return -1;
				else if (!a) return 1;
				else {
					a = a.toUpperCase();
					b = b.toUpperCase();
					if (a==b) return 0;
					else if (a>b) return 1;
					else if (a<b) return -1;
				}
			});
			let petIds = [];
			pets.forEach(pet => {
					form.button({
						rawtext: [{
							text: pet.nameTag
						}, { translate: (pet.nameTag == "" ? `entity.${pet.typeId}.name` : "") }]
					}, "textures/billey_icons/" + pet.typeId.split(":")[1]);
					petIds.push(pet.id);
			})
			form.show(data.source).then(lol => {
				if (!lol.canceled){
					data.source.teleport(world.getEntity(petIds[lol.selection * 1]).location);
				}
			});*/
			break;
		case "billey:raw_snail":
			data.source.addEffect("weakness", 300, { amplifier: 1 });
			break;
		case "billey:raw_snail_s":
			data.source.addEffect("slowness", 300, { amplifier: 1 });
			break;
		case "billey:raw_snail_w":
			data.source.addEffect("withering", 300, { amplifier: 1 });
			break;
		case "billey:ratatouille":
			data.source.addEffect("regeneration", 300);
			data.source.addEffect("resistance", 300, { amplifier: 1 });
			data.source.addEffect("night_vision", 400);
			data.source.runCommand("execute @s[tag=!billeyadv_ratatouille] ~~~ scriptevent billey:advancement ratatouille");
			break;
		case "billey:spicy_ratatouille":
			data.source.applyDamage(8, { cause: "fire" });
			data.source.addEffect("regeneration", 300);
			data.source.addEffect("resistance", 300, { amplifier: 1 });
			data.source.addEffect("fire_resistance", 300);
			data.source.runCommand("execute @s[tag=!billeyadv_ratatouille] ~~~ scriptevent billey:advancement ratatouille");
			break;
		case "billey:mercat_milk":
			data.source.applyDamage(8, { cause: "fire" });
			data.source.addEffect("regeneration", 300);
			data.source.addEffect("resistance", 300, { amplifier: 1 });
			data.source.addEffect("fire_resistance", 300);
			break;
		case "billey:golden_gooseberries":
		case "billey:gooseberries":
			const prevTime = data.source.getDynamicProperty("gooseberry_thorn_time") ?? 0;
			data.source.setDynamicProperty("gooseberry_thorn_time", prevTime + 120);
			playSoundAtEntity(data.source, "billey.goose.say", { pitch: 0.8 + 0.2 * Math.random() });
			break;
	}
});

