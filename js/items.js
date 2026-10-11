// Healing items. `heal` is HP restored; Infinity = full heal; `all` heals the whole party;
// `revive` brings a downed Deltarune party member back.
const ITEMS = {
  // Undertale
  monsterCandy: { name: 'Monster Candy', heal: 10, text: 'You ate the Monster Candy. Very un-licorice-like.' },
  spiderDonut: { name: 'Spider Donut', heal: 12, text: 'You ate the Spider Donut. Don\'t worry, Spider didn\'t.' },
  spiderCider: { name: 'Spider Cider', heal: 24, text: 'You drank the Spider Cider.' },
  butterscotchPie: { name: 'Butterscotch Pie', heal: Infinity, text: 'You ate the Butterscotch-Cinnamon Pie.' },
  snowmanPiece: { name: 'Snowman Piece', heal: 45, text: 'You ate the Snowman Piece.' },
  nicecream: { name: 'Nice Cream', heal: 15, text: 'You ate the Nice Cream. "You\'re super spiffy!"' },
  bisicle: { name: 'Bisicle', heal: 11, text: 'You eat one half of the Bisicle.' },
  cinnamonBunny: { name: 'Cinnamon Bunny', heal: 22, text: 'You ate the Cinnamon Bunny.' },
  seaTea: { name: 'Sea Tea', heal: 10, text: 'You drank the Sea Tea. Your SPEED boosts!' },
  astronautFood: { name: 'Astronaut Food', heal: 21, text: 'You ate the Astronaut Food.' },
  glamburger: { name: 'Glamburger', heal: 27, text: 'You ate the Glamburger.' },
  legendaryHero: { name: 'Legendary Hero', heal: 40, text: 'You ate the Legendary Hero. ATTACK increased by 4!' },
  instantNoodles: { name: 'Instant Noodles', heal: 90, text: 'You ate the Instant Noodles. They\'re better dry.' },
  faceSteak: { name: 'Face Steak', heal: 60, text: 'You ate the Face Steak.' },
  popatoChisps: { name: 'Popato Chisps', heal: 13, text: 'You ate the Popato Chisps.' },
  // Deltarune
  darkCandy: { name: 'Dark Candy', heal: 40, text: 'ate the Dark Candy.' },
  darkerCandy: { name: 'Darker Candy', heal: 120, text: 'ate the Darker Candy.' },
  reviveMint: { name: 'Revive Mint', heal: Infinity, revive: true, text: 'used the Revive Mint.' },
  clubsSandwich: { name: 'ClubsSandwich', heal: 70, all: true, text: 'shared the ClubsSandwich.' },
  topCake: { name: 'Top Cake', heal: 160, all: true, text: 'shared the Top Cake.' },
  spincake: { name: 'Spincake', heal: 80, all: true, text: 'shared the Spincake.' },
  butJuice: { name: 'ButJuice', heal: 100, text: 'drank the ButJuice.' },
  cdBagel: { name: 'CD Bagel', heal: 80, text: 'ate the CD Bagel. It played a song.' }
};

function createInventory(list) {
  return (list || []).map(([id, count]) => ({ id, count }));
}

function hasItems(inventory) {
  return inventory.some(stack => stack.count > 0);
}

function itemDescription(item) {
  if (item.revive) return 'Revives and fully heals';
  const amount = item.heal === Infinity ? 'all' : item.heal;
  return item.all ? `Heals ${amount} HP to all` : `Heals ${amount} HP`;
}
