// Léčivé předměty. Inventář se doplní na začátku každé bitvy.
const ITEMS = {
  darkCandy: {
    name: 'Tmavá cukrovinka',
    heal: 8,
    text: '* Susie zbaštila Tmavou cukrovinku.'
  },
  castleCake: {
    name: 'Hradní dort',
    heal: 14,
    text: '* Susie spořádala Hradní dort na jedno kousnutí.'
  },
  reviveMint: {
    name: 'Oživovací máta',
    heal: Infinity,
    text: '* Susie si dala Oživovací mátu. Osvěžující!'
  }
};

function createInventory() {
  return [
    { id: 'darkCandy', count: 2 },
    { id: 'castleCake', count: 1 },
    { id: 'reviveMint', count: 1 }
  ];
}

function hasItems(inventory) {
  return inventory.some(stack => stack.count > 0);
}

// Použije jeden kus ze stacku, vyléčí hráče a vrátí { text, healed }.
function useItem(stack, player) {
  const item = ITEMS[stack.id];
  stack.count -= 1;

  const healed = Math.min(item.heal, player.maxHp - player.hp);
  player.hp += healed;

  const result = player.hp >= player.maxHp
    ? '* HP doplněno na maximum!'
    : `* Obnoveno ${healed} HP.`;

  return { text: `${item.text}\n${result}`, healed };
}
