import { Id } from './id.model';

export interface AnnotationBase {
  id: Id;
  color: string;
  note: string;
}

export interface Annotation extends AnnotationBase {
  start: number;
  end: number;
}

export type NewAnnotation = Omit<Annotation, 'id'>;
