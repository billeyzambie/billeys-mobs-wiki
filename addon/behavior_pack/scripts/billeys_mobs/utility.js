import { ItemStack, Player, Container, Dimension, Entity, system, DimensionTypes, world, GameMode } from "@minecraft/server";

export const headPets = ["billey:rat", "billey:netherrat", "billey:slime_wyvern"];
export const ridePets = [...headPets, "billey:pigeon"];
export const trueBeneficialEffects = ["speed", "regeneration", "absorption", "night_vision", "water_breathing", "strength", "saturation", "fire_resistance", "conduit_power", "haste"];
export const beneficalEffects = [...trueBeneficialEffects, "jump_boost"];
export const detrimentalEffects = ["weakness", "hunger", "levitation", "blindness", "darkness", "instant_damage", "mining_fatigue", "nausea", "poison", "slowness", "wither"];
export const duckArmors = ["no", "leather", "golden", "chain", "iron", "diamond", "netherite", "endrod"];
/** All dimensions, including custom ones if they ever become a thing
 * @type {Dimension[]}
 */
export let DIMENSIONS;

system.run(() => DIMENSIONS = DimensionTypes.getAll().map(d => world.getDimension(d.typeId)));

/**
 * @param {string} str 
 * Stolen
 */
export function titleCase(str) {
	return str.replace(
		/\w\S*/g,
		text => text[0].toUpperCase() + text.slice(1).toLowerCase()
	);
}

/** 
 * @param {string} typeId 
 * @returns {import("@minecraft/server").RawMessage}
 */
export function translateItem(typeId) {
	if (typeId.startsWith("minecraft:"))
		return {
			translate: `item.${typeId.slice(10)}.name`
		};
	else
		return {
			translate: `item.${typeId}`
		};
}

/**
 * @param {ItemStack} item
 * Deprecated
 */
export function itemEnglishName(item) {
	return titleCase(item.typeId.replaceAll("_", " ").split(":")[1]);
}

/**
 * @param {Entity} entity 
 * @param {import('@minecraft/server').Vector3|undefined} y 
 */
export function validateHeightOf(entity, y) {
	y ??= entity.location.y;
	const { min, max } = entity.dimension.heightRange;
	return y > min && y < max;
}

/**
 * @param {Entity} entity 
 * @returns {import('@minecraft/server').RawMessage}
 */
export function nameOf(entity) {
	if (entity.nameTag)
		return {
			text: entity.nameTag
		};
	if (entity.typeId.startsWith("minecraft:"))
		return {
			translate: `entity.${entity.typeId.slice(10)}.name`
		};
	return {
		translate: `entity.${entity.typeId}.name`
	};
}

/** 
 * @param {number} min
 * @param {number} max
 * @param {number} value
 */
export function clamp(min, max, value) {
	if (value > max) return max;
	if (value < min) return min;
	return value;
}
/** 
 * @param {ItemStack} item
 * Calculate how much damage an item should take when used once, taking the unbreaking enchantment into account.
 */
export function calculateDamage(item) {
	if (item.getComponent("enchantable")?.hasEnchantment("unbreaking")) {
		return Math.random() < 1 / (1 + item.getComponent("enchantable").getEnchantment("unbreaking").level) ? 1 : 0;
	}
	return 1;
}
/** 
 * @param {Container} container
 * @param {Dimension} dimension
 * Drops all items of a container and then empties it.
 */
export function dropAll(container, dimension, location) {
	for (let index = 0; index < container.size; index++) {
		const item = container.getItem(index);
		if (item) dimension.spawnItem(item, location);
	}
	container.clearAll();
}
/** 
 * @param {Entity} entity
 * @param {string} sound
 * @param {import('@minecraft/server').WorldSoundOptions | undefined} options
 * Plays a sound at the location and dimension of an entity for all players.
 */
export function playSoundAtEntity(entity, sound, options) {
	entity.dimension.playSound(sound, entity.location, options);
};
/** 
 * @param {Block} block
 * @param {string} sound
 * @param {import('@minecraft/server').WorldSoundOptions | undefined} options
 * Plays a sound at the location and dimension of an entity for all players.
 */
export function playSoundAtBlockCenter(block, sound, options) {
	block.dimension.playSound(sound, {
		x: block.x + 0.5,
		y: block.y + 0.5,
		z: block.z + 0.5
	}, options);
};
/** 
 * @param {Block} block
 * @param {ItemStack} itemStack
 */
export function spawnItemInBlockCenter(block, itemStack) {
	block.dimension.spawnItem(itemStack, {
		x: block.x + 0.5,
		y: block.y + 0.5,
		z: block.z + 0.5
	});
};
/**
 * @param {Entity} entity
 * @param {string} projectileId
 * @param {number} power
 * Not used because setting owner didn't work, meaning neutral mobs 
 * wouldn't get mad at you when you shoot them.
 * 
 * Later comment: it works not but there's still no way to make
 * the player's hand swing with this so I'm keeping the other one
 */
export function shoot(entity, projectileId, power) {
	const location = add(entity.getHeadLocation(), entity.getViewDirection());
	const proj = entity.dimension.spawnEntity(projectileId, location);
	proj.getComponent("projectile").owner = entity;
	proj.getComponent("projectile").shoot(scale(entity.getViewDirection(), power));
};

/**
 * @param {Entity} entity
 * @param {number | undefined} amount
 */
export function damageItem(entity, amount) {
	if (entity instanceof Player && entity.getGameMode() == GameMode.Creative)
		return;
	let item = entity.getComponent("equippable").getEquipment("Mainhand");
	let damage = (amount ?? 1) * calculateDamage(item);
	if (item.getComponent("durability").damage + damage >= item.getComponent("durability").maxDurability) {
		entity.getComponent("equippable").setEquipment("Mainhand", undefined);
		playSoundAtEntity(entity, "random.break");
	}
	else item.getComponent("durability").damage += damage;
	entity.getComponent("equippable").setEquipment("Mainhand", item);
};

/**
 * @param {Player} player 
 * @returns True if the item stack was decremented to nothing(the player had 1 of the item in their hand).
 */
export function decrementStack(player) {
	if (player.getGameMode() == "Creative") return false;
	const slot = player.getComponent("equippable").getEquipmentSlot("Mainhand");
	let item = slot.getItem();
	if (item.amount == 1) item = undefined;
	else item.amount--;
	system.run(() => slot.setItem(item));
	return !item;
}

/**
 * @param {import("@minecraft/server").VectorXZ} vector1 
 * @param {import("@minecraft/server").VectorXZ} vector2 
 */
export function getDistanceXZ({ x: x1, z: z1 }, { x: x2, z: z2 }) {
	return Math.hypot(x2 - x1, z2 - z1);
}
/**
 * @param {import("@minecraft/server").Vector3} vector1 
 * @param {import("@minecraft/server").Vector3} vector2 
 */
export function getDistanceXYZ({ x: x1, y: y1, z: z1 }, { x: x2, y: y2, z: z2 }) {
	return Math.hypot(x2 - x1, y2 - y1, z2 - z1);
}

export function magnitude(vector) {
	return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
}

export function magnitudeXZ(vector) {
	return Math.sqrt(vector.x * vector.x + vector.z * vector.z);
}

export function magnitudeXY(vector) {
	return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}
/**
 * @returns {import('@minecraft/server').Vector3}
 */
export function normalize(vector) {
	let magnitude_ = magnitude(vector);
	if (!magnitude_) return vector;
	vector.x /= magnitude_;
	vector.y /= magnitude_;
	vector.z /= magnitude_;
	return vector;
}
export function scale(vector, scalar) {
	vector.x *= scalar;
	vector.y *= scalar;
	vector.z *= scalar;
	return vector;
}
export function subtract(vector1, vector2) {
	vector1.x -= vector2.x;
	vector1.y -= vector2.y;
	vector1.z -= vector2.z;
	return vector1;
}
export function add(vector1, vector2) {
	vector1.x += vector2.x;
	vector1.y += vector2.y;
	vector1.z += vector2.z;
	return vector1;
}
export function dot(vector1, vector2) {
	return vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;
}
export function cross(vector1, vector2) {
	return {
		x: vector1.y * vector2.z - vector1.z * vector2.y,
		y: vector1.z * vector2.x - vector1.x * vector2.z,
		z: vector1.x * vector2.y - vector1.y * vector2.x
	};
}
export function crossMagnitude(vector1, vector2) {
	return magnitude(cross(vector1, vector2));
}

/**
 * @param {ItemStack} oldItem
 * @param {string} newTypeId
 * @returns {ItemStack} Returns the new item. This function doesn't make any changes to the old item.
 */
export function changeItemType(oldItem, newTypeId) {
	let newItem = new ItemStack(newTypeId, oldItem.amount);
	newItem.nameTag = oldItem.nameTag;
	newItem.getComponent("durability").damage = oldItem.getComponent("durability").damage;
	newItem.setLore(oldItem.getLore());
	newItem.getComponent("enchantable").addEnchantments(oldItem.getComponent("enchantable").getEnchantments());
	return newItem;
}

/**
 * @param {Entity} entity 
 * @param {string} dpid 
 * @param {number} value
 */
export function addToDynamicProperty(entity, dpid, value) {
	entity.setDynamicProperty(
		dpid,
		entity.getDynamicProperty(dpid) + value
	);
}

/**
 * @param {Entity} entity 
 * @param {string} dpid
 */
export function incrementDynamicProperty(entity, dpid) {
	entity.setDynamicProperty(
		dpid,
		entity.getDynamicProperty(dpid) + 1
	);
}

/**
 * @param {Entity} entity 
 * @param {string} dpid
 */
export function decrementDynamicProperty(entity, dpid) {
	entity.setDynamicProperty(
		dpid,
		entity.getDynamicProperty(dpid) - 1
	);
}

export function vectorToString(vector) {
	return vector.x.toFixed(2) + " " + vector.y.toFixed(2) + " " + vector.z.toFixed(2);
}

/** has a §r at the end */
export function vectorToColorfulString(vector) {
	return `§c${vector.x} §a${vector.y} §9${vector.z}§r`;
}

export function floorVector({ x, y, z }) {
	return {
		x: Math.floor(x),
		y: Math.floor(y),
		z: Math.floor(z)
	};
}

export function compareStrings(a, b) {
	a = a.toUpperCase();
	b = b.toUpperCase();
	if (a == b) return 0;
	else if (a > b) return 1;
	else if (a < b) return -1;
}