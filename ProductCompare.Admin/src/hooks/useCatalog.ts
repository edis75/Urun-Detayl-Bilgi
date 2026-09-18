import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../api/categoriesApi';
import { brandsApi } from '../api/brandsApi';
import { attributesApi } from '../api/attributesApi';
export function useCatalog() {
 const categories=useQuery({queryKey:['categories'],queryFn:categoriesApi.list});
 const brands=useQuery({queryKey:['brands'],queryFn:brandsApi.list});
 const attributes=useQuery({queryKey:['attributes'],queryFn:attributesApi.list});
 return {categories,brands,attributes};
}
