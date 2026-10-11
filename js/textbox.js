// Text in the box and in speech bubbles: word wrapping and the typewriter effect.
const TEXT_SPEED = 45; // characters per second

// Wraps text to lines. Paragraphs starting with "* " get indented continuation lines,
// so the asterisk stays alone on the left like in Undertale.
function wrapText(text, maxWidth, fontSpec = TEXT_FONT) {
  ctx.save();
  ctx.font = fontSpec;

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

function createTyper(text, maxWidth, fontSpec = TEXT_FONT, voice = null) {
  const lines = wrapText(text, maxWidth, fontSpec);
  return {
    text,
    lines,
    font: fontSpec,
    voice,
    total: lines.reduce((sum, line) => sum + line.length, 0),
    shown: 0
  };
}

function updateTyper(typer, dt) {
  if (typerDone(typer)) return;
  const before = Math.floor(typer.shown);
  typer.shown = Math.min(typer.total, typer.shown + TEXT_SPEED * dt);
  const after = Math.floor(typer.shown);
  if (after !== before) {
    if (typer.voice) sfx.voice(typer.voice);
    else sfx.text();
  }
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

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
