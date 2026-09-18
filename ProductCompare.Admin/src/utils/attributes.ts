import type { CategoryAttribute, ProductAttributeValueRequest } from '../types/catalog';
export type AttributeInputs = Record<number,string>;
export function serializeAttributes(rules: CategoryAttribute[], values: AttributeInputs): ProductAttributeValueRequest[] {
 return rules.flatMap<ProductAttributeValueRequest>(({attribute:a})=>{
  const value=values[a.id]??'';
  if(value.trim()==='')return [];
  const base={attributeDefinitionId:a.id};
  switch(a.dataType){
   case 'Text': return [{...base,textValue:value.trim()}];
   case 'Number': return [{...base,numericValue:Number(value)}];
   case 'Boolean': return [{...base,booleanValue:value==='true'}];
   case 'Date': return [{...base,dateValue:new Date(value+'T00:00:00Z').toISOString()}];
  }
 });
}

