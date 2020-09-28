import { Duration } from '@src/model/Duration';
import { ICanvas } from '@src/platform/ICanvas';
import { MusicFontGlyph } from '@src/rendering/glyphs/MusicFontGlyph';
import { MusicFontSymbol } from '@src/rendering/glyphs/MusicFontSymbol';

export class SlashNoteHeadGlyph extends MusicFontGlyph {
    public static readonly SlashHeadHeight: number = 9;
    public static readonly SlashWidth: number = 20;
    private _duration: Duration;

    public constructor(x: number, y: number, duration: Duration) {
        super(x, y, 1, SlashNoteHeadGlyph.getSymbol(duration));
        this._duration = duration;
    }

    public paint(cx: number, cy: number, canvas: ICanvas): void {
        canvas.fillMusicFontSymbol(cx + this.x, cy + this.y, this.glyphScale * this.scale, this.symbol, false);
    }

    public doLayout(): void {
        switch (this._duration) {
            case Duration.QuadrupleWhole:
            case Duration.DoubleWhole:
            case Duration.Whole:
                this.width = 14 * this.scale;
                break;
            default:
                this.width = SlashNoteHeadGlyph.SlashWidth * this.scale;
                break;
        }
        this.height = SlashNoteHeadGlyph.SlashHeadHeight * this.scale;
    }

    private static getSymbol(duration: Duration): MusicFontSymbol {
        switch (duration) {
            case Duration.QuadrupleWhole:
            case Duration.DoubleWhole:
            case Duration.Whole:
                return MusicFontSymbol.SlashHalf;
            default:
                return MusicFontSymbol.SlashHorizontalEnds;
        }
    }
}
