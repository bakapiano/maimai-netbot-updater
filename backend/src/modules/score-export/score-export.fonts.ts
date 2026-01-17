import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as Canvas from '@napi-rs/canvas';

const FONT_DIR = join(process.cwd(), 'assets', 'fonts');
let fontsLoaded = false;

export function ensureFontsLoaded() {
  if (fontsLoaded) return;
  if (!existsSync(FONT_DIR)) {
    fontsLoaded = true;
    return;
  }

  const fonts = (
    Canvas as unknown as {
      GlobalFonts?: { loadFontsFromDir?: (dir: string) => void };
    }
  ).GlobalFonts;

  if (fonts?.loadFontsFromDir) {
    fonts.loadFontsFromDir(FONT_DIR);
  }

  fontsLoaded = true;
}
