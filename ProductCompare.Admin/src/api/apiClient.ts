import axios from 'axios';
const baseURL = import.meta.env.VITE_API_BASE_URL;
export const apiClient = axios.create({ baseURL, timeout: 15000, withCredentials: true });
apiClient.interceptors.request.use(async config => {
 if (!baseURL) throw new Error('API adresi tanımlı değil. .env.local dosyasını kontrol edin.');
 if (!['get','head','options'].includes(config.method?.toLowerCase() ?? 'get')) {
  const csrf = await apiClient.get<{token:string}>('/api/auth/csrf');
  config.headers.set('X-CSRF-TOKEN', csrf.data.token);
 }
 return config;
});
let refreshing:Promise<unknown>|null=null;
apiClient.interceptors.response.use(response=>response,async error=>{
 const config=error.config;
 if(error.response?.status===401&&config&&!config._retried&&!['/api/auth/login','/api/auth/refresh','/api/auth/logout','/api/auth/csrf'].includes(config.url)){
  config._retried=true;
  refreshing??=apiClient.post('/api/auth/refresh').finally(()=>{refreshing=null;});
  try{await refreshing;}catch(e){window.dispatchEvent(new Event('auth-expired'));throw e;}
  return apiClient(config);
 }
 if(error.response?.status===401&&config?.url!=='/api/auth/login')window.dispatchEvent(new Event('auth-expired'));
 return Promise.reject(error);
});
export function errorMessage(error: unknown): string {
 if (axios.isAxiosError(error)) {
  const data: unknown = error.response?.data;
  if (typeof data === 'object' && data !== null && 'message' in data) {
   const errors = 'errors' in data && Array.isArray(data.errors) ? data.errors.filter((v): v is string => typeof v === 'string') : [];
   return [String(data.message), ...errors].join(' ');
  }
  return error.response ? 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' : 'API bağlantısı kurulamadı. Sunucunun çalıştığını kontrol edin.';
 }
 return error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
}

