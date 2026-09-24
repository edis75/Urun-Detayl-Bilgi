import { useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function RichTextEditor({value,onChange}:{value:string;onChange:(html:string)=>void}){
 const [linkOpen,setLinkOpen]=useState(false);
 const [href,setHref]=useState('');
 const [linkError,setLinkError]=useState('');
 const editor=useEditor({
  extensions:[StarterKit.configure({heading:{levels:[2,3,4]},code:false,codeBlock:false,horizontalRule:false,strike:false,link:{openOnClick:false,defaultProtocol:'https'}})],
  content:value,
  editorProps:{attributes:{role:'textbox','aria-label':'Ürün İçeriği','aria-multiline':'true'}},
  onUpdate:({editor})=>onChange(editor.isEmpty?'':editor.getHTML()),
 });
 const state=useEditorState({editor,selector:({editor})=>editor?{
  heading:editor.isActive('heading')?String(editor.getAttributes('heading').level):'paragraph',
  bold:editor.isActive('bold'),italic:editor.isActive('italic'),underline:editor.isActive('underline'),
  bullet:editor.isActive('bulletList'),ordered:editor.isActive('orderedList'),quote:editor.isActive('blockquote'),link:editor.isActive('link'),
  undo:editor.can().undo(),redo:editor.can().redo(),
 }:null});
 if(!editor||!state)return null;
 function applyLink(){
  const url=href.trim();
  if(url&&!/^(https?:\/\/|mailto:)/i.test(url)){setLinkError('https://, http:// veya mailto: ile başlayan bir adres girin.');return;}
  if(url)editor!.chain().focus().extendMarkRange('link').setLink({href:url}).run();
  else editor!.chain().focus().extendMarkRange('link').unsetLink().run();
  setLinkOpen(false);
 }
 return <div className="rich-editor">
  <div className="rich-toolbar" role="group" aria-label="Metin biçimlendirme">
   <select aria-label="Paragraf biçimi" value={state.heading} onChange={e=>{const level=Number(e.target.value);if(level)editor.chain().focus().setHeading({level:level as 2|3|4}).run();else editor.chain().focus().setParagraph().run();}}><option value="paragraph">Normal paragraf</option><option value="2">Başlık 2</option><option value="3">Başlık 3</option><option value="4">Başlık 4</option></select>
   <button type="button" aria-label="Kalın" aria-pressed={state.bold} onClick={()=>editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
   <button type="button" aria-label="İtalik" aria-pressed={state.italic} onClick={()=>editor.chain().focus().toggleItalic().run()}><em>I</em></button>
   <button type="button" aria-label="Altı çizili" aria-pressed={state.underline} onClick={()=>editor.chain().focus().toggleUnderline().run()}><u>U</u></button>
   <button type="button" aria-pressed={state.bullet} onClick={()=>editor.chain().focus().toggleBulletList().run()}>Madde listesi</button>
   <button type="button" aria-pressed={state.ordered} onClick={()=>editor.chain().focus().toggleOrderedList().run()}>Numaralı liste</button>
   <button type="button" aria-pressed={state.quote} onClick={()=>editor.chain().focus().toggleBlockquote().run()}>Alıntı</button>
   <button type="button" aria-pressed={state.link} onClick={()=>{setHref(editor.getAttributes('link').href??'');setLinkError('');setLinkOpen(true);}}>Bağlantı</button>
   <button type="button" disabled={!state.undo} onClick={()=>editor.chain().focus().undo().run()}>Geri al</button>
   <button type="button" disabled={!state.redo} onClick={()=>editor.chain().focus().redo().run()}>Yinele</button>
  </div>
  {linkOpen&&<div className="rich-link"><label>Bağlantı adresi<input value={href} onChange={e=>setHref(e.target.value)} placeholder="https://…" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();applyLink();}}}/></label><button type="button" onClick={applyLink}>Uygula</button><button type="button" onClick={()=>{editor.chain().focus().extendMarkRange('link').unsetLink().run();setLinkOpen(false);}}>Bağlantıyı kaldır</button><button type="button" onClick={()=>setLinkOpen(false)}>Vazgeç</button>{linkError&&<p role="alert">{linkError}</p>}</div>}
  <EditorContent editor={editor}/>
 </div>;
}
