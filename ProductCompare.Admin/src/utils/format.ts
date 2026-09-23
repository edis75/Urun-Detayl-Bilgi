import type { TechnicalAttribute } from '../types/catalog';
export function attributeValue(a: TechnicalAttribute) {
 const value = a.value === null ? '—' : a.dataType === 'Boolean' ? (a.value ? 'Var' : 'Yok') : a.dataType === 'Date' ? new Date(String(a.value)).toLocaleDateString('tr-TR', {timeZone:'UTC'}) : String(a.value);
 return value + (a.unit ? ' '+a.unit : '');
}
