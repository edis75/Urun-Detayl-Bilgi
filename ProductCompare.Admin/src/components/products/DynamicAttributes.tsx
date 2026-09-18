import type { CategoryAttribute } from '../../types/catalog';
import type { AttributeInputs } from '../../utils/attributes';
import { Field } from '../forms/Fields';
export function DynamicAttributes({rules,values,onChange}:{rules:CategoryAttribute[];values:AttributeInputs;onChange:(id:number,value:string)=>void}){
 return <div className="form-grid">{rules.map(r=>{const a=r.attribute;const label=a.name+(r.isRequired?' *':'');return <Field key={a.id} label={label} hint={a.description??undefined}><div className="unit-input">{a.dataType==='Boolean'?<BooleanInput label={label} required={r.isRequired} value={values[a.id]??''} onChange={value=>onChange(a.id,value)}/>:<input aria-label={label} required={r.isRequired} pattern={a.dataType==='Text'&&r.isRequired?'.*\\S.*':undefined} title={a.dataType==='Text'&&r.isRequired?'Boşluk dışında en az bir karakter girin.':undefined} type={a.dataType==='Number'?'number':a.dataType==='Date'?'date':'text'} step={a.dataType==='Number'?'any':undefined} value={values[a.id]??''} onChange={e=>onChange(a.id,e.target.value)}/>} {a.unit&&<span>{a.unit}</span>}</div></Field>;})}</div>;
}

function BooleanInput({label,required,value,onChange}:{label:string;required:boolean;value:string;onChange:(value:string)=>void}){
 // Native `required` would reject false. Require an explicit answer instead,
 // preserving the distinction between an omitted value and boolean false.
 return <span className="boolean-input"><input type="checkbox" aria-label={label} aria-required={required} checked={value==='true'} ref={input=>{if(input){input.indeterminate=value==='';input.setCustomValidity(required&&value===''?'Var veya Yok seçin.':'');}}} onChange={e=>onChange(String(e.target.checked))}/><span>{value===''?'Belirtilmedi':value==='true'?'Var':'Yok'}</span>{value!==''&&<button type="button" className="small" aria-label={label+' değerini temizle'} onClick={()=>onChange('')}>Temizle</button>}</span>;
}
