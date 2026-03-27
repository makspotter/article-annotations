import { Id } from './id.model';
import { Annotation } from './annotation.model';

export interface Article {
  id: Id;
  title: string;
  text: string;
  annotations: Annotation[];
  updatedAt: number;
  createdAt: number;
}
