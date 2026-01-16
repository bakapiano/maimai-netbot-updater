import { createCanvas, loadImage } from '@napi-rs/canvas';
import {
  DIFFICULTY_NAMES,
  FC_NAMES,
  FONT_FAMILY,
  FS_NAMES,
  LEVEL_COLORS,
} from './score-export.constants';
import type {
  ChartEntry,
  CompactCard,
  LevelBucket,
  VersionBucket,
} from './score-export.types';

export type CanvasContext = ReturnType<
  ReturnType<typeof createCanvas>['getContext']
>;
export type CanvasImage = Awaited<ReturnType<typeof loadImage>>;
export type LoadCoverImage = (musicId: string) => Promise<CanvasImage | null>;

export async function renderBest50Image(
  payload: {
    total: number;
    newSum: number;
    oldSum: number;
    newCards: CompactCard[];
    oldCards: CompactCard[];
  },
  loadCoverImage: LoadCoverImage,
): Promise<Buffer> {
  const padding = 24;
  const sectionGap = 24;
  const cardWidth = 160;
  const cardHeight = 190;
  const columns = 5;
  const gap = 12;
  const titleHeight = 40;
  const summaryHeight = 70;

  const newRows = Math.ceil(payload.newCards.length / columns) || 1;
  const oldRows = Math.ceil(payload.oldCards.length / columns) || 1;

  const width = padding * 2 + columns * cardWidth + gap * (columns - 1);
  const height =
    padding * 2 +
    summaryHeight +
    titleHeight +
    newRows * cardHeight +
    sectionGap +
    titleHeight +
    oldRows * cardHeight;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 26px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Best 50', padding, padding);

  ctx.font = `bold 20px ${FONT_FAMILY}`;
  ctx.fillStyle = '#a5b4fc';
  ctx.fillText(
    `Total Rating: ${payload.total.toFixed(0)}`,
    padding,
    padding + 34,
  );

  ctx.font = `bold 16px ${FONT_FAMILY}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(
    `B35 ${payload.oldSum.toFixed(0)}`,
    width - padding - 140,
    padding + 6,
  );
  ctx.fillText(
    `B15 ${payload.newSum.toFixed(0)}`,
    width - padding - 140,
    padding + 28,
  );

  let cursorY = padding + summaryHeight;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 18px ${FONT_FAMILY}`;
  ctx.fillText('现版本 Best 15', padding, cursorY);
  cursorY += titleHeight - 10;

  await drawCompactGrid(
    ctx,
    payload.newCards,
    padding,
    cursorY,
    columns,
    cardWidth,
    cardHeight,
    gap,
    loadCoverImage,
  );
  cursorY += newRows * cardHeight + sectionGap;

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 18px ${FONT_FAMILY}`;
  ctx.fillText('旧版本 Best 35', padding, cursorY);
  cursorY += titleHeight - 10;

  await drawCompactGrid(
    ctx,
    payload.oldCards,
    padding,
    cursorY,
    columns,
    cardWidth,
    cardHeight,
    gap,
    loadCoverImage,
  );

  return canvas.toBuffer('image/png');
}

export async function renderLevelScoresImage(
  bucket: LevelBucket,
  levelKey: string,
  loadCoverImage: LoadCoverImage,
): Promise<Buffer> {
  const padding = 24;
  const cardSize = 72;
  const gap = 10;
  const columns = 10;
  const headerHeight = 32;
  const sectionGap = 18;

  let contentHeight = 0;
  bucket.details.forEach((detail) => {
    const rows = Math.max(1, Math.ceil(detail.items.length / columns));
    contentHeight += headerHeight + rows * cardSize + sectionGap;
  });

  const width = padding * 2 + columns * cardSize + gap * (columns - 1);
  const height = padding * 2 + 60 + contentHeight;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 22px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`等级 ${levelKey}`, padding, padding);

  let cursorY = padding + 48;

  for (const detail of bucket.details) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 16px ${FONT_FAMILY}`;
    ctx.fillText(`详细定数 ${detail.detailKey}`, padding, cursorY);
    cursorY += headerHeight;

    await drawMinimalGrid(
      ctx,
      detail.items,
      padding,
      cursorY,
      columns,
      cardSize,
      gap,
      loadCoverImage,
    );

    const rows = Math.max(1, Math.ceil(detail.items.length / columns));
    cursorY += rows * cardSize + sectionGap;
  }

  return canvas.toBuffer('image/png');
}

export async function renderVersionScoresImage(
  bucket: VersionBucket,
  versionKey: string,
  loadCoverImage: LoadCoverImage,
): Promise<Buffer> {
  const padding = 24;
  const cardSize = 72;
  const gap = 10;
  const columns = 10;
  const headerHeight = 32;
  const sectionGap = 18;

  let contentHeight = 0;
  bucket.levels.forEach((level) => {
    const rows = Math.max(1, Math.ceil(level.items.length / columns));
    contentHeight += headerHeight + rows * cardSize + sectionGap;
  });

  const width = padding * 2 + columns * cardSize + gap * (columns - 1);
  const height = padding * 2 + 60 + contentHeight;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 22px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`版本 ${versionKey}`, padding, padding);

  let cursorY = padding + 48;

  for (const level of bucket.levels) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 16px ${FONT_FAMILY}`;
    ctx.fillText(`等级 ${level.levelKey}`, padding, cursorY);
    cursorY += headerHeight;

    await drawMinimalGrid(
      ctx,
      level.items,
      padding,
      cursorY,
      columns,
      cardSize,
      gap,
      loadCoverImage,
    );

    const rows = Math.max(1, Math.ceil(level.items.length / columns));
    cursorY += rows * cardSize + sectionGap;
  }

  return canvas.toBuffer('image/png');
}

async function drawCompactGrid(
  ctx: CanvasContext,
  cards: CompactCard[],
  startX: number,
  startY: number,
  columns: number,
  cardWidth: number,
  cardHeight: number,
  gap: number,
  loadCoverImage: LoadCoverImage,
) {
  for (let idx = 0; idx < cards.length; idx += 1) {
    const row = Math.floor(idx / columns);
    const col = idx % columns;
    const x = startX + col * (cardWidth + gap);
    const y = startY + row * (cardHeight + gap);

    const image = await loadCoverImage(cards[idx].musicId);
    drawCompactCard(ctx, x, y, cardWidth, cardHeight, {
      ...cards[idx],
      image,
    });
  }
}

async function drawMinimalGrid(
  ctx: CanvasContext,
  items: ChartEntry[],
  startX: number,
  startY: number,
  columns: number,
  cardSize: number,
  gap: number,
  loadCoverImage: LoadCoverImage,
) {
  const images = await Promise.all(
    items.map(async (entry) => ({
      entry,
      image: await loadCoverImage(entry.music.id),
    })),
  );

  images.forEach(({ entry, image }, idx) => {
    const row = Math.floor(idx / columns);
    const col = idx % columns;
    const x = startX + col * (cardSize + gap);
    const y = startY + row * (cardSize + gap);
    drawMinimalCard(ctx, x, y, cardSize, entry, image ?? null);
  });
}

function parseScore(score: string | null) {
  if (!score || typeof score !== 'string') return null;
  const parsed = parseFloat(score.replace('%', ''));
  return Number.isNaN(parsed) ? null : parsed;
}

function getRank(scoreVal: number) {
  if (scoreVal >= 100.5) return 'SSS+';
  if (scoreVal >= 100) return 'SSS';
  if (scoreVal >= 99.5) return 'SS+';
  if (scoreVal >= 99) return 'SS';
  if (scoreVal >= 98) return 'S+';
  if (scoreVal >= 97) return 'S';
  if (scoreVal >= 94) return 'AAA';
  if (scoreVal >= 90) return 'AA';
  if (scoreVal >= 80) return 'A';
  return 'F';
}

function getRankFromScore(score: string | null) {
  const parsed = parseScore(score);
  return parsed !== null ? getRank(parsed) : 'N/A';
}

function drawRankText(ctx: CanvasContext, rank: string, x: number, y: number) {
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  if (rank === 'SSS' || rank === 'SSS+') {
    const parts = [
      { ch: 'S', color: '#f5d142' },
      { ch: 'S', color: '#4ea3ff' },
      { ch: 'S', color: '#ff4d4f' },
    ];
    const extra = rank.endsWith('+') ? [{ ch: '+', color: '#f5d142' }] : [];
    const text = parts.concat(extra);
    const width = ctx.measureText(rank).width;
    const startX = x - width / 2;
    let offset = 0;
    for (const part of text) {
      ctx.fillStyle = part.color;
      ctx.fillText(part.ch, startX + offset, y);
      offset += ctx.measureText(part.ch).width;
    }
    return;
  }

  if (['S', 'S+', 'SS', 'SS+'].includes(rank)) {
    ctx.fillStyle = '#f5d142';
  } else if (['A', 'AA', 'AAA'].includes(rank)) {
    ctx.fillStyle = '#ff4d4f';
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fillText(rank, x, y);
}

function drawTextWithStroke(
  ctx: CanvasContext,
  text: string,
  x: number,
  y: number,
  fill: string,
  stroke = '#000',
  lineWidth = 3,
) {
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawCompactCard(
  ctx: CanvasContext,
  x: number,
  y: number,
  width: number,
  height: number,
  card: CompactCard & { image?: CanvasImage | null },
) {
  const color = LEVEL_COLORS[card.chartIndex] ?? '#888';
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);

  const coverX = x + 8;
  const coverY = y + 8;
  const coverSize = 140;

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(coverX, coverY, coverSize, coverSize);

  if (card.image) {
    ctx.drawImage(card.image, coverX, coverY, coverSize, coverSize);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(coverX, coverY, coverSize, coverSize);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `bold 12px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No Cover', coverX + coverSize / 2, coverY + coverSize / 2);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(coverX, coverY + coverSize - 22, coverSize, 22);

  ctx.fillStyle = color;
  ctx.fillRect(coverX, coverY, 80, 18);
  ctx.fillStyle = '#fff';
  ctx.font = `bold 10px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    `${card.detailLevelText} ${DIFFICULTY_NAMES[card.chartIndex] ?? 'UNKNOWN'}`,
    coverX + 6,
    coverY + 3,
  );

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(coverX, coverY + coverSize - 18, 90, 18);
  ctx.fillStyle = '#fff';
  ctx.font = `bold 10px ${FONT_FAMILY}`;
  ctx.fillText(
    `Rating: ${typeof card.rating === 'number' ? Math.round(card.rating) : '-'}`,
    coverX + 6,
    coverY + coverSize - 16,
  );

  if (card.type === 'dx') {
    ctx.fillStyle = '#f97316';
    ctx.fillRect(coverX + coverSize - 30, coverY + 4, 26, 16);
    ctx.fillStyle = '#fff';
    ctx.font = `bold 10px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('DX', coverX + coverSize - 17, coverY + 5);
  }

  const scoreText = card.score ?? 'N/A';
  ctx.font = `bold 18px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawTextWithStroke(
    ctx,
    scoreText,
    coverX + coverSize / 2,
    coverY + 58,
    '#f5d142',
  );

  const rank = getRankFromScore(card.score);
  ctx.font = `bold 18px ${FONT_FAMILY}`;
  drawRankText(ctx, rank, coverX + coverSize / 2, coverY + 82);

  ctx.font = `bold 12px ${FONT_FAMILY}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(
    truncateText(ctx, card.title, width - 12),
    x + width / 2,
    y + coverSize + 16,
  );
}

function truncateText(ctx: CanvasContext, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (
    trimmed.length > 0 &&
    ctx.measureText(`${trimmed}...`).width > maxWidth
  ) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}...`;
}

function drawMinimalCard(
  ctx: CanvasContext,
  x: number,
  y: number,
  size: number,
  entry: ChartEntry,
  image: CanvasImage | null,
) {
  const color = LEVEL_COLORS[entry.chartIndex] ?? '#888';
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);

  const coverSize = size - 12;
  const coverX = x + 6;
  const coverY = y + 6;
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(coverX, coverY, coverSize, coverSize);

  if (image) {
    ctx.drawImage(image, coverX, coverY, coverSize, coverSize);
  }

  const scoreText = entry.score?.score || entry.score?.dxScore || null;
  const rank = getRankFromScore(scoreText);

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(coverX, coverY, coverSize, coverSize);

  ctx.font = `bold 14px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawRankText(ctx, rank, coverX + coverSize / 2, coverY + coverSize / 2 - 4);

  drawStatusBadge(
    ctx,
    coverX + coverSize / 2 - 12,
    coverY + coverSize - 18,
    entry.score?.fc,
    true,
  );
  drawStatusBadge(
    ctx,
    coverX + coverSize / 2 + 12,
    coverY + coverSize - 18,
    entry.score?.fs,
    false,
  );
}

function drawStatusBadge(
  ctx: CanvasContext,
  x: number,
  y: number,
  value: string | null | undefined,
  isFc: boolean,
) {
  const map = isFc ? FC_NAMES : FS_NAMES;
  const label = value ? map[value] || value.toUpperCase() : '';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = value ? '#ffffff' : '#cbd5f5';
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.stroke();

  if (label) {
    ctx.fillStyle = '#111827';
    ctx.font = `bold 8px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
  }
}
