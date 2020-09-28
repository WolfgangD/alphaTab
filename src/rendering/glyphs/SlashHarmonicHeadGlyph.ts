import { MusicFontGlyph } from '@src/rendering/glyphs/MusicFontGlyph';
import { MusicFontSymbol } from '@src/rendering/glyphs/MusicFontSymbol';
import { SlashNoteHeadGlyph } from '@src/rendering/glyphs/SlashNoteHeadGlyph';

export class SlashHarmonicHeadGlyph extends MusicFontGlyph {
    public constructor(x: number, y: number) {
        super(x, y, 1, MusicFontSymbol.SlashDiamond);
    }

    public doLayout(): void {
        this.width = 9 * this.scale;
        this.height = SlashNoteHeadGlyph.SlashHeadHeight * this.scale;
    }
}
