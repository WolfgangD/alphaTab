import { Bar } from '@src/model/Bar';
import { BarRendererBase } from '@src/rendering/BarRendererBase';
import { BarRendererFactory } from '@src/rendering/BarRendererFactory';
import { SlashBarRenderer } from '@src/rendering/SlashBarRenderer';
import { ScoreRenderer } from '@src/rendering/ScoreRenderer';

/**
 * This Factory procudes SlashBarRenderer instances
 */
export class SlashBarRendererFactory extends BarRendererFactory {
    public get staffId(): string {
        return SlashBarRenderer.StaffId;
    }

    public create(renderer: ScoreRenderer, bar: Bar): BarRendererBase {
        return new SlashBarRenderer(renderer, bar);
    }

    public constructor() {
        super();
    }
}
