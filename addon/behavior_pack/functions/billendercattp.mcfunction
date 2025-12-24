execute @s ~~~ detect ^2 ^ ^-3 air 0 particle minecraft:portal_directional ~ ~0.5 ~
execute @s ~~~ detect ^2 ^ ^-3 air 0 particle minecraft:portal_directional ~ ~0.5 ~
execute @s ~~~ detect ^2 ^ ^-3 air 0 particle minecraft:portal_directional ~ ~0.5 ~
execute @s ~~~ detect ^2 ^ ^-3 air 0 playsound mob.endermen.portal @a ~~~
execute @s ~~~ detect ^2 ^ ^-3 air 0 execute @e[type=billey:endercat,c=1,tag=tamed] ~~~ particle minecraft:crop_growth_emitter
execute @s ~~~ detect ^2 ^ ^-3 air 0 tp ^2 ^ ^-3
execute @s ~~~ detect ^2 ^ ^-3 air 0 tp ^2 ^ ^-3
execute @s ~~~ detect ^2 ^ ^-3 air 0 tp ^2 ^ ^-3
execute @s ~~~ detect ^2 ^ ^-3 air 0 tp ^2 ^ ^-3
execute @s ~~~ detect ~~~ air 0 tag @s add not_in_a_solid
execute @s ~~~ detect ~~~ water -1 tag @s add not_in_a_solid
tp @s[tag=!not_in_a_solid] ~ ~1 ~
tag @s remove not_in_a_solid