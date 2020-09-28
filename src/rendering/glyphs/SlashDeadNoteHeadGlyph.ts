import { MusicFontGlyph } from '@src/rendering/glyphs/MusicFontGlyph';
import { MusicFontSymbol } from '@src/rendering/glyphs/MusicFontSymbol';
import { SlashNoteHeadGlyph } from '@src/rendering/glyphs/SlashNoteHeadGlyph';

export class SlashDeadNoteHeadGlyph extends MusicFontGlyph {
    public constructor(x: number, y: number) {
        super(x, y, 1, MusicFontSymbol.SlashDead);
    }

    public doLayout(): void {
        this.width = 9 * this.scale;
        this.height = SlashNoteHeadGlyph.SlashHeadHeight * this.scale;
    }
}
