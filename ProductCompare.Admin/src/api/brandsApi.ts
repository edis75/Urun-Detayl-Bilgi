import { apiClient } from './apiClient';
import type { Brand, BrandRequest } from '../types/catalog';
export const brandsApi = {
 list: async () => (await apiClient.get<Brand[]>('/api/brands')).data,
 save: async (id: number | null, data: BrandRequest) => (id ? await apiClient.put<Brand>('/api/brands/'+id,data) : await apiClient.post<Brand>('/api/brands',data)).data,
 remove: async (id: number) => { await apiClient.delete('/api/brands/'+id); },
};
