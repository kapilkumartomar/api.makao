import { IDBQuery } from '@util/helper';
import Category from './category.model';

export async function findCategories(query: IDBQuery) {
  return Category.find(query);
}
