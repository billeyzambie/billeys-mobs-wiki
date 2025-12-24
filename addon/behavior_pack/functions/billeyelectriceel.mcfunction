execute @e[r=4,tag=!tamed] ~~~ detect ~~~ water 0 tag @s add in_water
execute @e[r=4,tag=!tamed] ~~~ detect ~~~ iron_bars 0 tag @s add in_water
damage @r[r=2.5,tag=!tamed,tag=in_water,type=!billey:electric_eel,type=!item,type=!xp_orb,family=!inanimate] 0 entity_attack entity @r[r=8,tag=!tamed,tag=in_water,type=!item,type=!xp_orb,family=!inanimate]
execute @e[r=4,tag=!tamed] ~~~ tag @s remove in_water
execute @e[r=4,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ water 0 effect @s poison 1 1 true
execute @e[r=4,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ water 0 effect @s weakness 2 2 true
execute @e[r=4,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ water 0 effect @s slowness 2 2 true
execute @e[r=3,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ water 0 effect @s poison 1 1 true
execute @e[r=3,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ water 0 effect @s weakness 3 3 true
execute @e[r=3,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ water 0 effect @s slowness 3 3 true
execute @e[r=2.5,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ water 0 effect @s poison 1 2 true
execute @e[r=2.5,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ water 0 effect @s weakness 4 3 true
execute @e[r=2.5,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ water 0 effect @s slowness 4 3 true
execute @e[r=4,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ iron_bars 0 effect @s poison 1 1 true
execute @e[r=4,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ iron_bars 0 effect @s weakness 2 2 true
execute @e[r=4,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ iron_bars 0 effect @s slowness 2 2 true
execute @e[r=3,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ iron_bars 0 effect @s poison 1 1 true
execute @e[r=3,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ iron_bars 0 effect @s weakness 3 3 true
execute @e[r=3,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ iron_bars 0 effect @s slowness 3 3 true
execute @e[r=2.5,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ iron_bars 0 effect @s poison 1 2 true
execute @e[r=2.5,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ iron_bars 0 effect @s weakness 4 3 true
execute @e[r=2.5,tag=!tamed,type=!billey:electric_eel] ~~~ detect ~~~ iron_bars 0 effect @s slowness 4 3 true
execute @e[r=1.125,tag=!tamed,type=!billey:electric_eel] ~~~ effect @s poison 1 4 true
execute @e[r=1.125,tag=!tamed,type=!billey:electric_eel] ~~~ effect @s fatal_poison 2 2 true
execute @e[r=1.125,tag=!tamed,type=!billey:electric_eel] ~~~ effect @s blindness 1 5 true
execute @e[r=1.125,tag=!tamed,type=!billey:electric_eel] ~~~ effect @s nausea 1 5 true
execute @e[r=1.125,tag=!tamed,type=!billey:electric_eel] ~~~ effect @s weakness 7 5 true
execute @e[r=1.125,tag=!tamed,type=!billey:electric_eel] ~~~ effect @s slowness 7 5 true
execute @s[tag=tamed] ~~~ event entity @e[r=3.5,type=!billey:electric_eel] get_electrocuted
execute @e[r=1.125,tag=!tamed,type=!billey:electric_eel] ~~~ playsound billey.elec.short @a ~~~ 0.5 0.5
