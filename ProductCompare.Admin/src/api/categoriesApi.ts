import { apiClient } from './apiClient';
import type { Category, CategoryRequest, CategoryAttribute, CategoryAttributeRequest } from '../types/catalog';
export const categoriesApi = {
 list: async () => (await apiClient.get<Category[]>('/api/categories')).data,
 get: async (id: number) => (await apiClient.get<Category>('/api/categories/'+id)).data,
 save: async (id: number | null, data: CategoryRequest) => (id ? await apiClient.put<Category>('/api/categories/'+id,data) : await apiClient.post<Category>('/api/categories',data)).data,
 remove: async (id: number) => { await apiClient.delete('/api/categories/'+id); },
 attributes: async (id: number) => (await apiClient.get<CategoryAttribute[]>('/api/categories/'+id+'/attributes')).data,
 assign: async (id: number, data: CategoryAttributeRequest) => (await apiClient.post<CategoryAttribute>('/api/categories/'+id+'/attributes',data)).data,
 unassign: async (id: number, attributeId: number) => { await apiClient.delete('/api/categories/'+id+'/attributes/'+attributeId); },
};
