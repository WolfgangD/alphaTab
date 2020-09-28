import { Duration } from '@src/model/Duration';
import { GraceType } from '@src/model/GraceType';
import { Note } from '@src/model/Note';
import { BeatOnNoteGlyphBase } from '@src/rendering/glyphs/BeatOnNoteGlyphBase';
import { CircleGlyph } from '@src/rendering/glyphs/CircleGlyph';
import { EffectGlyph } from '@src/rendering/glyphs/EffectGlyph';
import { GhostNoteContainerGlyph } from '@src/rendering/glyphs/GhostNoteContainerGlyph';
import { GlyphGroup } from '@src/rendering/glyphs/GlyphGroup';
import { NoteHeadGlyph } from '@src/rendering/glyphs/NoteHeadGlyph';
import { SlashNoteHeadGlyph } from '@src/rendering/glyphs/SlashNoteHeadGlyph';
import { ScoreRestGlyph } from '@src/rendering/glyphs/ScoreRestGlyph';
import { ScoreWhammyBarGlyph } from '@src/rendering/glyphs/ScoreWhammyBarGlyph';
import { SpacingGlyph } from '@src/rendering/glyphs/SpacingGlyph';
import { ScoreBarRenderer } from '@src/rendering/ScoreBarRenderer';
import { NoteXPosition, NoteYPosition } from '../BarRendererBase';
import { SlashNoteChordGlyph } from '@src/rendering/glyphs/SlashNoteChordGlyph'
import { SlashDeadNoteHeadGlyph } from '@src/rendering/glyphs/SlashDeadNoteHeadGlyph'
import { SlashHarmonicHeadGlyph } from '@src/rendering/glyphs/SlashHarmonicHeadGlyph'
import { Glyph } from './Glyph';
import { BeatBounds } from '../utils/BeatBounds';

export class SlashBeatGlyph extends BeatOnNoteGlyphBase {
    public slashHeads: SlashNoteChordGlyph | null = null;
    public restGlyph: ScoreRestGlyph | null = null;

    public getNoteX(note: Note, requestedPosition: NoteXPosition): number {
        return 0;
    }

    public buildBoundingsLookup(beatBounds:BeatBounds, cx:number, cy:number) {
        if(this.slashHeads) {
            this.slashHeads.buildBoundingsLookup(beatBounds, cx + this.x, cy + this.y);
        }
    }
    
    public getNoteY(note: Note, requestedPosition: NoteYPosition): number {
        return this.slashHeads ? this.slashHeads.getNoteY(note, requestedPosition) : 0;
    }

    public updateBeamingHelper(): void {
        if (this.slashHeads) {
            this.slashHeads.updateBeamingHelper(this.container.x + this.x);
        } else if (this.restGlyph) {
            this.restGlyph.updateBeamingHelper(this.container.x + this.x);
        }
    }

    public doLayout(): void {
        // create glyphs
        let sr: ScoreBarRenderer = this.renderer as ScoreBarRenderer;
        if (!this.container.beat.isEmpty) {
            if (!this.container.beat.isRest) {
                //
                // Slash Chord
                //
                this.slashHeads = new SlashNoteChordGlyph();
                this.slashHeads.beat = this.container.beat;
                this.slashHeads.beamingHelper = this.beamingHelper;
                let ghost: GhostNoteContainerGlyph = new GhostNoteContainerGlyph(false);
                ghost.renderer = this.renderer;
                let slashHead = this.creatSlashGlyph(this.container.beat.notes);

                this.addGlyph(slashHead);
                if (!ghost.isEmpty) {
                    this.addGlyph(
                        new SpacingGlyph(
                            0,
                            0,
                            4 * (this.container.beat.graceType !== GraceType.None ? NoteHeadGlyph.GraceScale : 1) * this.scale
                        )
                    );
                    this.addGlyph(ghost);
                }
                //
                // Whammy Bar
                if (this.container.beat.hasWhammyBar) {
                    let whammy: ScoreWhammyBarGlyph = new ScoreWhammyBarGlyph(this.container.beat);
                    whammy.renderer = this.renderer;
                    whammy.doLayout();
                    this.container.ties.push(whammy);
                }
                //
                // Note dots
                //
                if (this.container.beat.dots > 0) {
                    this.addGlyph(new SpacingGlyph(0, 0, 5 * this.scale));
                    for (let i: number = 0; i < this.container.beat.dots; i++) {
                        let group: GlyphGroup = new GlyphGroup(0, 0);
                        for (let note of this.container.beat.notes) {
                            this.createBeatDot(sr.getNoteLine(note), group);
                        }
                        this.addGlyph(group);
                    }
                }
            } else {
                let dotLine: number = 0;
                let line: number = 0;
                let offset: number = 0;
                switch (this.container.beat.duration) {
                    case Duration.QuadrupleWhole:
                        line = 6;
                        dotLine = 5;
                        break;
                    case Duration.DoubleWhole:
                        line = 6;
                        dotLine = 5;
                        break;
                    case Duration.Whole:
                        line = 4;
                        dotLine = 5;
                        break;
                    case Duration.Half:
                        line = 6;
                        dotLine = 5;
                        break;
                    case Duration.Quarter:
                        line = 6;
                        offset = -2;
                        dotLine = 5;
                        break;
                    case Duration.Eighth:
                        line = 6;
                        dotLine = 5;
                        break;
                    case Duration.Sixteenth:
                        line = 6;
                        dotLine = 5;
                        break;
                    case Duration.ThirtySecond:
                        line = 6;
                        dotLine = 3;
                        break;
                    case Duration.SixtyFourth:
                        line = 6;
                        dotLine = 3;
                        break;
                    case Duration.OneHundredTwentyEighth:
                        line = 6;
                        dotLine = 3;
                        break;
                    case Duration.TwoHundredFiftySixth:
                        line = 6;
                        dotLine = 3;
                        break;
                }
                let y: number = sr.getScoreY(line, offset);
                this.restGlyph = new ScoreRestGlyph(0, y, this.container.beat.duration);
                this.restGlyph.beat = this.container.beat;
                this.restGlyph.beamingHelper = this.beamingHelper;
                this.addGlyph(this.restGlyph);
                //
                // Note dots
                //
                if (this.container.beat.dots > 0) {
                    this.addGlyph(new SpacingGlyph(0, 0, 5 * this.scale));
                    for (let i: number = 0; i < this.container.beat.dots; i++) {
                        let group: GlyphGroup = new GlyphGroup(0, 0);
                        this.createBeatDot(dotLine, group);
                        this.addGlyph(group);
                    }
                }
            }
        }
        super.doLayout();
        if (this.container.beat.isEmpty) {
            this.centerX = this.width / 2;
        } else if (this.container.beat.isRest) {
            this.centerX = this.restGlyph!.x + this.restGlyph!.width / 2;
        } else {
            this.centerX = this.slashHeads!.x + this.slashHeads!.width / 2;
        }
    }

    private createBeatDot(line: number, group: GlyphGroup): void {
        let sr: ScoreBarRenderer = this.renderer as ScoreBarRenderer;
        group.addGlyph(new CircleGlyph(0, sr.getScoreY(line, 0), 1.5 * this.scale));
    }

    // private static NormalKeys: Map<number, boolean> = new Map([
    //     [32, true],
    //     [34, true],
    //     [35, true],
    //     [36, true],
    //     [38, true],
    //     [39, true],
    //     [40, true],
    //     [41, true],
    //     [43, true],
    //     [45, true],
    //     [47, true],
    //     [48, true],
    //     [50, true],
    //     [55, true],
    //     [56, true],
    //     [58, true],
    //     [60, true],
    //     [61, true]
    // ]);
    // private static XKeys: Map<number, boolean> = new Map([
    //     [31, true],
    //     [33, true],
    //     [37, true],
    //     [42, true],
    //     [44, true],
    //     [54, true],
    //     [62, true],
    //     [63, true],
    //     [64, true],
    //     [65, true],
    //     [66, true]
    // ]);

    private createSlashHeadGlyph(duration: Duration, isDeadNote: boolean, isHarmonic: boolean): EffectGlyph {
        if (isDeadNote) {
            return new SlashDeadNoteHeadGlyph(0, 0);
        }
        if (isHarmonic) {
            return new SlashHarmonicHeadGlyph(0, 0);
        }
        return new SlashNoteHeadGlyph(0, 0, duration);
    }

    private creatSlashGlyph(notes: Note[]): Glyph {
        let sr: ScoreBarRenderer = this.renderer as ScoreBarRenderer;

        var isDeadNote: boolean = false
        var isHarmonic: boolean = false

        var duration = Duration.DoubleWhole

        for (let n of notes) {
            isDeadNote = isDeadNote || n.isDead;
            isHarmonic = isHarmonic || n.isHarmonic;
            if (duration < n.beat.duration) {
                duration = n.beat.duration;
            }
        }
        
        let noteHeadGlyph: EffectGlyph = this.createSlashHeadGlyph(duration, isDeadNote, isHarmonic);

        // calculate y position
        noteHeadGlyph.y = sr.getScoreY(6, 0);
        this.slashHeads?.addNoteGlyph(noteHeadGlyph, notes[0]);
        return noteHeadGlyph;
    }
}
