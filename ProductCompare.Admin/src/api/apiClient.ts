import axios from 'axios';
const baseURL = import.meta.env.VITE_API_BASE_URL;
export const apiClient = axios.create({ baseURL, timeout: 15000 });
apiClient.interceptors.request.use(config => {
 if (!baseURL) throw new Error('API adresi tanımlı değil. .env.local dosyasını kontrol edin.');
 return config;
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

