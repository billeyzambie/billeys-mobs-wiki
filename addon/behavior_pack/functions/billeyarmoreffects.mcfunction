effect @e[hasitem={item=billey:shark_helmet,location=slot.armor.head}] strength 2 0 true
execute @e[hasitem={item=billey:shark_chestplate,location=slot.armor.chest}] ~~~ detect ~ ~1 ~ water -1 effect @s conduit_power 2 0 true
effect @e[hasitem=[{item=billey:shark_helmet,location=slot.armor.head},{item=billey:shark_chestplate,location=slot.armor.chest},{item=billey:shark_leggings,location=slot.armor.legs},{item=billey:shark_boots,location=slot.armor.feet}]] strength 2 1 true
execute @e[hasitem=[{item=billey:shark_helmet,location=slot.armor.head},{item=billey:shark_chestplate,location=slot.armor.chest},{item=billey:shark_leggings,location=slot.armor.legs},{item=billey:shark_boots,location=slot.armor.feet}]] ~~~ detect ~ ~1 ~ water -1 effect @s conduit_power 2 2 true
execute @e[hasitem={item=billey:penguin_boots,location=slot.armor.feet}] ~~~ detect ~ ~-1 ~ sand -1 effect @s speed 1 0 true
execute @e[hasitem={item=billey:penguin_boots,location=slot.armor.feet}] ~~~ detect ~~~ snow_layer -1 effect @s speed 1 3 true
execute @e[hasitem={item=billey:penguin_boots,location=slot.armor.feet}] ~~~ detect ~ ~-1 ~ snow 0 effect @s speed 1 3 true
execute @e[hasitem={item=billey:penguin_boots,location=slot.armor.feet}] ~~~ detect ~ ~-1 ~ ice 0 effect @s speed 1 4 true
execute @e[hasitem={item=billey:penguin_boots,location=slot.armor.feet}] ~~~ detect ~ ~-1 ~ packed_ice 0 effect @s speed 1 5 true
execute @e[hasitem={item=billey:penguin_boots,location=slot.armor.feet}] ~~~ detect ~ ~-1 ~ blue_ice 0 effect @s speed 1 6 true
effect @e[hasitem={item=billey:duck_hat,location=slot.armor.head}] strength 2 0 true