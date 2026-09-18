import { apiClient } from './apiClient';
import type { Product, ProductRequest, ProductFilters, Page } from '../types/catalog';
export const productsApi = {
 list: async (params: ProductFilters = {}) => (await apiClient.get<Page<Product>>('/api/products',{params})).data,
 get: async (id: number) => (await apiClient.get<Product>('/api/products/'+id)).data,
 save: async (id: number | null, data: ProductRequest) => (id ? await apiClient.put<Product>('/api/products/'+id,data) : await apiClient.post<Product>('/api/products',data)).data,
 remove: async (id: number) => { await apiClient.delete('/api/products/'+id); },
};
