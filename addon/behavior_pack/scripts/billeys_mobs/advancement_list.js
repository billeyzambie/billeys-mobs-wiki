/**
 * @typedef {{
 *  name: string;
 *  icon: string;
 *  xp: number;
 *  isChallenge: boolean;
 *  completionMessage: string|undefined;
 *  isHidden: boolean;
 *  trophy: string|undefined;
 * }} Advancement
 * @type {Advancement[]}
 */
export const ADVANCEMENTS = [
    {
        name: "golden_duck",
        icon: "textures/billey_icons/duck",
        xp: 50,
        isChallenge: false,
        isHidden: true
    },
    {
        name: "bduckbreeder",
        icon: "textures/billey_icons/banana_duck",
        xp: 10,
        isChallenge: false,
        completionMessage: "chat.billeys_mobsornithologistinfo",
        isHidden: false
    },
    {
        name: "ornithologist",
        icon: "textures/billey_icons/banana_duck",
        xp: 100,
        isChallenge: true,
        isHidden: false
    },
    {
        name: "feathered_warrior",
        icon: "textures/billeyitems/billduckiron",
        xp: 10,
        isChallenge: false,
        completionMessage: "chat.billeys_mobsduckarmyinfo",
        isHidden: false
    },
    {
        name: "feathered_army",
        icon: "textures/billeyitems/billduckdiamond",
        xp: 200,
        isChallenge: true,
        isHidden: false
    },
    {
        name: "slime_wyvern_level_10",
        icon: "textures/billey_icons/slime_wyvern",
        xp: 200,
        isChallenge: true,
        isHidden: false,
        trophy: "billey:slime_wyvern_plushie"
    },
    {
        name: "ratatouille",
        icon: "textures/billeyitems/ratatouille",
        xp: 10,
        isChallenge: false,
        completionMessage: "chat.billeys_mobs.ratxd",
        isHidden: false
    },
    {
        name: "chocolate_catfish",
        icon: "textures/billeyitems/lefisheauchocolat",
        xp: 10,
        isChallenge: false,
        completionMessage: "chat.billeys_mobs.catfishpizza",
        isHidden: false
    },
    {
        name: "killcenti",
        icon: "textures/billey_icons/duck_centipede",
        xp: 20,
        isChallenge: false,
        isHidden: false
    },
    {
        name: "cum",
        icon: "textures/items/bucket_milk",
        xp: 10,
        isChallenge: false,
        isHidden: true
    },
    {
        name: "mercat_napper",
        icon: "textures/billey_icons/mercat",
        xp: 100,
        isChallenge: false,
        isHidden: false,
        trophy: "billey:mercat_plushie"
    }
];
