import { world, system, EquipmentSlot, EntityDamageCause, Dimension } from "@minecraft/server";
import { subtract, getDistanceXZ, headPets, normalize, ridePets, scale, DIMENSIONS, validateHeightOf } from "./utility";
import { isMorph, morphTick } from "./morph";
import { /*removeWaystoneLoader,*/ tpAllFollowingPets, tpAllFollowingPetsUsingStructure } from "./quality_of_life";
import { decrementDuckatriceStares, duckatriceBossStare, duckatriceStareDamage } from "./duckatrice";
import { giveInfoBookOnMove } from "./info_book";
import { happinessTick, TICKS_PER_HAPPY_TICK } from "./happiness/happiness";
import { onPlayerGetOnBed, onPlayerGetOutOfBed } from "./mercat";
import { giraffeCatTick, playerLandAfterClimbingGiraffeCat } from "./giraffe_cat";
import { trySavePetDatabase } from "./pet_database";
import { tickGooseberryThorns } from "./berry_goose";

system.runInterval(() => {
	const { currentTick } = system;

	if (currentTick % 40 == 0)
		trySavePetDatabase();

	const players = world.getPlayers();
	for (const player of players) {
		if (!player.isValid) continue;

		const playerEquippable = player.getComponent("equippable");

		if (
			false
			&& player.__prevLoc //if is not undefined
			&& getDistanceXZ(player.location, player.__prevLoc) > 60
			&& player.__prevDimension.id == player.dimension.id
			&& validateHeightOf(player)
		) {
			const chunkLoader = player.dimension.spawnEntity("billey:chunk_loader", player.__prevLoc);
			tpAllFollowingPetsUsingStructure(player, chunkLoader);
		}

		/*if (
			player.__waystoneLoader
			&&
			player.__prevLoc
			&&
			distanceXZ > 0.173
		) {
			removeWaystoneLoader(player);
		}*/

		player.__prevLoc = player.location;
		player.__prevDimension = player.dimension;

		const playerSneakTicks = 20 * (player.getDynamicProperty("double_sneak_seconds") ?? 0.5);

		if (player.isSneaking && !player.__wasSneaking) {
			if (
				player.__lastSneakTick
				&&
				player.__lastSneakTick + playerSneakTicks >= system.currentTick
			) {
				tpAllFollowingPets(player, false);
			}
			player.__lastSneakTick = system.currentTick;
		}
		const underwaterMovement = player.getComponent("underwater_movement");
		if (playerEquippable.getEquipment("Chest")?.typeId == "billey:shark_chestplate" && player.isSwimming) {
			underwaterMovement.setCurrentValue(0.1);
			player.__hadSharkChestplate = true;
		}
		else if (player.__hadSharkChestplate) {
			underwaterMovement.resetToDefaultValue();
			player.__hadSharkChestplate = false;
		}

		const riders = player.getComponent("rideable").getRiders();
		for (const rider of riders) {
			if (!ridePets.includes(rider.typeId)) continue;
			if (rider.typeId == "billey:slime_wyvern") {
				if (riders.length > 1) {
					rider.teleport(player.location);
					rider.triggerEvent("rode_player");
					continue;
				}
				player.addEffect("slow_falling", 5, { showParticles: false });
				if (rider.getProperty("billey:level") < 10)
					player.addEffect("slowness", 5, { showParticles: false, amplifier: 1 });
			}
			else if (headPets.includes(rider.typeId))
				rider.setProperty(
					"billey:sit_on_head",
					riders.length == 1
				);
			if (player.isSneaking && player.isJumping) {
				rider.teleport(player.location);
				rider.triggerEvent("rode_player");
			}
		}
		if (isMorph(player, "duck")) {
			morphTick(player, "duck"); //this looks kinda stupid, will change when more morphs come
		}

		const ride = player.getComponent("riding")?.entityRidingOn;
		if (
			ride
			&& ride.typeId == "billey:duckatrice"
			&& !ride.getProperty("billey:is_fly_attacking")
		) {
			if (!ride.isOnGround) {
				if (ride.isInWater) {
					if (player.isJumping)
						ride.applyImpulse({ x: 0, y: 1, z: 0 });
				}
				else {
					ride.__stamina ??= 40;
					let { x } = player.getRotation();
					x -= 10;
					x *= 1.5;
					if (x < 0) {
						if (ride.__stamina <= 0) {
							if (!ride.getEffect("speed"))
								x = 0;
							if (!player.getDynamicProperty("has_gotten_duckatrice_rise_tip")) {
								player.playSound("random.orb");
								player.sendMessage({ translate: "chat.billeys_mobs.duckatrice_rise_need_sugar" });
								player.setDynamicProperty("has_gotten_duckatrice_rise_tip", true);
							}
						}
						ride.__stamina = Math.max(0, ride.__stamina - 2);
					}
					else {
						ride.__stamina = Math.min(40, ride.__stamina + 1);
					}
					ride.applyImpulse({ x: 0, y: 0.04 - x * 0.04 / 45, z: 0 });
				}
			}
		}


		if (
			currentTick % 10 == 0
		) {
			//The player's ability after petting a pet duckatrice
			const playerHeadSlot = playerEquippable.getEquipmentSlot("Head");
			if (playerHeadSlot.getDynamicProperty("duckatrice_stares"))
				duckatriceStareDamage(playerHeadSlot, player);
		}
		if (
			currentTick % 5 == 0
		) {
			//The duckatrice boss's ability
			const raycast = player.getEntitiesFromViewDirection({
				families: ["duckatrice"]
			})[0] ?? player.getEntitiesFromViewDirection({
				families: ["duck_minion"]
			})[0];
			player.__duckatriceStareTime ??= 0;
			if (raycast && playerEquippable.getEquipment("Head")?.typeId != "minecraft:carved_pumpkin") {
				duckatriceBossStare(player, raycast.entity);
			}
			else if (player.__duckatriceStareTime > 0)
				player.__duckatriceStareTime--;

			if (ride?.target == player && ride.typeId.startsWith("billey:"))
				player.teleport(player.location);
		}

		if (player.__toGetInfoBook) {
			giveInfoBookOnMove(player);
		}

		if (!player.__wasSleeping && player.isSleeping) {
			onPlayerGetOnBed(player);
		}
		else if (player.__wasSleeping && !player.isSleeping) {
			onPlayerGetOutOfBed(player);
		}

		if (player.__climbingGiraffeCat && player.isOnGround) {
			playerLandAfterClimbingGiraffeCat(player);
		}

		if (player.getDynamicProperty("gooseberry_thorn_time") > 0) {
			tickGooseberryThorns(player);
		}

		/*
		const lol = player.getEntitiesFromViewDirection()?.[0]?.entity;
		if (lol) {
			const health = lol.getComponent("health");
			player.onScreenDisplay.setActionBar(health.currentValue.toFixed(2) + "/" + health.effectiveMax.toFixed(2));
		}*/

		player.__wasSleeping = player.isSleeping;
		player.__wasSneaking = player.isSneaking;
		player.__wasJumping = player.isJumping;
	}
	for (const dimension of DIMENSIONS) {
		//this is for the mating animation, only rats have mating animations right now but more mobs will soon
		//mating animations also require a pack in the discord to become visible
		dimension.getEntities({ tags: ["in_love"], type: "billey:rat" }).forEach(pet => {
			pet.setProperty("billey:mob_nearby",
				dimension.getEntities({ location: pet.location, maxDistance: 1.2, type: "billey:rat", tags: ["in_love"] }).length > 1)
		});

		dimension.getEntities({ type: "billey:giraffe_cat" }).forEach(giraffeCatTick);

		if (currentTick % TICKS_PER_HAPPY_TICK == 0) {
			dimension.getEntities({ tags: ["tamed"] }).forEach(pet => {
				if (pet.typeId.startsWith("billey:")) {
					happinessTick(pet);
				}
			});
		}
	}
});

/*
function prettyVectorString(vector) {
	let result = "";
	if (vector.x >= 0)
		result += "+";
	result += vector.x.toFixed(5);
	result += " ";
	if (vector.y >= 0)
		result += "+";
	result += vector.y.toFixed(5);
	result += " ";
	if (vector.z >= 0)
		result += "+";
	result += vector.z.toFixed(5);
	return result;
}
	const duckatrice = dimension.getEntities().find(e => e.typeId != "minecraft:player");
		if (!duckatrice) continue;
		duckatrice.__prevVelocity ??= duckatrice.getVelocity();
		duckatrice.acceleration = subtract(duckatrice.getVelocity(), duckatrice.__prevVelocity);
		world.getAllPlayers().forEach(p => p.onScreenDisplay.setActionBar(`Position: ${prettyVectorString(duckatrice.location)}
Velocity: ${prettyVectorString(duckatrice.getVelocity())}
Acceleration: ${prettyVectorString(duckatrice.acceleration)}`
		));
		duckatrice.__prevVelocity = duckatrice.getVelocity();
	*/