import Category from './category.model';

export async function findCategories(query: { status?: boolean }) {
  return Category.find(query);
}
