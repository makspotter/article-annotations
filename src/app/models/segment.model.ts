import { Id } from './id.model';
import { SegmentType } from './segment-type.model';

export interface Segment {
  type: SegmentType;
  text: string;
  id?: Id;
  color?: string;
  note?: string;
}
