import { UnsupportedFormatError } from '@src/importer/UnsupportedFormatError';
import { AccentuationType } from '@src/model/AccentuationType';
import { Automation, AutomationType } from '@src/model/Automation';
import { Bar } from '@src/model/Bar';
import { Beat } from '@src/model/Beat';
import { BendPoint } from '@src/model/BendPoint';
import { BrushType } from '@src/model/BrushType';
import { Chord } from '@src/model/Chord';
import { Clef } from '@src/model/Clef';
import { Color } from '@src/model/Color';
import { CrescendoType } from '@src/model/CrescendoType';
import { Duration } from '@src/model/Duration';
import { DynamicValue } from '@src/model/DynamicValue';
import { Fermata, FermataType } from '@src/model/Fermata';
import { Fingers } from '@src/model/Fingers';
import { GraceType } from '@src/model/GraceType';
import { HarmonicType } from '@src/model/HarmonicType';
import { KeySignature } from '@src/model/KeySignature';
import { KeySignatureType } from '@src/model/KeySignatureType';
import { Lyrics } from '@src/model/Lyrics';
import { MasterBar } from '@src/model/MasterBar';
import { Note } from '@src/model/Note';
import { Ottavia } from '@src/model/Ottavia';
import { PickStroke } from '@src/model/PickStroke';
import { Score } from '@src/model/Score';
import { Section } from '@src/model/Section';
import { SimileMark } from '@src/model/SimileMark';
import { SlideInType } from '@src/model/SlideInType';
import { SlideOutType } from '@src/model/SlideOutType';
import { Staff } from '@src/model/Staff';
import { Track } from '@src/model/Track';
import { TripletFeel } from '@src/model/TripletFeel';
import { VibratoType } from '@src/model/VibratoType';
import { Voice } from '@src/model/Voice';
import { Settings } from '@src/Settings';
import { XmlDocument } from '@src/xml/XmlDocument';

import { XmlNode, XmlNodeType } from '@src/xml/XmlNode';
import { MidiUtils } from '@src/audio/util/MidiUtils';

/**
 * This structure represents a duration within a gpif
 */
class GpifRhythm {
    public dots: number = 0;
    public tupletDenominator: number = -1;
    public tupletNumerator: number = -1;
    public value: Duration = Duration.Quarter;
}

/**
 * This public class can parse a score.gpif xml file into the model structure
 */
export class GpifParser {
    private static readonly InvalidId: string = '-1';

    /**
     * GPX range: 0-100
     * Internal range: 0 - 60
     */
    private static readonly BendPointPositionFactor: number = BendPoint.MaxPosition / 100.0;

    /**
     * GPIF: 25 per quarternote
     * Internal Range: 1 per quarter note
     */
    private static readonly BendPointValueFactor: number = 1 / 25.0;

    public score!: Score;

    private _masterTrackAutomations!: Map<string, Automation[]>;
    private _tracksMapping!: string[];
    private _tracksById!: Map<string, Track>;
    private _masterBars!: MasterBar[];
    private _barsOfMasterBar!: Array<string[]>;
    private _barsById!: Map<string, Bar>;
    private _voicesOfBar!: Map<string, string[]>;
    private _voiceById!: Map<string, Voice>;
    private _beatsOfVoice!: Map<string, string[]>;
    private _rhythmOfBeat!: Map<string, string>;
    private _beatById!: Map<string, Beat>;
    private _rhythmById!: Map<string, GpifRhythm>;
    private _noteById!: Map<string, Note>;
    private _notesOfBeat!: Map<string, string[]>;
    private _tappedNotes!: Map<string, boolean>;
    private _lyricsByTrack!: Map<string, Lyrics[]>;
    private _hasAnacrusis: boolean = false;

    public parseXml(xml: string, settings: Settings): void {
        this._masterTrackAutomations = new Map<string, Automation[]>();
        this._tracksMapping = [];
        this._tracksById = new Map<string, Track>();
        this._masterBars = [];
        this._barsOfMasterBar = [];
        this._voicesOfBar = new Map<string, string[]>();
        this._barsById = new Map<string, Bar>();
        this._voiceById = new Map<string, Voice>();
        this._beatsOfVoice = new Map<string, string[]>();
        this._beatById = new Map<string, Beat>();
        this._rhythmOfBeat = new Map<string, string>();
        this._rhythmById = new Map<string, GpifRhythm>();
        this._notesOfBeat = new Map<string, string[]>();
        this._noteById = new Map<string, Note>();
        this._tappedNotes = new Map<string, boolean>();
        this._lyricsByTrack = new Map<string, Lyrics[]>();

        let dom: XmlDocument;
        try {
            dom = new XmlDocument(xml);
        } catch (e) {
            throw new UnsupportedFormatError('Could not parse XML', e);
        }

        this.parseDom(dom);
        this.buildModel();
        this.score.finish(settings);
        if (this._lyricsByTrack.size > 0) {
            for (let kvp of this._lyricsByTrack) {
                let track: Track = this._tracksById.get(kvp[0])!;
                track.applyLyrics(kvp[1]);
            }
        }
    }

    private parseDom(dom: XmlDocument): void {
        let root: XmlNode | null = dom.documentElement;
        if (!root) {
            return;
        }
        // the XML uses IDs for referring elements within the
        //  Therefore we do the parsing in 2 steps:
        // - at first we read all model elements and store them by ID in a lookup table
        // - after that we need to join up the information.
        if (root.localName === 'GPIF') {
            this.score = new Score();
            // parse all children
            for (let n of root.childNodes) {
                if (n.nodeType === XmlNodeType.Element) {
                    switch (n.localName) {
                        case 'Score':
                            this.parseScoreNode(n);
                            break;
                        case 'MasterTrack':
                            this.parseMasterTrackNode(n);
                            break;
                        case 'Tracks':
                            this.parseTracksNode(n);
                            break;
                        case 'MasterBars':
                            this.parseMasterBarsNode(n);
                            break;
                        case 'Bars':
                            this.parseBars(n);
                            break;
                        case 'Voices':
                            this.parseVoices(n);
                            break;
                        case 'Beats':
                            this.parseBeats(n);
                            break;
                        case 'Notes':
                            this.parseNotes(n);
                            break;
                        case 'Rhythms':
                            this.parseRhythms(n);
                            break;
                    }
                }
            }
        } else {
            throw new UnsupportedFormatError('Root node of XML was not GPIF');
        }
    }

    //
    // <Score>...</Score>
    //
    private parseScoreNode(element: XmlNode): void {
        for (let c of element.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Title':
                        this.score.title = c.firstChild!.innerText;
                        break;
                    case 'SubTitle':
                        this.score.subTitle = c.firstChild!.innerText;
                        break;
                    case 'Artist':
                        this.score.artist = c.firstChild!.innerText;
                        break;
                    case 'Album':
                        this.score.album = c.firstChild!.innerText;
                        break;
                    case 'Words':
                        this.score.words = c.firstChild!.innerText;
                        break;
                    case 'Music':
                        this.score.music = c.firstChild!.innerText;
                        break;
                    case 'WordsAndMusic':
                        if (c.firstChild && c.firstChild.innerText !== '') {
                            let wordsAndMusic: string = c.firstChild.innerText;
                            if (wordsAndMusic && !this.score.words) {
                                this.score.words = wordsAndMusic;
                            }
                            if (wordsAndMusic && !this.score.music) {
                                this.score.music = wordsAndMusic;
                            }
                        }
                        break;
                    case 'Copyright':
                        this.score.copyright = c.firstChild!.innerText;
                        break;
                    case 'Tabber':
                        this.score.tab = c.firstChild!.innerText;
                        break;
                    case 'Instructions':
                        this.score.instructions = c.firstChild!.innerText;
                        break;
                    case 'Notices':
                        this.score.notices = c.firstChild!.innerText;
                        break;
                }
            }
        }
    }

    //
    // <MasterTrack>...</MasterTrack>
    //
    private parseMasterTrackNode(node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Automations':
                        this.parseAutomations(c, this._masterTrackAutomations);
                        break;
                    case 'Tracks':
                        this._tracksMapping = c.innerText.split(' ');
                        break;
                    case 'Anacrusis':
                        this._hasAnacrusis = true;
                        break;
                }
            }
        }
    }

    private parseAutomations(node: XmlNode, automations: Map<string, Automation[]>): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Automation':
                        this.parseAutomation(c, automations);
                        break;
                }
            }
        }
    }

    private parseAutomation(node: XmlNode, automations: Map<string, Automation[]>): void {
        let type: string | null = null;
        let isLinear: boolean = false;
        let barId: string | null = null;
        let ratioPosition: number = 0;
        let value: number = 0;
        let reference: number = 0;
        let text: string | null = null;
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Type':
                        type = c.innerText;
                        break;
                    case 'Linear':
                        isLinear = c.innerText.toLowerCase() === 'true';
                        break;
                    case 'Bar':
                        barId = c.innerText;
                        break;
                    case 'Position':
                        ratioPosition = parseFloat(c.innerText);
                        break;
                    case 'Value':
                        let parts: string[] = c.innerText.split(' ');
                        value = parseFloat(parts[0]);
                        reference = parseInt(parts[1]);
                        break;
                    case 'Text':
                        text = c.innerText;
                        break;
                }
            }
        }
        if (!type) {
            return;
        }
        let automation: Automation | null = null;
        switch (type) {
            case 'Tempo':
                automation = Automation.buildTempoAutomation(isLinear, ratioPosition, value, reference);
                break;
        }
        if (automation) {
            if (text) {
                automation.text = text;
            }

            if (barId) {
                if (!automations.has(barId)) {
                    automations.set(barId, []);
                }
                automations.get(barId)!.push(automation);
            }
        }
    }

    //
    // <Tracks>...</Tracks>
    //
    private parseTracksNode(node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Track':
                        this.parseTrack(c);
                        break;
                }
            }
        }
    }

    private parseTrack(node: XmlNode): void {
        let track: Track = new Track();
        track.ensureStaveCount(1);
        let staff: Staff = track.staves[0];
        staff.showStandardNotation = true;
        let trackId: string = node.getAttribute('id');
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Name':
                        track.name = c.innerText;
                        break;
                    case 'Color':
                        let parts: string[] = c.innerText.split(' ');
                        if (parts.length >= 3) {
                            let r: number = parseInt(parts[0]);
                            let g: number = parseInt(parts[1]);
                            let b: number = parseInt(parts[2]);
                            track.color = new Color(r, g, b, 0xff);
                        }
                        break;
                    case 'Instrument':
                        let instrumentName: string = c.getAttribute('ref');
                        if (instrumentName.endsWith('-gs') || instrumentName.endsWith('GrandStaff')) {
                            track.ensureStaveCount(2);
                            track.staves[1].showStandardNotation = true;
                        }
                        break;
                    case 'InstrumentSet':
                        this.parseInstrumentSet(track, c);
                        break;
                    case 'ShortName':
                        track.shortName = c.innerText;
                        break;
                    case 'Lyrics':
                        this.parseLyrics(trackId, c);
                        break;
                    case 'Properties':
                        this.parseTrackProperties(track, c);
                        break;
                    case 'GeneralMidi':
                    case 'MidiConnection':
                    case 'MIDISettings':
                        this.parseGeneralMidi(track, c);
                        break;
                    case 'Sounds':
                        this.parseSounds(track, c);
                        break;
                    case 'PlaybackState':
                        let state: string = c.innerText;
                        track.playbackInfo.isSolo = state === 'Solo';
                        track.playbackInfo.isMute = state === 'Mute';
                        break;
                    case 'PartSounding':
                        this.parsePartSounding(track, c);
                        break;
                    case 'Staves':
                        this.parseStaves(track, c);
                        break;
                    case 'Transpose':
                        this.parseTranspose(track, c);
                        break;
                }
            }
        }
        this._tracksById.set(trackId, track);
    }

    private parseInstrumentSet(track: Track, node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Type':
                        switch (c.innerText) {
                            case 'drumKit':
                                for (let staff of track.staves) {
                                    staff.isPercussion = true;
                                }
                                break;
                        }
                        if (c.innerText === 'drumKit') {
                            for (let staff of track.staves) {
                                staff.isPercussion = true;
                            }
                        }
                        break;
                }
            }
        }
    }

    private parseStaves(track: Track, node: XmlNode): void {
        let staffIndex: number = 0;
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Staff':
                        track.ensureStaveCount(staffIndex + 1);
                        let staff: Staff = track.staves[staffIndex];
                        this.parseStaff(staff, c);
                        staffIndex++;
                        break;
                }
            }
        }
    }

    private parseStaff(staff: Staff, node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Properties':
                        this.parseStaffProperties(staff, c);
                        break;
                }
            }
        }
    }

    private parseStaffProperties(staff: Staff, node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Property':
                        this.parseStaffProperty(staff, c);
                        break;
                }
            }
        }
    }

    private parseStaffProperty(staff: Staff, node: XmlNode): void {
        let propertyName: string = node.getAttribute('name');
        switch (propertyName) {
            case 'Tuning':
                let tuningParts: string[] = node.findChildElement('Pitches')!.innerText.split(' ');
                let tuning = new Array<number>(tuningParts.length);
                for (let i: number = 0; i < tuning.length; i++) {
                    tuning[tuning.length - 1 - i] = parseInt(tuningParts[i]);
                }
                staff.tuning = tuning;
                if (!staff.isPercussion) {
                    staff.showTablature = true;
                }
                break;
            case 'DiagramCollection':
            case 'ChordCollection':
                this.parseDiagramCollection_Staff_XmlNode(staff, node);
                break;
            case 'CapoFret':
                let capo: number = parseInt(node.findChildElement('Fret')!.innerText);
                staff.capo = capo;
                break;
        }
    }

    private parseLyrics(trackId: string, node: XmlNode): void {
        let tracks: Lyrics[] = [];
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Line':
                        tracks.push(this.parseLyricsLine(c));
                        break;
                }
            }
        }
        this._lyricsByTrack.set(trackId, tracks);
    }

    private parseLyricsLine(node: XmlNode): Lyrics {
        let lyrics: Lyrics = new Lyrics();
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Offset':
                        lyrics.startBar = parseInt(c.innerText);
                        break;
                    case 'Text':
                        lyrics.text = c.innerText;
                        break;
                }
            }
        }
        return lyrics;
    }

    private parseDiagramCollection_Track_XmlNode(track: Track, node: XmlNode): void {
        let items: XmlNode = node.findChildElement('Items')!;
        for (let c of items.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Item':
                        this.parseDiagramItem_Track_XmlNode(track, c);
                        break;
                }
            }
        }
    }

    private parseDiagramCollection_Staff_XmlNode(staff: Staff, node: XmlNode): void {
        let items: XmlNode = node.findChildElement('Items')!;
        for (let c of items.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Item':
                        this.parseDiagramItem_Staff_XmlNode(staff, c);
                        break;
                }
            }
        }
    }

    private parseDiagramItem_Track_XmlNode(track: Track, node: XmlNode): void {
        let chord: Chord = new Chord();
        let chordId: string = node.getAttribute('id');
        for (let staff of track.staves) {
            staff.addChord(chordId, chord);
        }
        this.parseDiagramItem_Chord_XmlNode(chord, node);
    }

    private parseDiagramItem_Staff_XmlNode(staff: Staff, node: XmlNode): void {
        let chord: Chord = new Chord();
        let chordId: string = node.getAttribute('id');
        staff.addChord(chordId, chord);
        this.parseDiagramItem_Chord_XmlNode(chord, node);
    }

    private parseDiagramItem_Chord_XmlNode(chord: Chord, node: XmlNode): void {
        chord.name = node.getAttribute('name');
        let diagram: XmlNode = node.findChildElement('Diagram')!;
        let stringCount: number = parseInt(diagram.getAttribute('stringCount'));
        let baseFret: number = parseInt(diagram.getAttribute('baseFret'));
        chord.firstFret = baseFret + 1;
        for (let i: number = 0; i < stringCount; i++) {
            chord.strings.push(-1);
        }
        for (let c of diagram.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Fret':
                        let guitarString: number = parseInt(c.getAttribute('string'));
                        chord.strings[stringCount - guitarString - 1] = baseFret + parseInt(c.getAttribute('fret'));
                        break;
                    case 'Fingering':
                        let existingFingers: Map<Fingers, boolean> = new Map<Fingers, boolean>();
                        for (let p of c.childNodes) {
                            if (p.nodeType === XmlNodeType.Element) {
                                switch (p.localName) {
                                    case 'Position':
                                        let finger: Fingers = Fingers.Unknown;
                                        let fret: number = baseFret + parseInt(p.getAttribute('fret'));
                                        switch (p.getAttribute('finger')) {
                                            case 'Index':
                                                finger = Fingers.IndexFinger;
                                                break;
                                            case 'Middle':
                                                finger = Fingers.MiddleFinger;
                                                break;
                                            case 'Rank':
                                                finger = Fingers.AnnularFinger;
                                                break;
                                            case 'Pinky':
                                                finger = Fingers.LittleFinger;
                                                break;
                                            case 'Thumb':
                                                finger = Fingers.Thumb;
                                                break;
                                            case 'None':
                                                break;
                                        }
                                        if (finger !== Fingers.Unknown) {
                                            if (existingFingers.has(finger)) {
                                                chord.barreFrets.push(fret);
                                            } else {
                                                existingFingers.set(finger, true);
                                            }
                                        }
                                        break;
                                }
                            }
                        }
                        break;
                    case 'Property':
                        switch (c.getAttribute('name')) {
                            case 'ShowName':
                                chord.showName = c.getAttribute('value') === 'true';
                                break;
                            case 'ShowDiagram':
                                chord.showDiagram = c.getAttribute('value') === 'true';
                                break;
                            case 'ShowFingering':
                                chord.showFingering = c.getAttribute('value') === 'true';
                                break;
                        }
                        break;
                }
            }
        }
    }

    private parseTrackProperties(track: Track, node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Property':
                        this.parseTrackProperty(track, c);
                        break;
                }
            }
        }
    }

    private parseTrackProperty(track: Track, node: XmlNode): void {
        let propertyName: string = node.getAttribute('name');
        switch (propertyName) {
            case 'Tuning':
                let tuningParts: string[] = node.findChildElement('Pitches')!.innerText.split(' ');
                let tuning = new Array<number>(tuningParts.length);
                for (let i: number = 0; i < tuning.length; i++) {
                    tuning[tuning.length - 1 - i] = parseInt(tuningParts[i]);
                }
                for (let staff of track.staves) {
                    staff.tuning = tuning;
                    staff.showStandardNotation = true;
                    staff.showTablature = true;
                }
                break;
            case 'DiagramCollection':
            case 'ChordCollection':
                this.parseDiagramCollection_Track_XmlNode(track, node);
                break;
            case 'CapoFret':
                let capo: number = parseInt(node.findChildElement('Fret')!.innerText);
                for (let staff of track.staves) {
                    staff.capo = capo;
                }
                break;
        }
    }

    private parseGeneralMidi(track: Track, node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Program':
                        track.playbackInfo.program = parseInt(c.innerText);
                        break;
                    case 'Port':
                        track.playbackInfo.port = parseInt(c.innerText);
                        break;
                    case 'PrimaryChannel':
                        track.playbackInfo.primaryChannel = parseInt(c.innerText);
                        break;
                    case 'SecondaryChannel':
                        track.playbackInfo.secondaryChannel = parseInt(c.innerText);
                        break;
                }
            }
        }
        let isPercussion: boolean = node.getAttribute('table') === 'Percussion';
        if (isPercussion) {
            for (let staff of track.staves) {
                staff.isPercussion = true;
            }
        }
    }

    private parseSounds(track: Track, node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Sound':
                        this.parseSound(track, c);
                        break;
                }
            }
        }
    }

    private parseSound(track: Track, node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'MIDI':
                        this.parseSoundMidi(track, c);
                        break;
                }
            }
        }
    }

    private parseSoundMidi(track: Track, node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Program':
                        track.playbackInfo.program = parseInt(c.innerText);
                        break;
                }
            }
        }
    }

    private parsePartSounding(track: Track, node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'TranspositionPitch':
                        for (let staff of track.staves) {
                            staff.displayTranspositionPitch = parseInt(c.innerText);
                        }
                        break;
                }
            }
        }
    }

    private parseTranspose(track: Track, node: XmlNode): void {
        let octave: number = 0;
        let chromatic: number = 0;
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Chromatic':
                        chromatic = parseInt(c.innerText);
                        break;
                    case 'Octave':
                        octave = parseInt(c.innerText);
                        break;
                }
            }
        }
        for (let staff of track.staves) {
            staff.displayTranspositionPitch = octave * 12 + chromatic;
        }
    }

    //
    // <MasterBars>...</MasterBars>
    //
    private parseMasterBarsNode(node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'MasterBar':
                        this.parseMasterBar(c);
                        break;
                }
            }
        }
    }

    private parseMasterBar(node: XmlNode): void {
        let masterBar: MasterBar = new MasterBar();
        if (this._masterBars.length === 0 && this._hasAnacrusis) {
            masterBar.isAnacrusis = true;
        }
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Time':
                        let timeParts: string[] = c.innerText.split('/');
                        masterBar.timeSignatureNumerator = parseInt(timeParts[0]);
                        masterBar.timeSignatureDenominator = parseInt(timeParts[1]);
                        break;
                    case 'DoubleBar':
                        masterBar.isDoubleBar = true;
                        break;
                    case 'Section':
                        masterBar.section = new Section();
                        masterBar.section.marker = c.findChildElement('Letter')!.innerText;
                        masterBar.section.text = c.findChildElement('Text')!.innerText;
                        break;
                    case 'Repeat':
                        if (c.getAttribute('start').toLowerCase() === 'true') {
                            masterBar.isRepeatStart = true;
                        }
                        if (c.getAttribute('end').toLowerCase() === 'true' && c.getAttribute('count')) {
                            masterBar.repeatCount = parseInt(c.getAttribute('count'));
                        }
                        break;
                    case 'AlternateEndings':
                        let alternateEndings: string[] = c.innerText.split(' ');
                        let i: number = 0;
                        for (let k: number = 0; k < alternateEndings.length; k++) {
                            i = i | (1 << (-1 + parseInt(alternateEndings[k])));
                        }
                        masterBar.alternateEndings = i;
                        break;
                    case 'Bars':
                        this._barsOfMasterBar.push(c.innerText.split(' '));
                        break;
                    case 'TripletFeel':
                        switch (c.innerText) {
                            case 'NoTripletFeel':
                                masterBar.tripletFeel = TripletFeel.NoTripletFeel;
                                break;
                            case 'Triplet8th':
                                masterBar.tripletFeel = TripletFeel.Triplet8th;
                                break;
                            case 'Triplet16th':
                                masterBar.tripletFeel = TripletFeel.Triplet16th;
                                break;
                            case 'Dotted8th':
                                masterBar.tripletFeel = TripletFeel.Dotted8th;
                                break;
                            case 'Dotted16th':
                                masterBar.tripletFeel = TripletFeel.Dotted16th;
                                break;
                            case 'Scottish8th':
                                masterBar.tripletFeel = TripletFeel.Scottish8th;
                                break;
                            case 'Scottish16th':
                                masterBar.tripletFeel = TripletFeel.Scottish16th;
                                break;
                        }
                        break;
                    case 'Key':
                        masterBar.keySignature = parseInt(
                            c.findChildElement('AccidentalCount')!.innerText
                        ) as KeySignature;
                        let mode: XmlNode = c.findChildElement('Mode')!;
                        if (mode) {
                            switch (mode.innerText.toLowerCase()) {
                                case 'major':
                                    masterBar.keySignatureType = KeySignatureType.Major;
                                    break;
                                case 'minor':
                                    masterBar.keySignatureType = KeySignatureType.Minor;
                                    break;
                            }
                        }
                        break;
                    case 'Fermatas':
                        this.parseFermatas(masterBar, c);
                        break;
                }
            }
        }
        this._masterBars.push(masterBar);
    }

    private parseFermatas(masterBar: MasterBar, node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Fermata':
                        this.parseFermata(masterBar, c);
                        break;
                }
            }
        }
    }

    private parseFermata(masterBar: MasterBar, node: XmlNode): void {
        let offset: number = 0;
        let fermata: Fermata = new Fermata();
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Type':
                        switch (c.innerText) {
                            case 'Short':
                                fermata.type = FermataType.Short;
                                break;
                            case 'Medium':
                                fermata.type = FermataType.Medium;
                                break;
                            case 'Long':
                                fermata.type = FermataType.Long;
                                break;
                        }
                        break;
                    case 'Length':
                        fermata.length = parseFloat(c.innerText);
                        break;
                    case 'Offset':
                        let parts: string[] = c.innerText.split('/');
                        if (parts.length === 2) {
                            let numerator: number = parseInt(parts[0]);
                            let denominator: number = parseInt(parts[1]);
                            offset = ((numerator / denominator) * MidiUtils.QuarterTime) | 0;
                        }
                        break;
                }
            }
        }
        masterBar.addFermata(offset, fermata);
    }

    //
    // <Bars>...</Bars>
    //
    private parseBars(node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Bar':
                        this.parseBar(c);
                        break;
                }
            }
        }
    }

    private parseBar(node: XmlNode): void {
        let bar: Bar = new Bar();
        let barId: string = node.getAttribute('id');
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Voices':
                        this._voicesOfBar.set(barId, c.innerText.split(' '));
                        break;
                    case 'Clef':
                        switch (c.innerText) {
                            case 'Neutral':
                                bar.clef = Clef.Neutral;
                                break;
                            case 'G2':
                                bar.clef = Clef.G2;
                                break;
                            case 'F4':
                                bar.clef = Clef.F4;
                                break;
                            case 'C4':
                                bar.clef = Clef.C4;
                                break;
                            case 'C3':
                                bar.clef = Clef.C3;
                                break;
                        }
                        break;
                    case 'Ottavia':
                        switch (c.innerText) {
                            case '8va':
                                bar.clefOttava = Ottavia._8va;
                                break;
                            case '15ma':
                                bar.clefOttava = Ottavia._15ma;
                                break;
                            case '8vb':
                                bar.clefOttava = Ottavia._8vb;
                                break;
                            case '15mb':
                                bar.clefOttava = Ottavia._15mb;
                                break;
                        }
                        break;
                    case 'SimileMark':
                        switch (c.innerText) {
                            case 'Simple':
                                bar.simileMark = SimileMark.Simple;
                                break;
                            case 'FirstOfDouble':
                                bar.simileMark = SimileMark.FirstOfDouble;
                                break;
                            case 'SecondOfDouble':
                                bar.simileMark = SimileMark.SecondOfDouble;
                                break;
                        }
                        break;
                }
            }
        }
        this._barsById.set(barId, bar);
    }

    //
    // <Voices>...</Voices>
    //
    private parseVoices(node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Voice':
                        this.parseVoice(c);
                        break;
                }
            }
        }
    }

    private parseVoice(node: XmlNode): void {
        let voice: Voice = new Voice();
        let voiceId: string = node.getAttribute('id');
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Beats':
                        this._beatsOfVoice.set(voiceId, c.innerText.split(' '));
                        break;
                }
            }
        }
        this._voiceById.set(voiceId, voice);
    }

    //
    // <Beats>...</Beats>
    //
    private parseBeats(node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Beat':
                        this.parseBeat(c);
                        break;
                }
            }
        }
    }

    private parseBeat(node: XmlNode): void {
        let beat: Beat = new Beat();
        let beatId: string = node.getAttribute('id');
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Notes':
                        this._notesOfBeat.set(beatId, c.innerText.split(' '));
                        break;
                    case 'Rhythm':
                        this._rhythmOfBeat.set(beatId, c.getAttribute('ref'));
                        break;
                    case 'Fadding':
                        if (c.innerText === 'FadeIn') {
                            beat.fadeIn = true;
                        }
                        break;
                    case 'Tremolo':
                        switch (c.innerText) {
                            case '1/2':
                                beat.tremoloSpeed = Duration.Eighth;
                                break;
                            case '1/4':
                                beat.tremoloSpeed = Duration.Sixteenth;
                                break;
                            case '1/8':
                                beat.tremoloSpeed = Duration.ThirtySecond;
                                break;
                        }
                        break;
                    case 'Chord':
                        beat.chordId = c.innerText;
                        break;
                    case 'Hairpin':
                        switch (c.innerText) {
                            case 'Crescendo':
                                beat.crescendo = CrescendoType.Crescendo;
                                break;
                            case 'Decrescendo':
                                beat.crescendo = CrescendoType.Decrescendo;
                                break;
                        }
                        break;
                    case 'Arpeggio':
                        if (c.innerText === 'Up') {
                            beat.brushType = BrushType.ArpeggioUp;
                        } else {
                            beat.brushType = BrushType.ArpeggioDown;
                        }
                        break;
                    case 'Properties':
                        this.parseBeatProperties(c, beat);
                        break;
                    case 'XProperties':
                        this.parseBeatXProperties(c, beat);
                        break;
                    case 'FreeText':
                        beat.text = c.innerText;
                        break;
                    case 'Dynamic':
                        switch (c.innerText) {
                            case 'PPP':
                                beat.dynamics = DynamicValue.PPP;
                                break;
                            case 'PP':
                                beat.dynamics = DynamicValue.PP;
                                break;
                            case 'P':
                                beat.dynamics = DynamicValue.P;
                                break;
                            case 'MP':
                                beat.dynamics = DynamicValue.MP;
                                break;
                            case 'MF':
                                beat.dynamics = DynamicValue.MF;
                                break;
                            case 'F':
                                beat.dynamics = DynamicValue.F;
                                break;
                            case 'FF':
                                beat.dynamics = DynamicValue.FF;
                                break;
                            case 'FFF':
                                beat.dynamics = DynamicValue.FFF;
                                break;
                        }
                        break;
                    case 'GraceNotes':
                        switch (c.innerText) {
                            case 'OnBeat':
                                beat.graceType = GraceType.OnBeat;
                                break;
                            case 'BeforeBeat':
                                beat.graceType = GraceType.BeforeBeat;
                                break;
                        }
                        break;
                    case 'Legato':
                        if (c.getAttribute('origin') === 'true') {
                            beat.isLegatoOrigin = true;
                        }
                        break;
                    case 'Whammy':
                        let whammyOrigin: BendPoint = new BendPoint(0, 0);
                        whammyOrigin.value = this.toBendValue(parseFloat(c.getAttribute('originValue')));
                        whammyOrigin.offset = this.toBendOffset(parseFloat(c.getAttribute('originOffset')));
                        beat.addWhammyBarPoint(whammyOrigin);
                        let whammyMiddle1: BendPoint = new BendPoint(0, 0);
                        whammyMiddle1.value = this.toBendValue(parseFloat(c.getAttribute('middleValue')));
                        whammyMiddle1.offset = this.toBendOffset(parseFloat(c.getAttribute('middleOffset1')));
                        beat.addWhammyBarPoint(whammyMiddle1);
                        let whammyMiddle2: BendPoint = new BendPoint(0, 0);
                        whammyMiddle2.value = this.toBendValue(parseFloat(c.getAttribute('middleValue')));
                        whammyMiddle2.offset = this.toBendOffset(parseFloat(c.getAttribute('middleOffset2')));
                        beat.addWhammyBarPoint(whammyMiddle2);
                        let whammyDestination: BendPoint = new BendPoint(0, 0);
                        whammyDestination.value = this.toBendValue(parseFloat(c.getAttribute('destinationValue')));
                        whammyDestination.offset = this.toBendOffset(parseFloat(c.getAttribute('destinationOffset')));
                        beat.addWhammyBarPoint(whammyDestination);
                        break;
                    case 'Ottavia':
                        switch (c.innerText) {
                            case '8va':
                                beat.ottava = Ottavia._8va;
                                break;
                            case '8vb':
                                beat.ottava = Ottavia._8vb;
                                break;
                            case '15ma':
                                beat.ottava = Ottavia._15ma;
                                break;
                            case '15mb':
                                beat.ottava = Ottavia._15mb;
                                break;
                        }
                        break;
                }
            }
        }
        this._beatById.set(beatId, beat);
    }

    private parseBeatXProperties(node: XmlNode, beat: Beat): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'XProperty':
                        let id: string = c.getAttribute('id');
                        let val: number = 0;
                        switch (id) {
                            case '1124204545':
                                val = parseInt(c.findChildElement('Int')!.innerText);
                                beat.invertBeamDirection = val === 1;
                                break;
                            case '687935489':
                                val = parseInt(c.findChildElement('Int')!.innerText);
                                beat.brushDuration = val;
                                break;
                        }
                        break;
                }
            }
        }
    }

    private parseBeatProperties(node: XmlNode, beat: Beat): void {
        let isWhammy: boolean = false;
        let whammyOrigin: BendPoint | null = null;
        let whammyMiddleValue: number | null = null;
        let whammyMiddleOffset1: number | null = null;
        let whammyMiddleOffset2: number | null = null;
        let whammyDestination: BendPoint | null = null;
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Property':
                        let name: string = c.getAttribute('name');
                        switch (name) {
                            case 'Brush':
                                if (c.findChildElement('Direction')!.innerText === 'Up') {
                                    beat.brushType = BrushType.BrushUp;
                                } else {
                                    beat.brushType = BrushType.BrushDown;
                                }
                                break;
                            case 'PickStroke':
                                if (c.findChildElement('Direction')!.innerText === 'Up') {
                                    beat.pickStroke = PickStroke.Up;
                                } else {
                                    beat.pickStroke = PickStroke.Down;
                                }
                                break;
                            case 'Slapped':
                                if (c.findChildElement('Enable')) {
                                    beat.slap = true;
                                }
                                break;
                            case 'Popped':
                                if (c.findChildElement('Enable')) {
                                    beat.pop = true;
                                }
                                break;
                            case 'VibratoWTremBar':
                                switch (c.findChildElement('Strength')!.innerText) {
                                    case 'Wide':
                                        beat.vibrato = VibratoType.Wide;
                                        break;
                                    case 'Slight':
                                        beat.vibrato = VibratoType.Slight;
                                        break;
                                }
                                break;
                            case 'WhammyBar':
                                isWhammy = true;
                                break;
                            case 'WhammyBarExtend':
                                // not clear what this is used for
                                break;
                            case 'WhammyBarOriginValue':
                                if (!whammyOrigin) {
                                    whammyOrigin = new BendPoint(0, 0);
                                }
                                whammyOrigin.value = this.toBendValue(
                                    parseFloat(c.findChildElement('Float')!.innerText)
                                );
                                break;
                            case 'WhammyBarOriginOffset':
                                if (!whammyOrigin) {
                                    whammyOrigin = new BendPoint(0, 0);
                                }
                                whammyOrigin.offset = this.toBendOffset(
                                    parseFloat(c.findChildElement('Float')!.innerText)
                                );
                                break;
                            case 'WhammyBarMiddleValue':
                                whammyMiddleValue = this.toBendValue(
                                    parseFloat(c.findChildElement('Float')!.innerText)
                                );
                                break;
                            case 'WhammyBarMiddleOffset1':
                                whammyMiddleOffset1 = this.toBendOffset(
                                    parseFloat(c.findChildElement('Float')!.innerText)
                                );
                                break;
                            case 'WhammyBarMiddleOffset2':
                                whammyMiddleOffset2 = this.toBendOffset(
                                    parseFloat(c.findChildElement('Float')!.innerText)
                                );
                                break;
                            case 'WhammyBarDestinationValue':
                                if (!whammyDestination) {
                                    whammyDestination = new BendPoint(BendPoint.MaxPosition, 0);
                                }
                                whammyDestination.value = this.toBendValue(
                                    parseFloat(c.findChildElement('Float')!.innerText)
                                );
                                break;
                            case 'WhammyBarDestinationOffset':
                                if (!whammyDestination) {
                                    whammyDestination = new BendPoint(0, 0);
                                }
                                whammyDestination.offset = this.toBendOffset(
                                    parseFloat(c.findChildElement('Float')!.innerText)
                                );
                                break;
                        }
                        break;
                }
            }
        }
        if (isWhammy) {
            if (!whammyOrigin) {
                whammyOrigin = new BendPoint(0, 0);
            }
            if (!whammyDestination) {
                whammyDestination = new BendPoint(BendPoint.MaxPosition, 0);
            }
            beat.addWhammyBarPoint(whammyOrigin);
            if (whammyMiddleOffset1 && whammyMiddleValue) {
                beat.addWhammyBarPoint(new BendPoint(whammyMiddleOffset1, whammyMiddleValue));
            }
            if (whammyMiddleOffset2 && whammyMiddleValue) {
                beat.addWhammyBarPoint(new BendPoint(whammyMiddleOffset2, whammyMiddleValue));
            }
            if (!whammyMiddleOffset1 && !whammyMiddleOffset2 && whammyMiddleValue) {
                beat.addWhammyBarPoint(new BendPoint((BendPoint.MaxPosition / 2) | 0, whammyMiddleValue));
            }
            beat.addWhammyBarPoint(whammyDestination);
        }
    }

    //
    // <Notes>...</Notes>
    //
    private parseNotes(node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Note':
                        this.parseNote(c);
                        break;
                }
            }
        }
    }

    private parseNote(node: XmlNode): void {
        let note: Note = new Note();
        let noteId: string = node.getAttribute('id');
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Properties':
                        this.parseNoteProperties(c, note, noteId);
                        break;
                    case 'AntiAccent':
                        if (c.innerText.toLowerCase() === 'normal') {
                            note.isGhost = true;
                        }
                        break;
                    case 'LetRing':
                        note.isLetRing = true;
                        break;
                    case 'Trill':
                        note.trillValue = parseInt(c.innerText);
                        note.trillSpeed = Duration.Sixteenth;
                        break;
                    case 'Accent':
                        let accentFlags: number = parseInt(c.innerText);
                        if ((accentFlags & 0x01) !== 0) {
                            note.isStaccato = true;
                        }
                        if ((accentFlags & 0x04) !== 0) {
                            note.accentuated = AccentuationType.Heavy;
                        }
                        if ((accentFlags & 0x08) !== 0) {
                            note.accentuated = AccentuationType.Normal;
                        }
                        break;
                    case 'Tie':
                        if (c.getAttribute('destination').toLowerCase() === 'true') {
                            note.isTieDestination = true;
                        }
                        break;
                    case 'Vibrato':
                        switch (c.innerText) {
                            case 'Slight':
                                note.vibrato = VibratoType.Slight;
                                break;
                            case 'Wide':
                                note.vibrato = VibratoType.Wide;
                                break;
                        }
                        break;
                    case 'LeftFingering':
                        note.isFingering = true;
                        switch (c.innerText) {
                            case 'P':
                                note.leftHandFinger = Fingers.Thumb;
                                break;
                            case 'I':
                                note.leftHandFinger = Fingers.IndexFinger;
                                break;
                            case 'M':
                                note.leftHandFinger = Fingers.MiddleFinger;
                                break;
                            case 'A':
                                note.leftHandFinger = Fingers.AnnularFinger;
                                break;
                            case 'C':
                                note.leftHandFinger = Fingers.LittleFinger;
                                break;
                        }
                        break;
                    case 'RightFingering':
                        note.isFingering = true;
                        switch (c.innerText) {
                            case 'P':
                                note.rightHandFinger = Fingers.Thumb;
                                break;
                            case 'I':
                                note.rightHandFinger = Fingers.IndexFinger;
                                break;
                            case 'M':
                                note.rightHandFinger = Fingers.MiddleFinger;
                                break;
                            case 'A':
                                note.rightHandFinger = Fingers.AnnularFinger;
                                break;
                            case 'C':
                                note.rightHandFinger = Fingers.LittleFinger;
                                break;
                        }
                        break;
                }
            }
        }
        this._noteById.set(noteId, note);
    }

    private parseNoteProperties(node: XmlNode, note: Note, noteId: string): void {
        let isBended: boolean = false;
        let bendOrigin: BendPoint | null = null;
        let bendMiddleValue: number | null = null;
        let bendMiddleOffset1: number | null = null;
        let bendMiddleOffset2: number | null = null;
        let bendDestination: BendPoint | null = null;
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Property':
                        let name: string = c.getAttribute('name');
                        switch (name) {
                            case 'String':
                                note.string = parseInt(c.findChildElement('String')!.innerText) + 1;
                                break;
                            case 'Fret':
                                note.fret = parseInt(c.findChildElement('Fret')!.innerText);
                                break;
                            case 'Element':
                                note.element = parseInt(c.findChildElement('Element')!.innerText);
                                break;
                            case 'Variation':
                                note.variation = parseInt(c.findChildElement('Variation')!.innerText);
                                break;
                            case 'Tapped':
                                this._tappedNotes.set(noteId, true);
                                break;
                            case 'HarmonicType':
                                let htype: XmlNode = c.findChildElement('HType')!;
                                if (htype) {
                                    switch (htype.innerText) {
                                        case 'NoHarmonic':
                                            note.harmonicType = HarmonicType.None;
                                            break;
                                        case 'Natural':
                                            note.harmonicType = HarmonicType.Natural;
                                            break;
                                        case 'Artificial':
                                            note.harmonicType = HarmonicType.Artificial;
                                            break;
                                        case 'Pinch':
                                            note.harmonicType = HarmonicType.Pinch;
                                            break;
                                        case 'Tap':
                                            note.harmonicType = HarmonicType.Tap;
                                            break;
                                        case 'Semi':
                                            note.harmonicType = HarmonicType.Semi;
                                            break;
                                        case 'Feedback':
                                            note.harmonicType = HarmonicType.Feedback;
                                            break;
                                    }
                                }
                                break;
                            case 'HarmonicFret':
                                let hfret: XmlNode = c.findChildElement('HFret')!;
                                if (hfret) {
                                    note.harmonicValue = parseFloat(hfret.innerText);
                                }
                                break;
                            case 'Muted':
                                if (c.findChildElement('Enable')) {
                                    note.isDead = true;
                                }
                                break;
                            case 'PalmMuted':
                                if (c.findChildElement('Enable')) {
                                    note.isPalmMute = true;
                                }
                                break;
                            case 'Octave':
                                note.octave = parseInt(c.findChildElement('Number')!.innerText);
                                break;
                            case 'Tone':
                                note.tone = parseInt(c.findChildElement('Step')!.innerText);
                                break;
                            case 'Bended':
                                isBended = true;
                                break;
                            case 'BendOriginValue':
                                if (!bendOrigin) {
                                    bendOrigin = new BendPoint(0, 0);
                                }
                                bendOrigin.value = this.toBendValue(parseFloat(c.findChildElement('Float')!.innerText));
                                break;
                            case 'BendOriginOffset':
                                if (!bendOrigin) {
                                    bendOrigin = new BendPoint(0, 0);
                                }
                                bendOrigin.offset = this.toBendOffset(
                                    parseFloat(c.findChildElement('Float')!.innerText)
                                );
                                break;
                            case 'BendMiddleValue':
                                bendMiddleValue = this.toBendValue(parseFloat(c.findChildElement('Float')!.innerText));
                                break;
                            case 'BendMiddleOffset1':
                                bendMiddleOffset1 = this.toBendOffset(
                                    parseFloat(c.findChildElement('Float')!.innerText)
                                );
                                break;
                            case 'BendMiddleOffset2':
                                bendMiddleOffset2 = this.toBendOffset(
                                    parseFloat(c.findChildElement('Float')!.innerText)
                                );
                                break;
                            case 'BendDestinationValue':
                                if (!bendDestination) {
                                    bendDestination = new BendPoint(BendPoint.MaxPosition, 0);
                                }
                                bendDestination.value = this.toBendValue(
                                    parseFloat(c.findChildElement('Float')!.innerText)
                                );
                                break;
                            case 'BendDestinationOffset':
                                if (!bendDestination) {
                                    bendDestination = new BendPoint(0, 0);
                                }
                                bendDestination.offset = this.toBendOffset(
                                    parseFloat(c.findChildElement('Float')!.innerText)
                                );
                                break;
                            case 'HopoOrigin':
                                if (c.findChildElement('Enable')) {
                                    note.isHammerPullOrigin = true;
                                }
                                break;
                            case 'HopoDestination':
                                // NOTE: gets automatically calculated
                                // if (FindChildElement(node, "Enable"))
                                //     note.isHammerPullDestination = true;
                                break;
                            case 'Slide':
                                let slideFlags: number = parseInt(c.findChildElement('Flags')!.innerText);
                                if ((slideFlags & 1) !== 0) {
                                    note.slideOutType = SlideOutType.Shift;
                                } else if ((slideFlags & 2) !== 0) {
                                    note.slideOutType = SlideOutType.Legato;
                                } else if ((slideFlags & 4) !== 0) {
                                    note.slideOutType = SlideOutType.OutDown;
                                } else if ((slideFlags & 8) !== 0) {
                                    note.slideOutType = SlideOutType.OutUp;
                                }
                                if ((slideFlags & 16) !== 0) {
                                    note.slideInType = SlideInType.IntoFromBelow;
                                } else if ((slideFlags & 32) !== 0) {
                                    note.slideInType = SlideInType.IntoFromAbove;
                                }
                                if ((slideFlags & 64) !== 0) {
                                    note.slideOutType = SlideOutType.PickSlideDown;
                                } else if ((slideFlags & 128) !== 0) {
                                    note.slideOutType = SlideOutType.PickSlideUp;
                                }
                                break;
                        }
                        break;
                }
            }
        }
        if (isBended) {
            if (!bendOrigin) {
                bendOrigin = new BendPoint(0, 0);
            }
            if (!bendDestination) {
                bendDestination = new BendPoint(BendPoint.MaxPosition, 0);
            }
            note.addBendPoint(bendOrigin);
            if (bendMiddleOffset1 && bendMiddleValue) {
                note.addBendPoint(new BendPoint(bendMiddleOffset1, bendMiddleValue));
            }
            if (bendMiddleOffset2 && bendMiddleValue) {
                note.addBendPoint(new BendPoint(bendMiddleOffset2, bendMiddleValue));
            }
            if (!bendMiddleOffset1 && !bendMiddleOffset2 && bendMiddleValue) {
                note.addBendPoint(new BendPoint((BendPoint.MaxPosition / 2) | 0, bendMiddleValue));
            }
            note.addBendPoint(bendDestination);
        }
    }

    private toBendValue(gpxValue: number): number {
        return (gpxValue * GpifParser.BendPointValueFactor) | 0;
    }

    private toBendOffset(gpxOffset: number): number {
        return (gpxOffset * GpifParser.BendPointPositionFactor) | 0;
    }

    private parseRhythms(node: XmlNode): void {
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'Rhythm':
                        this.parseRhythm(c);
                        break;
                }
            }
        }
    }

    private parseRhythm(node: XmlNode): void {
        let rhythm: GpifRhythm = new GpifRhythm();
        let rhythmId: string = node.getAttribute('id');
        for (let c of node.childNodes) {
            if (c.nodeType === XmlNodeType.Element) {
                switch (c.localName) {
                    case 'NoteValue':
                        switch (c.innerText) {
                            case 'Long':
                                rhythm.value = Duration.QuadrupleWhole;
                                break;
                            case 'DoubleWhole':
                                rhythm.value = Duration.DoubleWhole;
                                break;
                            case 'Whole':
                                rhythm.value = Duration.Whole;
                                break;
                            case 'Half':
                                rhythm.value = Duration.Half;
                                break;
                            case 'Quarter':
                                rhythm.value = Duration.Quarter;
                                break;
                            case 'Eighth':
                                rhythm.value = Duration.Eighth;
                                break;
                            case '16th':
                                rhythm.value = Duration.Sixteenth;
                                break;
                            case '32nd':
                                rhythm.value = Duration.ThirtySecond;
                                break;
                            case '64th':
                                rhythm.value = Duration.SixtyFourth;
                                break;
                            case '128th':
                                rhythm.value = Duration.OneHundredTwentyEighth;
                                break;
                            case '256th':
                                rhythm.value = Duration.TwoHundredFiftySixth;
                                break;
                        }
                        break;
                    case 'PrimaryTuplet':
                        rhythm.tupletNumerator = parseInt(c.getAttribute('num'));
                        rhythm.tupletDenominator = parseInt(c.getAttribute('den'));
                        break;
                    case 'AugmentationDot':
                        rhythm.dots = parseInt(c.getAttribute('count'));
                        break;
                }
            }
        }
        this._rhythmById.set(rhythmId, rhythm);
    }

    private buildModel(): void {
        // build score
        for (let i: number = 0, j: number = this._masterBars.length; i < j; i++) {
            let masterBar: MasterBar = this._masterBars[i];
            this.score.addMasterBar(masterBar);
        }
        // add tracks to score
        for (let trackId of this._tracksMapping) {
            if (!trackId) {
                continue;
            }
            let track: Track = this._tracksById.get(trackId)!;
            this.score.addTrack(track);
        }
        // process all masterbars
        for (let barIds of this._barsOfMasterBar) {
            // add all bars of masterbar vertically to all tracks
            let staffIndex: number = 0;
            for (
                let barIndex: number = 0, trackIndex: number = 0;
                barIndex < barIds.length && trackIndex < this.score.tracks.length;
                barIndex++
            ) {
                let barId: string = barIds[barIndex];
                if (barId !== GpifParser.InvalidId) {
                    let bar: Bar = this._barsById.get(barId)!;
                    let track: Track = this.score.tracks[trackIndex];
                    let staff: Staff = track.staves[staffIndex];
                    staff.addBar(bar);
                    if (this._voicesOfBar.has(barId)) {
                        // add voices to bars
                        for (let voiceId of this._voicesOfBar.get(barId)!) {
                            if (voiceId !== GpifParser.InvalidId) {
                                let voice: Voice = this._voiceById.get(voiceId)!;
                                bar.addVoice(voice);
                                if (this._beatsOfVoice.has(voiceId)) {
                                    // add beats to voices
                                    for (let beatId of this._beatsOfVoice.get(voiceId)!) {
                                        if (beatId !== GpifParser.InvalidId) {
                                            // important! we clone the beat because beats get reused
                                            // in gp6, our model needs to have unique beats.
                                            let beat: Beat = this._beatById.get(beatId)!.clone();
                                            voice.addBeat(beat);
                                            let rhythmId: string = this._rhythmOfBeat.get(beatId)!;
                                            let rhythm: GpifRhythm = this._rhythmById.get(rhythmId)!;
                                            // set beat duration
                                            beat.duration = rhythm.value;
                                            beat.dots = rhythm.dots;
                                            beat.tupletNumerator = rhythm.tupletNumerator;
                                            beat.tupletDenominator = rhythm.tupletDenominator;
                                            // add notes to beat
                                            if (this._notesOfBeat.has(beatId)) {
                                                for (let noteId of this._notesOfBeat.get(beatId)!) {
                                                    if (noteId !== GpifParser.InvalidId) {
                                                        beat.addNote(this._noteById.get(noteId)!.clone());
                                                        if (this._tappedNotes.has(noteId)) {
                                                            beat.tap = true;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                // invalid voice -> empty voice
                                let voice: Voice = new Voice();
                                bar.addVoice(voice);
                                let beat: Beat = new Beat();
                                beat.isEmpty = true;
                                beat.duration = Duration.Quarter;
                                voice.addBeat(beat);
                            }
                        }
                    }
                    // stave is full? -> next track
                    if (staffIndex === track.staves.length - 1) {
                        trackIndex++;
                        staffIndex = 0;
                    } else {
                        staffIndex++;
                    }
                } else {
                    // no bar for track
                    trackIndex++;
                }
            }
        }
        // build masterbar automations
        for (let kvp of this._masterTrackAutomations) {
            let barIndex: string = kvp[0];
            let automations: Automation[] = kvp[1];
            let masterBar: MasterBar = this.score.masterBars[parseInt(barIndex)];
            for (let i: number = 0, j: number = automations.length; i < j; i++) {
                let automation: Automation = automations[i];
                if (automation.type === AutomationType.Tempo) {
                    if (barIndex === '0') {
                        this.score.tempo = automation.value | 0;
                        if (automation.text) {
                            this.score.tempoLabel = automation.text;
                        }
                    }
                    masterBar.tempoAutomation = automation;
                }
            }
        }
    }
}
