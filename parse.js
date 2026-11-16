const escape = s => s.replace(/&(?!(?:#\d+|#x[\da-fA-F]+|[a-zA-Z][a-zA-Z\d]+);)|[<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const literal = s => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blockTag=/^ {0,3}<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:[ \t/>]|$)/i;
const tagPattern=/<(?:[A-Za-z][A-Za-z\d-]*(?:\s+[A-Za-z_:][\w:.-]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*\/?|\/[A-Za-z][A-Za-z\d-]*\s*)>/;
const inlineTag=new RegExp('^'+tagPattern.source);
const standaloneTag=new RegExp('^ {0,3}'+tagPattern.source+'[ \t]*$');
function htmlType(s,interrupt=false){
 let m=/^ {0,3}<(script|pre|style|textarea)(?:\s|>|$)/i.exec(s);if(m)return new RegExp('</'+m[1]+'\\s*>','i');
 if(/^ {0,3}<!--/.test(s))return /-->/;
 if(/^ {0,3}<\?/.test(s))return /\?>/;
 if(/^ {0,3}<![A-Z]/.test(s))return />/;
 if(/^ {0,3}<!\[CDATA\[/.test(s))return /\]\]>/;
 if(blockTag.test(s))return true;
 if(!interrupt&&standaloneTag.test(s))return true;
 return false;
}

const unescapeMD=s=>s.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g,'$1');
const norm=s=>s.trim().replace(/\s+/g,' ').toLowerCase().toUpperCase();
const urlEncode=(s,unesc=true)=>{try{return encodeURI(unesc?unescapeMD(s):s).replace(/%25/g,'%')}catch{return null}};
function codeAt(s){const start=/^`+/.exec(s);if(!start)return null;const n=start[0].length;let re=/`+/g;re.lastIndex=n;let m;while(m=re.exec(s))if(m[0].length===n)return {length:m.index+n,text:s.slice(n,m.index)};return null}
function destination(s,offset=0){let i=offset,url='',title;
 while(/[ \t\n]/.test(s[i]||'x'))i++;
 if(s[i]==='<'){let start=++i;while(i<s.length&&s[i]!=='>'&&s[i]!=='\n'&&s[i]!=='<'){if(s[i]==='\\'&&i+1<s.length)i++;i++}if(s[i]!=='>')return null;url=s.slice(start,i++);}
 else {let start=i,depth=0;while(i<s.length){let c=s[i];if(c==='\\'&&i+1<s.length){i+=2;continue}if(/[ \t\n]/.test(c))break;if(c==='(')depth++;if(c===')'){if(!depth)break;depth--}i++}if(depth)return null;url=s.slice(start,i)}
 const before=i;while(/[ \t\n]/.test(s[i]||'x'))i++;
 if(i>before&&/["'(]/.test(s[i]||'x')){const close=s[i]==='('?')':s[i],start=++i;while(i<s.length&&s[i]!==close){if(s[i]==='\\'&&i+1<s.length)i++;i++}if(i===s.length)return null;title=s.slice(start,i++);while(/[ \t\n]/.test(s[i]||'x'))i++}
 return {url,title,end:i};
}

function cells(s){s=s.trim().replace(/^\|/,'').replace(/(?<!\\)\|$/,'');let result=[],v='';for(let i=0;i<s.length;i++){if(s[i]==='|'&&s[i-1]==='\\'){v=v.slice(0,-1)+'|'}else if(s[i]==='|'){result.push(v.trim());v=''}else v+=s[i]}result.push(v.trim());return result}
function tableHeader(a,b){if(!a||!b||!b.includes('|')&&!a.includes('|'))return null;let h=cells(a),align=cells(b);return h.length===align.length&&align.every(c=>/^:?-+:?$/.test(c))?{h,align:align.map(c=>c.startsWith(':')?c.endsWith(':')?'center':'left':c.endsWith(':')?'right':null)}:null}

function expandLeading(line,offset=0){let col=offset,out='',i=0;for(;i<line.length;i++){let c=line[i];if(c===' '){out+=' ';col++}else if(c==='\t'){let n=4-col%4;out+=' '.repeat(n);col+=n}else break}return out+line.slice(i)}
function expandTabs(line){let col=0;return line.replace(/[^\t]*\t/g,v=>{let n=4-(col+v.length-1)%4;col+=v.length-1+n;return v.slice(0,-1)+' '.repeat(n)})}
export function parse(markdown) {
 const refs=Object.create(null);let htmlLink=false;
 function inline(s,inLink=false,plain=false){let out='',delims=[],masked=[];for(let i=0;i<s.length;){const t=s.slice(i);let m;
 if(m=/^\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/.exec(t)){out+=escape(m[1]);i+=m[0].length;continue}
 if(t[0]==='`'){let code=codeAt(t);if(code){let v=code.text.replace(/\n/g,' ');if(/^ .* $/.test(v)&&/[^ ]/.test(v))v=v.slice(1,-1);out+=plain?literal(v):'<code>'+literal(v)+'</code>';i+=code.length;continue}else {m=/^`+/.exec(t);out+=m[0];i+=m[0].length;continue}}
 if(m=/^&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[a-zA-Z][a-zA-Z\d]*);/.exec(t)){let ent=m[0];if(ent[1]==='#'){let n=ent[2].toLowerCase()==='x'?parseInt(ent.slice(3),16):parseInt(ent.slice(2),10);ent=literal(String.fromCodePoint(n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?n:65533))}out+=ent;i+=m[0].length;continue}
 if(m=/^<([a-zA-Z][a-zA-Z\d+.-]{1,31}:[^ <>]*)>/.exec(t)){out+='<a href="'+escape(urlEncode(m[1],false))+'">'+escape(m[1])+'</a>';i+=m[0].length;continue}
 if(m=/^<([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?)>/.exec(t)){out+='<a href="mailto:'+escape(m[1])+'">'+escape(m[1])+'</a>';i+=m[0].length;continue}
 if((m=/^(?:<!--(?:>|->|[\s\S]*?-->)|<\?[\s\S]*?\?>|<![A-Z][\s\S]*?>|<!\[CDATA\[[\s\S]*?\]\]>)/.exec(t)) || (m=inlineTag.exec(t))){if(/^<a(?:\s|>)/i.test(m[0]))htmlLink=true;else if(/^<\/a\s*>/i.test(m[0]))htmlLink=false;out+=m[0];i+=m[0].length;continue}
 if(t[0]==='['||t.startsWith('![')){
 const img=t[0]==='!',begin=img?2:1;let j=begin,depth=0;
 for(;j<t.length;j++){if(t[j]==='\\'){j++;continue}if(t[j]==='`'){let c=codeAt(t.slice(j));if(c&&(t.slice(begin,j).includes('``')||t.startsWith('``',j))&&t.slice(j,j+c.length).includes(']'))c=null;if(c&&t.slice(j,j+c.length).includes(']')&&/^`/.test(t[j-1]||''))c=null;if(c){if(c.text.includes('`')&&t[j+c.length]!==']'){let end=t.indexOf(']',j+c.length);if(end>=0)masked.push([i,i+end]);break;}j+=c.length-1;continue}else{j+=/^`+/.exec(t.slice(j))[0].length-1;continue}}
 if(t[j]==='<'){let h=/^(?:<[^\s<>]+>|<!--(?:>|->|[\s\S]*?-->))/.exec(t.slice(j))||inlineTag.exec(t.slice(j));if(h){j+=h[0].length-1;continue}}
 if(t[j]==='[')depth++;if(t[j]===']'){if(!depth)break;depth--}}
 if(j<t.length&&t[j]===']'){let label=t.slice(begin,j),r=null,end=j+1,isRef=false;
 if(t[end]==='('){const d=destination(t,end+1);if(d&&t[d.end]===')'){r=[d.url,d.title];end=d.end+1}}
 if(!r){isRef=true;let ref=/^\[((?:\\.|[^\[\]\\])*)\]/.exec(t.slice(end));const key=ref&&ref[1]?ref[1]:label;r=refs[norm(key)];if(r&&ref)end+=ref[0].length}
 if(r&&inLink==='probe'&&!img){out+='<mdlink>';i+=end;continue}if(r){let content=inline(label,!img,plain||img);if(img||(inLink!=='probe'&&!/<mdlink>/.test(inline(label,'probe',false)))){let url=urlEncode(r[0]);let title=r[1]===undefined?'':' title="'+escape(unescapeMD(r[1]))+'"';out+=plain?inline(label,false,true):img?'<img src="'+escape(url||'')+'" alt="'+content.replace(/"/g,'&quot;')+'"'+title+'>':'<a href="'+escape(url||'')+'"'+title+'>'+content+'</a>';for(let z=begin;z<j;z++){if(t[z]==='`'){let span=codeAt(t.slice(z));if(span&&z+span.length>end){masked.push([i+end,i+z+span.length]);break}if(span)z+=span.length-1;else z+=/^`+/.exec(t.slice(z))[0].length-1;}}i+=end;continue}}
 }
 }
 if(!inLink&&!plain&&!htmlLink){
 if(m=/^(?:(?:[hH][tT][tT][pP][sS]?|[fF][tT][pP]):\/\/|www\.)(?:[^\s<>]*)/.exec(t)){
 let v=m[0],old;let segment=v.lastIndexOf('(');if(segment>=0&&!v.slice(segment).includes(')'))v=v.slice(0,segment);do{old=v;v=v.replace(/&[A-Za-z\d]+;$/,'').replace(/[?!.,:;*_"'~]+$/,'');if(v.endsWith(')')){let balance=0;for(let z=v.length-1;z>=0;z--){if(v[z]===')')balance++;else if(v[z]==='('){balance--;if(!balance)break}}if(balance)v=v.slice(0,-1);}}while(v!==old);
 if(v.length>(v.startsWith('www.')?4:v.indexOf('://')+3)){out+='<a href="'+escape(urlEncode(v.startsWith('www.')?'http://'+v:v))+'">'+escape(v)+'</a>';i+=v.length;continue}
 }
 if((i===0||!/[\w.+-]/.test(s[i-1]))&&(m=/^(?:(mailto:|xmpp:))?([\w.+-]+@[A-Za-z\d_-]+(?:\.[A-Za-z\d_-]+)+)/.exec(t))){if(/_+$/.test(m[2])&&delims.some(d=>d.ch==='_'&&d.open)){m[0]=m[0].replace(/_+$/,'');m[2]=m[2].replace(/_+$/,'')}if(/[-_]$/.test(m[2])){out+=escape(s[i++]);continue}
 let v=m[0];if(m[1]==='xmpp:'){let resource=/^\/[\w@.%-]+/.exec(t.slice(v.length));if(resource)v+=resource[0]}out+='<a href="'+escape(m[1]?v:'mailto:'+v)+'">'+escape(v)+'</a>';i+=v.length;continue;
 }
 }
 if(m=/^(\*+|_+|~+)/.exec(t)){
 if(m[0][0]==='~'&&m[0].length>2){out+=m[0];i+=m[0].length;continue}const ch=m[0][0], n=m[0].length,prev=s[i-1]||' ',next=s[i+n]||' ';
 const ws=c=>/\s/.test(c),pun=c=>/[\p{P}\p{S}]/u.test(c);
 const left=!ws(next)&&(!pun(next)||ws(prev)||pun(prev));
 const right=!ws(prev)&&(!pun(prev)||ws(next)||pun(next));
 let d={ch,n,pos:i,orig:n,open:ch==='_'?left&&(!right||pun(prev)):left,close:ch==='_'?right&&(!left||pun(next)):right,before:'',after:'',active:true};
 if(masked.some(([a,b])=>i>=a&&i<b))d.open=d.close=false;delims.push(d);out+='\u0000'+(delims.length-1)+'\u0000';i+=n;continue;
 }
 if(m=/^(?: {2,}|\\)\n */.exec(t)){out+='<br>';i+=m[0].length;continue}
 out+=escape(s[i++]);}
 function pair(from,to){for(let k=from;k<to;k++){const op=delims[k];if(!op.active||!op.open||!op.n)continue;let total=op.n,mid=0;for(let j=k+1;j<to;j++){const cl=delims[j];if(!cl.active||cl.ch!==op.ch)continue;if(cl.open&&!cl.close){total+=cl.n;continue}if(!cl.close)continue;if(op.ch==='~'&&op.n!==cl.n)continue;
 if(op.ch!=='~'&&cl.open&&op.n%3!==0&&(op.n+cl.n)%3===0){mid+=cl.n;continue}
 total-=cl.n;if(total>0){if(j===k+1&&!delims.slice(j+1,to).some(d=>d.ch===op.ch&&d.close))total=0;else continue;}let available=Math.min(cl.n,cl.n+total+mid);let use=op.ch==='~'?op.n:Math.min(op.n,available)%2?1:2;if(use>cl.n||use>op.n)continue;
 let tag=op.ch==='~'?'del':use===2?'strong':'em';op.n-=use;cl.n-=use;if(mid&&cl.n)cl.remainderBefore=true;op.after+='<'+tag+'>';cl.before='</'+tag+'>'+cl.before;
 if(plain){op.after='';cl.before=''}pair(k,j+1);for(let z=k+1;z<j;z++)delims[z].active=false;k=j-1;break;
 }}}
 pair(0,delims.length);for(let k=0;k<delims.length;k++){let d=delims[k];if(d.open&&d.n&&(d.ch==='~'||delims.slice(k+1).some(c=>c.ch===d.ch&&!c.active&&c.n)))pair(k,delims.length)}
 return out.replace(/\u0000(\d+)\u0000/g,(_,n)=>{let d=delims[n];return d.remainderBefore?d.ch.repeat(d.n)+d.before+d.after:d.before+d.ch.repeat(d.n)+d.after});}

 function blocks(src,listContext=false,quoteContext=false){let lines=src.split('\n'),out=[],i=0,blankBetween=false,hadBlank=false;
 const interrupt=s=>(listContext&&/^ {0,3}\d{1,9}[.)] +/.test(s))||htmlType(s,true)||/^ {0,3}(?:#{1,6}(?:\s|$)|>|`{3,}[^`]*$|~{3,}|(?:[-*_] *){3,}$|[-+*] |1[.)] )/.test(s);
 while(i<lines.length){let originalLine=lines[i];lines[i]=expandLeading(lines[i]);let l=lines[i],m;if(/^\s*$/.test(l)){if(out.length)hadBlank=true;i++;continue}if(hadBlank){blankBetween=true;hadBlank=false;}
 if(l.match(/^ {0,3}\[/)){
 let tail=lines.slice(i).join('\n');let d=/^ {0,3}\[((?:\\.|[^\[\]\\])+)\]:[ \t]*(?:\n[ \t]*)?(<(?:(?:\\.)|[^<>\n\\])*>|(?:\\.|[^\s\\])+)(?:[ \t]*(?:\n[ \t]*)?("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?[ \t]*(?=\n|$)/.exec(tail);
 if(d&&!(d[3]&&d[0].includes(d[2]+d[3]))&&norm(d[1])&&!/\n\s*\n/.test(d[0])){refs[norm(d[1])]??=[d[2].replace(/^<|>$/g,''),d[3]===undefined?undefined:d[3].slice(1,-1)];i+=d[0].split('\n').length;continue}
 }
 if(m=/^ {0,3}(`{3,}|~{3,})(.*)$/.exec(l)){let marker=m[1],info=m[2].trim();if(marker[0]!=='`'||!info.includes('`')){i++;let body=[];let end=new RegExp('^ {0,3}'+marker[0]+'{'+marker.length+',} *$');while(i<lines.length&&!end.test(lines[i]))body.push(lines[i++]);if(i===lines.length&&body.at(-1)==='')body.pop();else if(i<lines.length)i++;let indent=l.match(/^ */)[0].length;if(marker[0]==='`')body=body.map(v=>v.replace(new RegExp('^[ \t]{0,'+indent+'}'),''));out.push(()=>'<pre><code'+(info?' class="language-'+escape(unescapeMD(info.split(/\s/)[0]))+'"':'')+'>'+literal(body.join('\n')+(body.length&&body.at(-1)!==''?'\n':''))+'</code></pre>\n');continue}}
 if(/^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(l)){out.push(()=>'<hr>\n');i++;continue}
 if(m=/^ {0,3}(#{1,6})(?:[ \t]+(.*?)\s*|$)$/.exec(l)){let text=(m[2]||'').replace(/(?:^|\s+)#+\s*$/,'');out.push(()=>`<h${m[1].length}>${inline(text)}</h${m[1].length}>\n`);i++;continue}
 if(/^ {4}|^\t/.test(l)){lines[i]=originalLine;let body=[];while(i<lines.length&&(/^( {4}| {0,3}\t)/.test(lines[i])||/^\s*$/.test(lines[i])))body.push(lines[i++].replace(/^(?: {4}| {0,3}\t| {1,3}$)/,''));while(body.at(-1)==='')body.pop();out.push(()=>'<pre><code>'+literal(body.join('\n')+'\n')+'</code></pre>\n');continue}
 if(/^ {0,3}>/.test(l)){
 let body=[],lazy=false,fence=null;
 while(i<lines.length){let v=lines[i];if(/^ {0,3}>/.test(v)){
 v=expandLeading(v.replace(/^ {0,3}>/,''),1).replace(/^ /,'');
 let f=/^ {0,3}(`{3,}|~{3,})/.exec(v);
 if(fence){if(new RegExp('^ {0,3}'+fence[0]+'{'+fence.length+',} *$').test(v))fence=null;lazy=false}
 else if(f&&(f[1][0]!=='`'||!v.slice(f[0].length).includes('`'))){fence=f[1];lazy=false}else {let leaf=v.replace(/^(?: {0,3}> ?)+/,'').replace(/^ {0,3}(?:[-+*]|\d+[.)]) +(?:> ?)?/,'');lazy=!!leaf.trim()&&!/^ {4}/.test(leaf)&&!interrupt(leaf);}
 body.push(v);i++;
 }else if(v.trim()&&lazy&&!interrupt(v)){body.push(/^ {0,3}(?:=+|-+) *$/.test(v)?'    '+v:v);i++}else break;
 }
 let children=blocks(body.join('\n'),false,true);out.push(()=>'<blockquote>\n'+children()+'</blockquote>\n');continue}
 const listMatch=v=>/^( {0,3})([-+*]|\d{1,9}[.)])(?:([ \t]+)(.*)|$)/.exec(v);
 if(m=listMatch(l)){lines[i]=l=expandTabs(l);m=listMatch(l);
 let ordered=/\d/.test(m[2]),start=parseInt(m[2]),items=[],loose=false,bullet=ordered?m[2].slice(-1):m[2];
 while(i<lines.length){lines[i]=expandLeading(lines[i]);let a=listMatch(lines[i]);if(!a||(ordered?!/^\d/.test(a[2])||a[2].slice(-1)!==bullet:a[2]!==bullet)||/^ {0,3}(?:(?:\* *){3,}|(?:- *){3,})$/.test(lines[i]))break;
 let padding=a[4]?(a[3]||' ').length:1;if(padding>4)padding=1;
 let indent=a[1].length+a[2].length+padding,body=[lines[i].slice(indent)],empty=!body[0].trim();i++;
 while(i<lines.length){lines[i]=expandLeading(lines[i]);let v=lines[i];
 if(!v.trim()){
 let k=i;while(k<lines.length&&!lines[k].trim())k++;if(k<lines.length)lines[k]=expandLeading(lines[k]);
 if(!empty&&k<lines.length&&lines[k].startsWith(' '.repeat(indent))){while(i<k){body.push('');i++}continue}
 let next=k<lines.length?listMatch(lines[k]):null;
 if(next&&(ordered?/^\d/.test(next[2])&&next[2].slice(-1)===bullet:next[2]===bullet)){loose=true;i=k}
 break;
 }
 if(v.startsWith(' '.repeat(indent))){body.push(v.slice(indent));i++;continue}
 if(listMatch(v)||interrupt(v)||empty||/^ {0,3}(?:`{3,}|~{3,})/.test(body.at(-1)))break;
 body.push(v);i++;
 }
 let task=/^\[([ xX])\] +/.exec(body[0]);if(task)body[0]=body[0].slice(task[0].length);
 let child=blocks(body.join('\n'),true);loose ||=child.loose;items.push({child,task});
 }
 out.push(()=>{let tag=ordered?'ol':'ul';return '<'+tag+(ordered&&start!==1?' start="'+start+'"':'')+'>\n'+items.map(({child,task})=>{let h=child(!loose);if(task){let checkbox='<input '+(task[1].toLowerCase()==='x'?'checked="" ':'')+'disabled="" type="checkbox"> ';h=loose&&h.startsWith('<p>')?'<p>'+checkbox+h.slice(3):checkbox+h;}return '<li>'+h+'</li>\n'}).join('')+'</'+tag+'>\n'});continue}
 let ht=htmlType(l);if(ht){let body=[];if(ht===true){while(i<lines.length&&lines[i].trim()!=='')body.push(lines[i++]);}else{while(i<lines.length){const v=lines[i++];body.push(v);if(ht.test(v))break}}
 let raw=body.join('\n');if(i<lines.length&&((ht===true?lines[i].trim()!=='':lines[i]!=='')||i===lines.length-1))raw+='\n';out.push(()=>raw);continue}
 let table=tableHeader(l,lines[i+1]);if(table){i+=2;let rows=[];while(i<lines.length&&!/^ *$/.test(lines[i])&&!interrupt(lines[i]))rows.push(cells(lines[i++]));out.push(()=>{let row=(v,tag)=>'<tr>\n'+table.h.map((_,j)=>'<'+tag+(table.align[j]?' align="'+table.align[j]+'"':'')+'>'+inline(v[j]||'')+'</'+tag+'>\n').join('')+'</tr>\n';return '<table>\n<thead>\n'+row(table.h,'th')+'</thead>\n'+(rows.length?'<tbody>'+rows.map(v=>row(v,'td')).join('')+'</tbody>':'')+'</table>\n'});continue}
 let body=[l];i++;let level=0;while(i<lines.length&&(lines[i].trim()||(quoteContext&&lines[i]!==''))&&(!interrupt(lines[i])||/^ {0,3}(?:=+|-+)\s*$/.test(lines[i]))){if(/^ {0,3}(?:=+|-+)\s*$/.test(lines[i])){level=lines[i].trim()[0]==='='?1:2;i++;break}body.push(lines[i++]);}let text=body.join('\n');if(quoteContext)text=text.replace(/\n {4,}(?=[-+*] )/g,'\n');if(listContext)text=text.replace(/\n {4,}(?!(?:=+|-+)[ \t]*(?:\n|$))/g,'\n');out.push((tight)=>level?`<h${level}>${inline(text.trim())}</h${level}>\n`:tight?inline(text):'<p>'+inline(text)+'</p>\n');
 }const render=(tight=false)=>out.map(fn=>fn(tight)).join('');render.loose=blankBetween;return render;}
 return blocks(markdown.replace(/\r\n?/g,'\n'))();
}
