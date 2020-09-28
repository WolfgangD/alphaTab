import { Bar } from '@src/model/Bar';
import { Beat } from '@src/model/Beat';
import { Duration } from '@src/model/Duration';
import { GraceType } from '@src/model/GraceType';
import { Note } from '@src/model/Note';
import { TupletGroup } from '@src/model/TupletGroup';
import { Voice } from '@src/model/Voice';
import { ICanvas, TextAlign } from '@src/platform/ICanvas';
import { BarRendererBase } from '@src/rendering/BarRendererBase';
import { BarNumberGlyph } from '@src/rendering/glyphs/BarNumberGlyph';
import { BarSeperatorGlyph } from '@src/rendering/glyphs/BarSeperatorGlyph';
import { FlagGlyph } from '@src/rendering/glyphs/FlagGlyph';
import { RepeatCloseGlyph } from '@src/rendering/glyphs/RepeatCloseGlyph';
import { RepeatCountGlyph } from '@src/rendering/glyphs/RepeatCountGlyph';
import { RepeatOpenGlyph } from '@src/rendering/glyphs/RepeatOpenGlyph';
import { SlashBeatGlyph } from '@src/rendering/glyphs/SlashBeatGlyph';
import { SlashBeatPreNotesGlyph } from '@src/rendering/glyphs/SlashBeatPreNotesGlyph';
import { ScoreTimeSignatureGlyph } from '@src/rendering/glyphs/ScoreTimeSignatureGlyph';
import { SpacingGlyph } from '@src/rendering/glyphs/SpacingGlyph';
import { VoiceContainerGlyph } from '@src/rendering/glyphs/VoiceContainerGlyph';
import { SlashBeatContainerGlyph } from '@src/rendering/glyphs/SlashBeatContainerGlyph';
import { ScoreRenderer } from '@src/rendering/ScoreRenderer';
import { AccidentalHelper } from '@src/rendering/utils/AccidentalHelper';
import { BeamDirection } from '@src/rendering/utils/BeamDirection';
import { BeamingHelper } from '@src/rendering/utils/BeamingHelper';
import { IBeamYCalculator } from '@src/rendering/utils/IBeamYCalculator';
import { RenderingResources } from '@src/RenderingResources';
import { ModelUtils } from '@src/model/ModelUtils';
import { NoteHeadGlyph } from '@src/rendering/glyphs/NoteHeadGlyph';
import { NotationMode} from '@src/NotationSettings'

/**
 * This BarRenderer renders a bar using slash notation.
 */
export class SlashBarRenderer extends BarRendererBase implements IBeamYCalculator {
    public static readonly StaffId: string = 'score';
    private static readonly LineSpacing: number = 8;
    private static readonly StemWidth: number = 1.3;

    public simpleWhammyOverflow: number = 0;

    public accidentalHelper: AccidentalHelper;

    public constructor(renderer: ScoreRenderer, bar: Bar) {
        super(renderer, bar);
        this._startSpacing = false;
        this.accidentalHelper = new AccidentalHelper(bar);

        for (let helpers of this.helpers.beamHelpers) {
            for (let helper of helpers) {
                helper.preferredBeamDirection = BeamDirection.Up;
                helper.finish();
            }
        }
    }

    public getBeatDirection(beat: Beat): BeamDirection {
        return BeamDirection.Up;
    }

    public get lineOffset(): number {
        return (SlashBarRenderer.LineSpacing + 1) * this.scale;
    }

    protected updateSizes(): void {
        let res: RenderingResources = this.resources;
        let glyphOverflow: number = res.tablatureFont.size / 2 + res.tablatureFont.size * 0.2;
        this.topPadding = glyphOverflow;
        this.bottomPadding = glyphOverflow;
        this.height = this.lineOffset * 4 + this.topPadding + this.bottomPadding;
        super.updateSizes();
    }

    public doLayout(): void {
        super.doLayout();
        if (!this.bar.isEmpty && this.accidentalHelper.maxNoteValueBeat) {
            let top: number = this.getScoreY(0, 0);
            let bottom: number = this.getScoreY(8, 0);
            let whammyOffset: number = this.simpleWhammyOverflow;
            this.registerOverflowTop(whammyOffset);
            let maxNoteY: number = this.getYPositionForNoteValue(this.accidentalHelper.maxNoteValue);
            let maxNoteHelper: BeamingHelper = this.helpers.getBeamingHelperForBeat(
                this.accidentalHelper.maxNoteValueBeat
            );
            if (maxNoteHelper.direction === BeamDirection.Up) {
                maxNoteY -= this.getStemSize(maxNoteHelper);
                maxNoteY -= maxNoteHelper.fingeringCount * this.resources.graceFont.size;
                if (maxNoteHelper.hasTuplet) {
                    maxNoteY -= this.resources.effectFont.size * 2;
                }
            }
            if (maxNoteHelper.hasTuplet) {
                maxNoteY -= this.resources.effectFont.size * 1.5;
            }
            if (maxNoteY < top) {
                this.registerOverflowTop(Math.abs(maxNoteY) + whammyOffset);
            }
            let minNoteY: number = this.getYPositionForNoteValue(this.accidentalHelper.minNoteValue);
            let minNoteHelper: BeamingHelper = this.helpers.getBeamingHelperForBeat(
                this.accidentalHelper.minNoteValueBeat!
            );
            if (minNoteHelper.direction === BeamDirection.Down) {
                minNoteY += this.getStemSize(minNoteHelper);
                minNoteY += minNoteHelper.fingeringCount * this.resources.graceFont.size;
            }
            if (minNoteY > bottom) {
                this.registerOverflowBottom(Math.abs(minNoteY) - bottom);
            }
        }
    }

    public paint(cx: number, cy: number, canvas: ICanvas): void {
        super.paint(cx, cy, canvas);
        this.paintBeams(cx, cy, canvas);
        this.paintTuplets(cx, cy, canvas);
    }

    private paintTuplets(cx: number, cy: number, canvas: ICanvas): void {
        for (let voice of this.bar.voices) {
            if (this.hasVoiceContainer(voice)) {
                let container: VoiceContainerGlyph = this.getOrCreateVoiceContainer(voice);
                for (let tupletGroup of container.tupletGroups) {
                    this.paintTupletHelper(cx + this.beatGlyphsStart, cy, canvas, tupletGroup);
                }
            }
        }
    }

    private paintBeams(cx: number, cy: number, canvas: ICanvas): void {
        for (let i: number = 0, j: number = this.helpers.beamHelpers.length; i < j; i++) {
            let v: BeamingHelper[] = this.helpers.beamHelpers[i];
            for (let k: number = 0, l: number = v.length; k < l; k++) {
                let h: BeamingHelper = v[k];
                this.paintBeamHelper(cx + this.beatGlyphsStart, cy, canvas, h);
            }
        }
    }

    private paintBeamHelper(cx: number, cy: number, canvas: ICanvas, h: BeamingHelper): void {
        canvas.color = h.voice!.index === 0 ? this.resources.mainGlyphColor : this.resources.secondaryGlyphColor;
        // TODO: draw stem at least at the center of the score staff.
        // check if we need to paint simple footer
        if (h.beats.length === 1) {
            this.paintFlag(cx, cy, canvas, h);
        } else {
            this.paintBar(cx, cy, canvas, h);
        }
    }

    private paintTupletHelper(cx: number, cy: number, canvas: ICanvas, h: TupletGroup): void {
        let res: RenderingResources = this.resources;
        let oldAlign: TextAlign = canvas.textAlign;
        canvas.color = h.voice.index === 0 ? this.resources.mainGlyphColor : this.resources.secondaryGlyphColor;
        canvas.textAlign = TextAlign.Center;
        let s: string;
        let num: number = h.beats[0].tupletNumerator;
        let den: number = h.beats[0].tupletDenominator;
        // list as in Guitar Pro 7. for certain tuplets only the numerator is shown
        if (num === 2 && den === 3) {
            s = '2';
        } else if (num === 3 && den === 2) {
            s = '3';
        } else if (num === 4 && den === 6) {
            s = '4';
        } else if (num === 5 && den === 4) {
            s = '5';
        } else if (num === 6 && den === 4) {
            s = '6';
        } else if (num === 7 && den === 4) {
            s = '7';
        } else if (num === 9 && den === 8) {
            s = '9';
        } else if (num === 10 && den === 8) {
            s = '10';
        } else if (num === 11 && den === 8) {
            s = '11';
        } else if (num === 12 && den === 8) {
            s = '12';
        } else if (num === 13 && den === 8) {
            s = '13';
        } else {
            s = num + ':' + den;
        }
        // check if we need to paint simple footer
        if (h.beats.length === 1 || !h.isFull) {
            for (let i: number = 0, j: number = h.beats.length; i < j; i++) {
                let beat: Beat = h.beats[i];
                let beamingHelper: BeamingHelper = this.helpers.beamHelperLookup[h.voice.index].get(beat.index)!;
                if (!beamingHelper) {
                    continue;
                }
                let direction: BeamDirection = beamingHelper.direction;
                let tupletX: number = beamingHelper.getBeatLineX(beat) + this.scale;
                let tupletY: number = cy + this.y + this.calculateBeamY(beamingHelper, tupletX);
                let offset: number = direction === BeamDirection.Up ? res.effectFont.size * 1.5 : -3 * this.scale;
                canvas.font = res.effectFont;
                canvas.fillText(s, cx + this.x + tupletX, tupletY - offset);
            }
        } else {
            let firstBeat: Beat = h.beats[0];
            let lastBeat: Beat = h.beats[h.beats.length - 1];
            let firstBeamingHelper: BeamingHelper = this.helpers.beamHelperLookup[h.voice.index].get(firstBeat.index)!;
            let lastBeamingHelper: BeamingHelper = this.helpers.beamHelperLookup[h.voice.index].get(lastBeat.index)!;
            if (firstBeamingHelper && lastBeamingHelper) {
                let direction: BeamDirection = firstBeamingHelper.direction;
                //
                // Calculate the overall area of the tuplet bracket
                let startX: number = firstBeamingHelper.getBeatLineX(firstBeat) + this.scale;
                let endX: number = lastBeamingHelper.getBeatLineX(lastBeat) + this.scale;
                //
                // Calculate how many space the text will need
                canvas.font = res.effectFont;
                let sw: number = canvas.measureText(s);
                let sp: number = 3 * this.scale;
                //
                // Calculate the offsets where to break the bracket
                let middleX: number = (startX + endX) / 2;
                let offset1X: number = middleX - sw / 2 - sp;
                let offset2X: number = middleX + sw / 2 + sp;
                //
                // calculate the y positions for our bracket
                let startY: number = this.calculateBeamYWithDirection(
                    firstBeamingHelper,
                    startX,
                    firstBeamingHelper.direction
                );
                let endY: number = this.calculateBeamYWithDirection(
                    lastBeamingHelper,
                    endX,
                    firstBeamingHelper.direction
                );
                let k: number = (endY - startY) / (endX - startX);
                let d: number = startY - k * startX;
                let offset1Y: number = k * offset1X + d;
                let middleY: number = k * middleX + d;
                let offset2Y: number = k * offset2X + d;
                let offset: number = 10 * this.scale;
                let size: number = 5 * this.scale;
                if (direction === BeamDirection.Down) {
                    offset *= -1;
                    size *= -1;
                }
                //
                // draw the bracket
                canvas.beginPath();
                canvas.moveTo(cx + this.x + startX, (cy + this.y + startY - offset) | 0);
                canvas.lineTo(cx + this.x + startX, (cy + this.y + startY - offset - size) | 0);
                canvas.lineTo(cx + this.x + offset1X, (cy + this.y + offset1Y - offset - size) | 0);
                canvas.stroke();
                canvas.beginPath();
                canvas.moveTo(cx + this.x + offset2X, (cy + this.y + offset2Y - offset - size) | 0);
                canvas.lineTo(cx + this.x + endX, (cy + this.y + endY - offset - size) | 0);
                canvas.lineTo(cx + this.x + endX, (cy + this.y + endY - offset) | 0);
                canvas.stroke();
                //
                // Draw the string
                canvas.fillText(
                    s,
                    cx + this.x + middleX,
                    cy + this.y + middleY - offset - size - res.effectFont.size / 2
                );
            }
        }
        canvas.textAlign = oldAlign;
    }

    public getStemSize(helper: BeamingHelper): number {
        let size: number =
            helper.beats.length === 1
                ? this.getFlagStemSize(helper.shortestDuration)
                : this.getBarStemSize(helper.shortestDuration);
        if (helper.isGrace) {
            size = size * NoteHeadGlyph.GraceScale;
        }
        return size;
    }

    private getBarStemSize(duration: Duration): number {
        let size: number = 0;
        switch (duration) {
            case Duration.QuadrupleWhole:
                size = 6;
                break;
            case Duration.Half:
                size = 6;
                break;
            case Duration.Quarter:
                size = 6;
                break;
            case Duration.Eighth:
                size = 6;
                break;
            case Duration.Sixteenth:
                size = 6;
                break;
            case Duration.ThirtySecond:
                size = 7;
                break;
            case Duration.SixtyFourth:
                size = 7;
                break;
            case Duration.OneHundredTwentyEighth:
                size = 9;
                break;
            case Duration.TwoHundredFiftySixth:
                size = 10;
                break;
            default:
                size = 0;
                break;
        }
        return this.getScoreY(size, 0);
    }

    private getFlagStemSize(duration: Duration): number {
        let size: number = 0;
        switch (duration) {
            case Duration.QuadrupleWhole:
                size = 6;
                break;
            case Duration.Half:
                size = 6;
                break;
            case Duration.Quarter:
                size = 6;
                break;
            case Duration.Eighth:
                size = 6;
                break;
            case Duration.Sixteenth:
                size = 6;
                break;
            case Duration.ThirtySecond:
                size = 6;
                break;
            case Duration.SixtyFourth:
                size = 6;
                break;
            case Duration.OneHundredTwentyEighth:
                size = 6;
                break;
            case Duration.TwoHundredFiftySixth:
                size = 6;
                break;
            default:
                size = 0;
                break;
        }
        return this.getScoreY(size, 0);
    }

    public getYPositionForNoteValue(noteValue: number): number {
        return this.getScoreY(this.accidentalHelper.getNoteLineForValue(noteValue, true), 0);
    }

    public calculateBeamY(h: BeamingHelper, x: number): number {
        let stemSize: number = this.getStemSize(h);
        return h.calculateBeamY(stemSize, this.scale, x, this.scale, this);
    }

    private calculateBeamYWithDirection(h: BeamingHelper, x: number, direction: BeamDirection): number {
        let stemSize: number = this.getStemSize(h);
        return h.calculateBeamYWithDirection(stemSize, this.scale, x, this.scale, this, direction);
    }

    private paintBar(cx: number, cy: number, canvas: ICanvas, h: BeamingHelper): void {
        for (let i: number = 0, j: number = h.beats.length; i < j; i++) {
            let beat: Beat = h.beats[i];
            let isGrace: boolean = beat.graceType !== GraceType.None;
            let scaleMod: number = isGrace ? NoteHeadGlyph.GraceScale : 1;
            //
            // draw line
            //
            let beatLineX: number = h.getBeatLineX(beat) + this.scale;
            let direction: BeamDirection = BeamDirection.Up;
            let y1: number = cy + this.y;
            y1 += this.getScoreY(6,0);
            let y2: number = cy + this.y;
            y2 += this.calculateBeamY(h, beatLineX);
            canvas.lineWidth = SlashBarRenderer.StemWidth * this.scale;
            canvas.beginPath();
            canvas.moveTo(cx + this.x + beatLineX, y1);
            canvas.lineTo(cx + this.x + beatLineX, y2);
            canvas.stroke();
            canvas.lineWidth = this.scale;
            
            let brokenBarOffset: number = 6 * this.scale * scaleMod;
            let barSpacing: number = 7 * this.scale * scaleMod;
            let barSize: number = (SlashBarRenderer.LineSpacing / 2) * this.scale * scaleMod;
            let barCount: number = ModelUtils.getIndex(beat.duration) - 2;
            let barStart: number = cy + this.y;
            // if (direction === BeamDirection.Down) {
            //     barSpacing = -barSpacing;
            //     barSize = -barSize;
            // }
            for (let barIndex: number = 0; barIndex < barCount; barIndex++) {
                let barStartX: number = 0;
                let barEndX: number = 0;
                let barStartY: number = 0;
                let barEndY: number = 0;
                let barY: number = barStart + barIndex * barSpacing;
                //
                // Bar to Next?
                //
                if (i < h.beats.length - 1) {
                    // full bar?
                    if (BeamingHelper.isFullBarJoin(beat, h.beats[i + 1], barIndex)) {
                        barStartX = beatLineX;
                        barEndX = h.getBeatLineX(h.beats[i + 1]) + this.scale;
                    } else if (i === 0 || !BeamingHelper.isFullBarJoin(h.beats[i - 1], beat, barIndex)) {
                        barStartX = beatLineX;
                        barEndX = barStartX + brokenBarOffset;
                    } else {
                        continue;
                    }
                    barStartY = barY + this.calculateBeamY(h, barStartX);
                    barEndY = barY + this.calculateBeamY(h, barEndX);
                    SlashBarRenderer.paintSingleBar(
                        canvas,
                        cx + this.x + barStartX,
                        barStartY,
                        cx + this.x + barEndX,
                        barEndY,
                        barSize
                    );
                } else if (i > 0 && !BeamingHelper.isFullBarJoin(beat, h.beats[i - 1], barIndex)) {
                    barStartX = beatLineX - brokenBarOffset;
                    barEndX = beatLineX;
                    barStartY = barY + this.calculateBeamY(h, barStartX);
                    barEndY = barY + this.calculateBeamY(h, barEndX);
                    SlashBarRenderer.paintSingleBar(
                        canvas,
                        cx + this.x + barStartX,
                        barStartY,
                        cx + this.x + barEndX,
                        barEndY,
                        barSize
                    );
                }
            }
        }
    }

    private static paintSingleBar(canvas: ICanvas, x1: number, y1: number, x2: number, y2: number, size: number): void {
        canvas.beginPath();
        canvas.moveTo(x1, y1);
        canvas.lineTo(x2, y2);
        canvas.lineTo(x2, y2 + size);
        canvas.lineTo(x1, y1 + size);
        canvas.closePath();
        canvas.fill();
    }

    private paintFlag(cx: number, cy: number, canvas: ICanvas, h: BeamingHelper): void {
        let beat: Beat = h.beats[0];
        if (
            beat.graceType === GraceType.BendGrace ||
            (beat.graceType !== GraceType.None && this.settings.notation.notationMode === NotationMode.SongBook)
        ) {
            return;
        }
        let isGrace: boolean = beat.graceType !== GraceType.None;
        let scaleMod: number = isGrace ? NoteHeadGlyph.GraceScale : 1;
        //
        // draw line
        //
        let stemSize: number = this.getFlagStemSize(h.shortestDuration);
        let beatLineX: number = h.getBeatLineX(beat) + this.scale;
        let topY: number = this.getYPositionForNoteValue(h.maxNoteValue);
        let bottomY: number = this.getYPositionForNoteValue(h.minNoteValue);
        let beamY: number = 0;
        
        topY -= stemSize * scaleMod;
        beamY = topY;
    
        if (!h.hasLine) {
            return;
        }

        canvas.lineWidth = SlashBarRenderer.StemWidth * this.scale;
        canvas.beginPath();
        canvas.moveTo(cx + this.x + beatLineX, cy + this.y + topY);
        canvas.lineTo(cx + this.x + beatLineX, cy + this.y + bottomY);
        canvas.stroke();
        canvas.lineWidth = this.scale;
        if (beat.graceType === GraceType.BeforeBeat) {
            let graceSizeY: number = 15 * this.scale;
            let graceSizeX: number = 12 * this.scale;
            canvas.beginPath();
            canvas.moveTo(cx + this.x + beatLineX - graceSizeX / 2, cy + this.y + topY + graceSizeY);
            canvas.lineTo(cx + this.x + beatLineX + graceSizeX / 2, cy + this.y + topY);
            canvas.stroke();
        }
        //
        // Draw flag
        //
        if (h.hasFlag) {
            let glyph: FlagGlyph = new FlagGlyph(beatLineX - this.scale / 2, beamY, beat.duration, BeamDirection.Up, isGrace);
            glyph.renderer = this;
            glyph.doLayout();
            glyph.paint(cx + this.x, cy + this.y, canvas);
        }
    }

    protected createPreBeatGlyphs(): void {
        super.createPreBeatGlyphs();
        if (this.bar.masterBar.isRepeatStart) {
            this.addPreBeatGlyph(new RepeatOpenGlyph(0, 0, 1.5, 3));
        }
        // Time Signature
        if (
            !this.bar.previousBar ||
            (this.bar.previousBar &&
                this.bar.masterBar.timeSignatureNumerator !== this.bar.previousBar.masterBar.timeSignatureNumerator) ||
            (this.bar.previousBar &&
                this.bar.masterBar.timeSignatureDenominator !== this.bar.previousBar.masterBar.timeSignatureDenominator)
        ) {
            this.createStartSpacing();
            this.createTimeSignatureGlyphs();
        }
        this.addPreBeatGlyph(new BarNumberGlyph(0, this.getScoreY(-0.5, 0), this.bar.index + 1));
    }

    protected createPostBeatGlyphs(): void {
        super.createPostBeatGlyphs();
        if (this.bar.masterBar.isRepeatEnd) {
            this.addPostBeatGlyph(new RepeatCloseGlyph(this.x, 0));
            if (this.bar.masterBar.repeatCount > 2) {
                this.addPostBeatGlyph(new RepeatCountGlyph(0, this.getScoreY(-1, -3), this.bar.masterBar.repeatCount));
            }
        } else {
            this.addPostBeatGlyph(new BarSeperatorGlyph(0, 0));
        }
    }

    private _startSpacing: boolean;

    private createStartSpacing(): void {
        if (this._startSpacing) {
            return;
        }
        this.addPreBeatGlyph(new SpacingGlyph(0, 0, 2 * this.scale));
        this._startSpacing = true;
    }

    private createTimeSignatureGlyphs(): void {
        this.addPreBeatGlyph(new SpacingGlyph(0, 0, 5 * this.scale));
        this.addPreBeatGlyph(
            new ScoreTimeSignatureGlyph(
                0,
                this.getScoreY(2, 0),
                this.bar.masterBar.timeSignatureNumerator,
                this.bar.masterBar.timeSignatureDenominator,
                this.bar.masterBar.timeSignatureCommon
            )
        );
    }

    protected createVoiceGlyphs(v: Voice): void {
        for (let i: number = 0, j: number = v.beats.length; i < j; i++) {
            let b: Beat = v.beats[i];
            let container: SlashBeatContainerGlyph = new SlashBeatContainerGlyph(b, this.getOrCreateVoiceContainer(v));
            container.preNotes = new SlashBeatPreNotesGlyph();
            container.onNotes = new SlashBeatGlyph();
            this.addBeatGlyph(container);
        }
    }

    // TODO[performance]: Maybe we should cache this (check profiler)
    public getNoteLine(n: Note): number {
        return this.accidentalHelper.getNoteLine(n);
    }

    /**
     * Gets the relative y position of the given steps relative to first line.
     * @param steps the amount of steps while 2 steps are one line
     * @param correction
     * @returns
     */
    public getScoreY(steps: number, correction: number = 0): number {
        return (this.lineOffset / 2) * steps + correction * this.scale;
    }

    // private static readonly Random Random = new Random();
    protected paintBackground(cx: number, cy: number, canvas: ICanvas): void {
        super.paintBackground(cx, cy, canvas);
        let res: RenderingResources = this.resources;
        canvas.color = res.staffLineColor;
        let lineY: number = cy + this.y + this.topPadding + 2 * this.lineOffset;
        canvas.fillRect(cx + this.x, lineY | 0, this.width, this.scale);
        canvas.color = res.mainGlyphColor;
        this.paintSimileMark(cx, cy, canvas);
    }
}
