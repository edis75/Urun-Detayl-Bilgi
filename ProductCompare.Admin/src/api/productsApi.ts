import { apiClient } from './apiClient';
import type { Product, ProductDetail, ProductImage, ProductRequest, ProductFilters, Page } from '../types/catalog';
export const productsApi = {
 list: async (params: ProductFilters = {}) => (await apiClient.get<Page<Product>>('/api/products',{params})).data,
 get: async (id: number) => (await apiClient.get<ProductDetail>('/api/products/'+id)).data,
 save: async (id: number | null, data: ProductRequest) => (id ? await apiClient.put<ProductDetail>('/api/products/'+id,data) : await apiClient.post<ProductDetail>('/api/products',data)).data,
 remove: async (id: number) => { await apiClient.delete('/api/products/'+id); },
 uploadImages: async (id:number,files:File[],primaryIndex?:number) => {
  const form=new FormData();files.forEach(file=>form.append('Files',file));
  if(primaryIndex!==undefined)form.append('PrimaryImageIndex',String(primaryIndex));
  return (await apiClient.post<ProductImage[]>(`/api/products/${id}/images`,form,{timeout:180000})).data;
 },
 setPrimaryImage: async (id:number,imageId:number) => (await apiClient.put<ProductImage[]>(`/api/products/${id}/images/${imageId}/primary`)).data,
 deleteImage: async (id:number,imageId:number) => (await apiClient.delete<ProductImage[]>(`/api/products/${id}/images/${imageId}`)).data,
};
