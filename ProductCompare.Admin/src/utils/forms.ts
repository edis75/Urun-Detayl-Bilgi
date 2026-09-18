export const text = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
export const nullable = (data: FormData, key: string) => text(data,key) || null;

