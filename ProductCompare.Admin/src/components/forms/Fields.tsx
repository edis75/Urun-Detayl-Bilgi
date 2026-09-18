import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
 const id=useId();
 const control=isValidElement(children)&&children.type!=='div'?cloneElement(children as ReactElement<{'aria-labelledby':string}>,{'aria-labelledby':id}):children;
 return <label className="field"><span id={id}>{label}</span>{control}{hint&&<small>{hint}</small>}</label>;
}
export function Check({ name, label, value = false }: { name: string; label: string; value?: boolean }) { return <label className="check"><input type="checkbox" name={name} defaultChecked={value}/>{label}</label>; }

