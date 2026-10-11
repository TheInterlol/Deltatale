// Player-side presets. Undertale fights have a single human (one SOUL, one HP bar);
// Deltarune fights have Kris, Susie and Ralsei with their own HP, commands and spells.
const SPELLS = {
  rudeBuster: { name: 'Rude Buster', tp: 50, target: 'enemy', description: 'Deals big damage' },
  ultimateHeal: { name: 'UltimatHeal', tp: 32, target: 'ally', description: 'Heals a little' },
  pacify: { name: 'Pacify', tp: 16, target: 'enemy', description: 'Spare a TIRED enemy' },
  healPrayer: { name: 'Heal Prayer', tp: 32, target: 'ally', description: 'Heals an ally' }
};

const PARTY_PRESETS = {
  // Undertale: a fresh LV 1 human (Ruins / Snowdin / Waterfall)
  'ut-lv1': () => [{ id: 'frisk', name: 'FRISK', lv: 1, maxHp: 20, atk: 21 }],
  // pacifist human in the late game (Hotland, CORE, New Home)
  'ut-late': () => [{ id: 'frisk', name: 'FRISK', lv: 1, maxHp: 20, atk: 25 }],
  // the genocide human at LV 19-20
  'ut-genocide': () => [{ id: 'chara', name: 'CHARA', lv: 19, maxHp: 92, atk: 40 }],
  // Deltarune Chapter 1 party (end of chapter)
  'dr-ch1': () => [
    { id: 'kris', name: 'Kris', maxHp: 90, atk: 10, magic: 0, color: '#00c0ff', commands: ['fight', 'act', 'item', 'spare', 'defend'] },
    { id: 'susie', name: 'Susie', maxHp: 110, atk: 14, magic: 1, color: '#ff45cf', commands: ['fight', 'magic', 'item', 'spare', 'defend'], spells: ['rudeBuster'] },
    { id: 'ralsei', name: 'Ralsei', maxHp: 70, atk: 8, magic: 11, color: '#40ff60', commands: ['fight', 'magic', 'item', 'spare', 'defend'], spells: ['pacify', 'healPrayer'] }
  ],
  // Deltarune Chapter 2 party (end of chapter)
  'dr-ch2': () => [
    { id: 'kris', name: 'Kris', maxHp: 160, atk: 14, magic: 0, color: '#00c0ff', commands: ['fight', 'act', 'item', 'spare', 'defend'] },
    { id: 'susie', name: 'Susie', maxHp: 190, atk: 18, magic: 2, color: '#ff45cf', commands: ['fight', 'magic', 'item', 'spare', 'defend'], spells: ['rudeBuster', 'ultimateHeal'] },
    { id: 'ralsei', name: 'Ralsei', maxHp: 140, atk: 10, magic: 14, color: '#40ff60', commands: ['fight', 'magic', 'item', 'spare', 'defend'], spells: ['pacify', 'healPrayer'] }
  ],
  // Deltarune Chapter 4 party (late chapter)
  'dr-ch4': () => [
    { id: 'kris', name: 'Kris', maxHp: 240, atk: 20, magic: 0, color: '#00c0ff', commands: ['fight', 'act', 'item', 'spare', 'defend'] },
    { id: 'susie', name: 'Susie', maxHp: 270, atk: 24, magic: 3, color: '#ff45cf', commands: ['fight', 'magic', 'item', 'spare', 'defend'], spells: ['rudeBuster', 'ultimateHeal'] },
    { id: 'ralsei', name: 'Ralsei', maxHp: 210, atk: 14, magic: 18, color: '#40ff60', commands: ['fight', 'magic', 'item', 'spare', 'defend'], spells: ['pacify', 'healPrayer'] }
  ]
};

function createParty(preset) {
  const members = (PARTY_PRESETS[preset] || PARTY_PRESETS['ut-lv1'])();
  return members.map(m => Object.assign({ hp: m.maxHp, defending: false, down: false, pose: 'idle', poseTime: 0, hurt: 0 }, m));
}

function aliveMembers(battle) {
  return battle.party.filter(m => !m.down);
}

function healMember(battle, member, amount) {
  const wasDown = member.down;
  const before = member.hp;
  member.hp = Math.min(member.maxHp, member.hp + amount);
  if (member.down && member.hp > 0) member.down = false;
  const healed = member.hp - before;
  const pos = memberPosition(battle, member);
  addPopup(member.hp >= member.maxHp ? 'MAX' : `+${healed}`, pos.x, pos.y, '#40ff40', 22);
  return { healed, revived: wasDown && !member.down };
}

function memberPosition(battle, member) {
  if (battle.style === 'undertale') return { x: 120, y: UT.statsY - 18 };
  const i = battle.party.indexOf(member);
  return DR.party[i] || DR.party[0];
}
