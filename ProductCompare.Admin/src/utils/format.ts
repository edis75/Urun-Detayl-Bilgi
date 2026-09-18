import type { TechnicalAttribute } from '../types/catalog';
export const money = (value: number, currency: string) => { try { return new Intl.NumberFormat('tr-TR', {style:'currency', currency}).format(value); } catch { return value+' '+currency; } };
export function attributeValue(a: TechnicalAttribute) {
 const value = a.value === null ? '—' : a.dataType === 'Boolean' ? (a.value ? 'Var' : 'Yok') : a.dataType === 'Date' ? new Date(String(a.value)).toLocaleDateString('tr-TR', {timeZone:'UTC'}) : String(a.value);
 return value + (a.unit ? ' '+a.unit : '');
}
