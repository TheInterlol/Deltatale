// Text in the box and speech bubbles: word wrapping and the typewriter effect.
const TEXT_SPEED = 45; // characters per second

// Wrap text into lines that fit maxWidth. Paragraphs starting with "* " get indented
// continuation lines so the asterisk stays alone on the left, like in Undertale.
function wrapText(text, maxWidth, font = TEXT_FONT) {
  ctx.save();
  ctx.font = font;

  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    const indent = paragraph.startsWith('* ') ? '  ' : '';
    const words = paragraph.split(' ');
    let line = '';

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = indent + word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }

  ctx.restore();
  return lines;
}

function createTyper(text, maxWidth, font = TEXT_FONT) {
  const lines = wrapText(text, maxWidth, font);
  return {
    text,
    lines,
    font,
    total: lines.reduce((sum, line) => sum + line.length, 0),
    shown: 0
  };
}

function updateTyper(typer, dt, sound = true) {
  if (typerDone(typer)) return;
  const before = Math.floor(typer.shown);
  typer.shown = Math.min(typer.total, typer.shown + TEXT_SPEED * dt);
  const after = Math.floor(typer.shown);
  // beep on every second new character so it doesn't sound like a machine gun
  if (sound && after !== before && after % 2 === 0) sfx.text();
}

function typerDone(typer) {
  return typer.shown >= typer.total;
}

function finishTyper(typer) {
  typer.shown = typer.total;
}

function drawTyper(typer, x, y, lineHeight, color = '#fff') {
  ctx.save();
  ctx.font = typer.font;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';

  let remaining = Math.floor(typer.shown);
  for (let i = 0; i < typer.lines.length && remaining > 0; i++) {
    const line = typer.lines[i];
    ctx.fillText(line.slice(0, remaining), x, y + i * lineHeight);
    remaining -= line.length;
  }

  ctx.restore();
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
