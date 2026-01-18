import * as Canvas from '@napi-rs/canvas';

import { existsSync } from 'node:fs';
import { join } from 'node:path';

const FONT_DIR = join(process.cwd(), 'assets', 'fonts');
let fontsLoaded = false;

export function ensureFontsLoaded() {
  if (fontsLoaded) return;

  const fonts = (
    Canvas as unknown as {
      GlobalFonts?: {
        loadFontsFromDir?: (dir: string) => void;
        families?: { family: string }[];
      };
    }
  ).GlobalFonts;

  if (!existsSync(FONT_DIR)) {
    console.warn(`[Fonts] Font directory not found: ${FONT_DIR}`);
    fontsLoaded = true;
    return;
  }

  if (fonts?.loadFontsFromDir) {
    fonts.loadFontsFromDir(FONT_DIR);
    console.log(`[Fonts] Loaded fonts from: ${FONT_DIR}`);

    // 打印已注册的字体族，便于调试
    if (fonts.families) {
      const familyNames = fonts.families.map((f) => f.family);
      console.log(
        `[Fonts] Registered font families: ${familyNames.join(', ')}`,
      );
    }
  }

  fontsLoaded = true;
}
