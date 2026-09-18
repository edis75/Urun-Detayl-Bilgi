import { apiClient } from './apiClient';
import type { AttributeDefinition, AttributeRequest } from '../types/catalog';
export const attributesApi = {
 list: async () => (await apiClient.get<AttributeDefinition[]>('/api/attributes')).data,
 save: async (id: number | null, data: AttributeRequest) => (id ? await apiClient.put<AttributeDefinition>('/api/attributes/'+id,data) : await apiClient.post<AttributeDefinition>('/api/attributes',data)).data,
 remove: async (id: number) => { await apiClient.delete('/api/attributes/'+id); },
};
