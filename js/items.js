// Healing items. The inventory is refilled at the start of every fight.
// Bosses can choose their own inventory (boss.items); otherwise each game has a default.
const ITEMS = {
  // Undertale
  monsterCandy: { name: 'Monster Candy', heal: 10, text: '* You ate the Monster Candy.\n* Very un-licorice-like.' },
  butterscotchPie: { name: 'Butty Pie', heal: Infinity, text: '* You ate the Butterscotch-Cinnamon Pie.' },
  snowmanPiece: { name: 'SnowPiece', heal: 45, text: '* You ate the Snowman Piece.' },
  legendaryHero: { name: 'Legend Hero', heal: 40, text: '* You ate the Legendary Hero.\n* ATTACK increased by 4!' },
  instantNoodles: { name: 'I. Noodles', heal: 90, text: '* You ate the Instant Noodles.\n* They\'re better dry.' },
  faceSteak: { name: 'Face Steak', heal: 60, text: '* You ate the Face Steak.' },
  glamburger: { name: 'GlamBurg', heal: 27, text: '* You eat the Glamburger.\n* Made of edible glitter and sequins.' },
  cinnaBun: { name: 'CinnaBun', heal: 22, text: '* You ate the Cinnamon Bunny.' },
  // Deltarune
  darkCandy: { name: 'Dark Candy', heal: 40, text: '* Susie ate the Dark Candy.' },
  clubsSandwich: { name: 'ClubsSandwich', heal: 70, text: '* Susie ate the Clubs Sandwich in one bite.' },
  topCake: { name: 'TopCake', heal: 160, text: '* Susie ate the Top Cake. Messily.' },
  reviveMint: { name: 'Revive Mint', heal: Infinity, text: '* Susie ate the Revive Mint. Refreshing!' }
};

const DEFAULT_ITEMS = {
  undertale: ['butterscotchPie', 'monsterCandy', 'monsterCandy', 'cinnaBun'],
  deltarune: ['darkCandy', 'darkCandy', 'clubsSandwich', 'reviveMint']
};

function createInventory(boss) {
  const ids = boss && boss.items ? boss.items : DEFAULT_ITEMS[boss ? boss.game : 'deltarune'];
  const stacks = [];
  for (const id of ids) {
    const stack = stacks.find(s => s.id === id);
    if (stack) stack.count += 1;
    else stacks.push({ id, count: 1 });
  }
  return stacks;
}

function hasItems(inventory) {
  return inventory.some(stack => stack.count > 0);
}

// Use one item of the stack, heal the player and return { text, healed }.
function useItem(stack, player) {
  const item = ITEMS[stack.id];
  stack.count -= 1;

  const healed = Math.min(item.heal, player.maxHp - player.hp);
  player.hp += healed;
  player.karma = 0;

  const result = player.hp >= player.maxHp
    ? '* Your HP was maxed out.'
    : `* You recovered ${healed} HP!`;

  return { text: `${item.text}\n${result}`, healed };
}
