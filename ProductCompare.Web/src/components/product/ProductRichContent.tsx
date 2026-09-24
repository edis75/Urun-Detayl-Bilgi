export function ProductRichContent({html}:{html?:string|null}){
 if(!html?.trim())return null;
 // ContentHtml is sanitized by the product API before it is stored.
 return <div className="product-rich-content" dangerouslySetInnerHTML={{__html:html}}/>;
}
