// Dependency-free block and inline Markdown renderer.
const punct = /[\p{P}\p{S}]/u;
const ws = /\s/u;
const escapeRE = /[&<>"']/g;
const escapes = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
function escape(s, all=false) { return (all?s:s.replace(/&(?!(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[a-zA-Z][\da-zA-Z]*);)/g,'&amp;')).replace(all?escapeRE:/[<>"']/g,c=>escapes[c]); }
function unescape(s){return s.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g,'$1');}
function decode(s){return s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|colon);?/gi,(_,n)=>n[0]==='#'?String.fromCodePoint(Math.min(0x10ffff,parseInt(n.slice(n[1].toLowerCase()==='x'?2:1),n[1].toLowerCase()==='x'?16:10))||0xfffd):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",colon:':'})[n.toLowerCase()]);}
function url(s,literal=false){try{return encodeURI(decode(literal?s:unescape(s))).replace(/%25/g,'%')}catch{return null}}
const label=s=>s.trim().replace(/\s+/g,' ').toLowerCase().replace(/ß/g,'ss');
const tagRE=/^(?:<\/[A-Za-z][\w-]*\s*>|<[A-Za-z][\w-]*(?:\s+[A-Za-z_:][\w.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>)/;
function destination(s,start){let i=start;while(/[ \t\n]/.test(s[i]||'')&&i<s.length)i++;let dest='';if(s[i]==='<'){let j=i+1;while(j<s.length&&s[j]!=='>'&&s[j]!=='\n'){if(s[j]==='\\')j++;j++}if(s[j]!=='>')return null;dest=s.slice(i+1,j);if(/(^|[^\\])</.test(dest))return null;i=j+1;}else{let j=i,n=0;for(;j<s.length;j++){let c=s[j];if(c==='\\'){j++;continue}if(c==='(')n++;else if(c===')'){if(!n)break;n--}if(/[ \t\n]/.test(c))break;}if(n)return null;dest=s.slice(i,j);i=j;}
 let before=i;while(i<s.length&&/[ \t\n]/.test(s[i]))i++;let title='';if(i>before&&/["'(]/.test(s[i]||'')&&i<s.length){let quote=s[i],end=quote==='('?')':quote,j=i+1;while(j<s.length&&s[j]!==end){if(s[j]==='\\')j++;j++}if(j<s.length){title=s.slice(i+1,j);i=j+1;while(i<s.length&&/[ \t\n]/.test(s[i]))i++;}}
 return {dest,title,end:i};}
function inlineMask(s){let ranges=[];for(let i=0;i<s.length;i++){if(s[i]==='\\'){i++;continue;}if(s[i]!=='`')continue;let n=1;while(s[i+n]==='`')n++;let j=i+n,found=false;while((j=s.indexOf('`',j))>=0){let k=j;while(s[k]==='`')k++;if(k-j===n){ranges.push([i,k]);i=k-1;found=true;break;}j=k;}if(!found)i+=n-1;}
 const links=/!?\[(?:\\.|[^\[\]\\])*\]\((?:\\.|[^)\\])*\)/g;let m;while((m=links.exec(s))){let p=m.index-1;while(s[p]==='\\')p--;if((m.index-1-p)%2===0)ranges.push([m.index,m.index+m[0].length]);}return ranges;}
function inline(s,refs,inLink=refs.inLink||false,plain=false){let tokens=[],delims=[],i=0,raw=refs.raw||false;const masked=inlineMask(s);const add=(text)=>tokens.push({text});
 while(i<s.length){let rest=s.slice(i),m,c=s[i];
 if(c==='\\'&&(m=/^\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]|\n)/.exec(rest))){add(m[1]==='\n'?(plain?'':'<br>'):escape(m[1]));i+=m[0].length;if(m[1]==='\n')while(s[i]===' ')i++;continue;}
 if(c==='`'){let n=1;while(s[i+n]==='`')n++;let j=i+n,end=-1;while(j<s.length){j=s.indexOf('`',j);if(j<0)break;let k=j;while(s[k]==='`')k++;if(k-j===n){end=j;break}j=k;}if(end>=0){let x=s.slice(i+n,end).replace(/\n/g,' ');if(x.startsWith(' ')&&x.endsWith(' ')&&/[^ ]/.test(x))x=x.slice(1,-1);add(plain?escape(x,true):'<code>'+escape(x,true)+'</code>');i=end+n;continue}add('`'.repeat(n));i+=n;continue;}
 if((c==='['||c==='!'&&s[i+1]==='[')){
 let img=c==='!',a=i+(img?2:1),j=a,depth=1;for(;j<s.length;j++){if(s[j]==='\\'){j++;continue}if(s[j]==='`'){let terminal=/^`{2,}(?=\])/.exec(s.slice(j));if(terminal){j+=terminal[0].length-1;continue;}let r=/^`+[^`]*`+/.exec(s.slice(j));if(r){j+=r[0].length-1;continue;}}if(s[j]==='<'){let tag=tagRE.exec(s.slice(j))||/^<(?:[A-Za-z][\w+.-]{1,31}:[^\s<>]*|[^<>\s]+@[^<>\s]+)>/.exec(s.slice(j));if(tag){j+=tag[0].length-1;continue;}}if(s[j]==='[')depth++;if(s[j]===']'&&!--depth)break;}
 if(j<s.length){let text=s.slice(a,j);if(/(`{2,})[^`]*`[^`]*\1[\s\S]+/.test(text)){add(img?'![':'[');i=a;continue;}let d=null,end=j+1;if(s[end]==='('){d=destination(s,end+1);if(!d||s[d.end]!==')')d=null;else end=d.end+1;}if(!d){let ref=text;if(s[j+1]==='['){let k=s.indexOf(']',j+2);if(k>=0){ref=s.slice(j+2,k)||text;end=k+1;}}d=refs.get(label(ref))||null;}
 if(d){if(!img&&/(?:^|[^!])\[/.test(text)&&/<a\s/.test(inline(text,refs,false,false))){add('[');i++;continue;}let u=url(d.dest);if(u!==null){let t=d.title?' title="'+escape(unescape(d.title))+'"':'';if(img){let alt=inline(text,refs,false,true);add(plain?alt:'<img src="'+escape(u)+'" alt="'+alt+'"'+t+'>');}else {let previousLink=inLink;let inner=inline(text,refs,true,plain);inLink=refs.inLink=previousLink;add(plain?inner:'<a href="'+escape(u)+'"'+t+'>'+inner+'</a>');}i=end;continue;}}
 }
 }
 if(c==='<'){
 if((m=/^<([A-Za-z][\w+.-]{1,31}:[^\s<>]*)>/.exec(rest))){let u=url(m[1],true);add(plain?escape(m[1]):'<a href="'+escape(u||m[1])+'">'+escape(m[1])+'</a>');i+=m[0].length;continue;}
 if((m=/^<([A-Za-z\d.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?(?:\.[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?)*)>/.exec(rest))){add(plain?escape(m[1]):'<a href="mailto:'+escape(m[1])+'">'+escape(m[1])+'</a>');i+=m[0].length;continue;}
 m=/^(?:<!--(?:>|->|[\s\S]*?(?:-->|$))|<\?[\s\S]*?\?>|<![A-Z][\s\S]*?>|<!\[CDATA\[[\s\S]*?\]\]>)/.exec(rest)||tagRE.exec(rest);
 if(m){add(m[0]);if(/^<a(?:\s|>)/i.test(m[0]))inLink=refs.inLink=true;if(/^<\/a\s*>/i.test(m[0]))inLink=refs.inLink=false;if(/^<(?:pre|code|kbd|script)(?:\s|>)/i.test(m[0]))raw=refs.raw=true;if(/^<\/(?:pre|code|kbd|script)\s*>/i.test(m[0]))raw=refs.raw=false;i+=m[0].length;continue;}
 }
 if(!inLink&&!raw&&(m=/^(?:(?:https?:\/\/|ftp:\/\/|www\.)[^\s<]+|(?:mailto:|xmpp:)?[A-Za-z\d._+-]+@[A-Za-z\d_-]+(?:\.[A-Za-z\d_-]+)+)/i.exec(rest))){let x=m[0];if(/^www\./i.test(x)&&!x.startsWith('www.')){add(escape(x));i+=x.length;continue;}const mail=!/^(?:https?:\/\/|ftp:\/\/|www\.)/i.test(x);if(mail&&/_+$/.test(x)&&delims.some(d=>d.char==='_'&&d.open))x=x.replace(/_+$/,'');if(mail&&/[-_]$/.test(x)){add(escape(x));i+=x.length;continue;}if(x.startsWith('xmpp:')){let suffix=/^\/[^\s/<>]+/.exec(rest.slice(x.length));if(suffix)x+=suffix[0];}if(!mail){let balance=0;for(let u=0;u<x.length;u++){if(x[u]===')')balance--;if(x[u]==='('){if(balance<0&&x.indexOf(')',u)<0){x=x.slice(0,u);break;}balance++;}}}x=x.replace(/&(?:[a-zA-Z]+|#\d+);$/,'');while(/[?!.,:;*_~]$/.test(x)||/\)$/.test(x)&&!x.includes('](')&&(x.match(/\)/g)||[]).length>(x.match(/\(/g)||[]).length)x=x.slice(0,-1);x=x.replace(/&(?:[a-zA-Z]+|#\d+);$/,'');if(x){let href=mail&&!/^(?:mailto|xmpp):/.test(x)?'mailto:'+x:x.startsWith('www.')?'http://'+x:x;add(plain?escape(x):'<a href="'+escape(url(href)||href)+'">'+escape(x)+'</a>');i+=x.length;continue;}}
 if((c==='*'||c==='_'||c==='~')&&!raw){let n=1;while(s[i+n]===c)n++;if(c==='~'&&n>2){add('~'.repeat(n));i+=n;continue}let prev=i?s[i-1]:' ',next=s[i+n]||' ',pw=ws.test(prev),nw=ws.test(next),pp=punct.test(prev),np=punct.test(next);let left=!nw&&(!np||pw||pp),right=!pw&&(!pp||nw||np);let open=c==='_'?left&&(!right||pp):left,close=c==='_'?right&&(!left||np):right;if(masked.some(([a,b])=>i>=a&&i<b)){add(c.repeat(n));i+=n;continue;}let t={text:c.repeat(n),n,char:c,open,close};tokens.push(t);delims.push(t);i+=n;continue;}
 if((m=/^ {2,}\n *|^\\\n */.exec(rest))){add(plain?'':'<br>');i+=m[0].length;continue;}
 if((m=/^\n/.exec(rest))){add('\n');i+=m[0].length;continue;}
 if(c==='&'&&(m=/^&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[A-Za-z][A-Za-z\d]*);/.exec(rest))){add(m[0][1]==='#'?escape(decode(m[0]),true):m[0]);i+=m[0].length;continue;}
 // Plain runs stop before all characters that can begin inline constructs.
 let j=i+1;while(c!=='<'&&j<s.length&&!'\\`[!<*_~&\n '.includes(s[j])&&!(!inLink&&((s.charCodeAt(j)>=48&&s.charCodeAt(j)<=57)||(s.charCodeAt(j)>=65&&s.charCodeAt(j)<=90)||(s.charCodeAt(j)>=97&&s.charCodeAt(j)<=122))&&/[\s(]/.test(s[j-1])))j++;
 add(raw?s.slice(i,j):escape(s.slice(i,j)));i=j;
 }
 if(!delims.some((d,k)=>d.char!=='~'&&d.open&&d.close&&delims.slice(0,k).some(o=>o.char===d.char&&o.open&&(o.n+d.n)%3===0&&(o.n%3||d.n%3)))){
 // Resolve delimiter pairs, preserving unmatched run characters.
 for(let k=0;k<delims.length;k++){let closer=delims[k];if(!closer.close)continue;while(closer.n){let oi=k-1;for(;oi>=0;oi--){let o=delims[oi];if(o.n&&o.open&&o.char===closer.char&&!(o.char!=='~'&&(o.close||closer.open)&&(o.n+closer.n)%3===0&&(o.n%3!==0||closer.n%3!==0))&&(o.char!=='~'||o.n===closer.n))break;}if(oi<0)break;let opener=delims[oi],n=closer.char==='~'?closer.n:Math.min(opener.n,closer.n)>=2?2:1,tag=closer.char==='~'?'del':n===2?'strong':'em';opener.n-=n;closer.n-=n;opener.suffix=(plain?'':'<'+tag+'>')+(opener.suffix||'');closer.prefix=(closer.prefix||'')+(plain?'':'</'+tag+'>');for(let z=oi+1;z<k;z++)delims[z].open=false;}}
 return tokens.map(t=>t.char?(t.prefix||'')+t.char.repeat(t.n)+(t.suffix||''):t.text).join('');
 }
 // Match an opening run against subsequent runs, accounting for ambiguous delimiters.
 function resolve(ts){let result='';for(let k=0;k<ts.length;k++){let opener=ts[k];if(!opener.char){result+=opener.text;continue;}let n=opener.n,matched=false;if(opener.open){let total=n,mid=0;for(let j=k+1;j<ts.length;j++){let closer=ts[j];if(closer.char!==opener.char)continue;if(opener.char==='~'){if(closer.n!==n)continue;if(closer.open&&!closer.close){total+=n;continue;}if(!closer.close)continue;total-=n;if(total>0)continue;result+=(plain?'':'<del>')+resolve(ts.slice(k+1,j))+(plain?'':'</del>');k=j;matched=true;break;}
 if(closer.open&&!closer.close){total+=closer.n;continue;}if(!closer.close)continue;
 if(closer.open&&(n+closer.n)%3===0&&(n%3||closer.n%3)){mid+=closer.n;continue;}
 total-=closer.n;if(total>0)continue;
 let usable=Math.min(closer.n,closer.n+total+mid),amount=Math.min(n,usable)%2?1:2;
 let left=n-amount,right=usable-amount;let inside=ts.slice(k+1,j);if(left)inside.unshift({...opener,n:left});if(right)inside.push({...closer,n:right});let tag=amount===1?'em':'strong';result+=(plain?'':'<'+tag+'>')+resolve(inside)+(plain?'':'</'+tag+'>');if(closer.n>usable)result+=closer.char.repeat(closer.n-usable);k=j;matched=true;break;
 }}if(!matched)result+=opener.char.repeat(n);}return result;}
 return resolve(tokens);
}
const hr=/^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const heading=/^ {0,3}(#{1,6})(?:[ \t]+(.*)|$)/;
const fence=/^ {0,3}(`{3,}|~{3,})([^\n]*)$/;
const listRE=/^( {0,3})([*+-]|\d{1,9}[.)])(?:([ \t]+)(.*)|$)/;
const htmlBlock=/^ {0,3}<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?=[\s/>]|$)/i;
function htmlKind(line,interrupt=false){if(/^ {0,3}<(script|pre|style|textarea)(?=[\s>]|$)/i.test(line))return 1;if(/^ {0,3}<!--/.test(line))return 2;if(/^ {0,3}<\?/.test(line))return 3;if(/^ {0,3}<![A-Z]/.test(line))return 4;if(/^ {0,3}<!\[CDATA\[/.test(line))return 5;if(htmlBlock.test(line))return 6;if(!interrupt&&/^ {0,3}/.test(line)){let x=line.trim(),m=tagRE.exec(x);if(m&&m[0].length===x.length)return 7;}return 0;}
function cells(line){let a=[],part='';line=line.trim();if(line[0]==='|')line=line.slice(1);if(line.endsWith('|')&&!line.endsWith('\\|'))line=line.slice(0,-1);for(let i=0;i<line.length;i++){if(line[i]==='\\'&&line[i+1]==='|'){part+='|';i++;}else if(line[i]==='|'){a.push(part.trim());part=''}else part+=line[i];}a.push(part.trim());return a;}
function tableAlign(line){if(!/\|/.test(line))return null;let a=cells(line);if(!a.every(x=>/^:?-+:?$/.test(x)))return null;return a.map(x=>x.startsWith(':')?x.endsWith(':')?'center':'left':x.endsWith(':')?'right':null);}
function expand(s){let col=0;return s.replace(/[^\t]*\t/g,x=>{let len=x.length-1;col+=len;let n=4-col%4;col+=n;return x.slice(0,-1)+' '.repeat(n)});}
function interrupt(line){let m;return heading.test(line)||hr.test(line)||((m=fence.exec(line))&&!(m[1][0]==='`'&&m[2].includes('`')))||/^ {0,3}>/.test(line)||htmlKind(line,true)||((m=listRE.exec(line))&&m[4]!==undefined&&m[4]!==''&&(!/^\d/.test(m[2])||parseInt(m[2])===1));}
function readDefinition(s){let m=/^ {0,3}\[((?:\\.|[^\]\\])+?)\]:[ \t]*(?:\n[ \t]*)?/.exec(s);if(!m||!m[1].trim()||/(^|[^\\])\[/.test(m[1])||/\n[ \t]*\n/.test(m[0]))return null;let i=m[0].length, dest;
 if(s[i]==='<'){let r=/^<((?:\\.|[^<>\n\\])*)>/.exec(s.slice(i));if(!r)return null;dest=r[1];i+=r[0].length;}else {let r=/^(?:\\.|[^\s<>\\])+/.exec(s.slice(i));if(!r)return null;dest=r[0];i+=r[0].length;}
 let end=i;while(s[i]===' '||s[i]==='\t')i++;let afterDest=i;if(s[i]==='\n'){i++;while(s[i]===' '||s[i]==='\t')i++;}
 let title='';if(i>end&&/["'(]/.test(s[i]||'')&&i<s.length){let q=s[i],closing=q==='('?')':q,j=i+1;while(j<s.length&&s[j]!==closing){if(s[j]==='\\')j++;j++;}if(j<s.length&&!/\n[ \t]*\n/.test(s.slice(i,j))){title=s.slice(i+1,j);end=j+1;while(s[end]===' '||s[end]==='\t')end++;if(s[end]&&s[end]!=='\n'){if(s[afterDest]==='\n'){end=afterDest;title='';}else return null;}}else {if(s[afterDest]!=='\n')return null;end=afterDest;}}else {end=afterDest;if(s[end]&&s[end]!=='\n')return null;}
 return {name:m[1],dest,title,lines:s.slice(0,end).split('\n').length};
}
function canLazy(nodes){let n=nodes.at(-1);if(!n)return false;if(n.type==='p')return true;if(n.type==='list')return canLazy(n.items.at(-1).body);if(n.type==='quote')return canLazy(n.body);return false;}
function blocks(src,refs,quoted=false,lazyLines=new Set(),listMode=false){let lines=src.split('\n'),out=[],i=0;const last=()=>out[out.length-1];
 while(i<lines.length){let line=lines[i],m;if(!line.trim()){while(i<lines.length&&!lines[i].trim())i++;if(out.length&&i<lines.length)out.push({type:'space'});continue}
 if((m=heading.exec(line))){let text=(m[2]||'').trim().replace(/(?:^|\s+)#+\s*$/,'');out.push({type:'h',level:m[1].length,text});i++;continue;}
 if(hr.test(line)){out.push({type:'hr'});i++;continue}
 if((m=fence.exec(line))&&!(m[1][0]==='`'&&m[2].includes('`'))){let n=m[1].length,ch=m[1][0],indent=ch==='`'?line.indexOf(ch):0,info=m[2].trim();let body=[],closed=false;i++;while(i<lines.length){let close=lines[i].match(/^ {0,3}(`+|~+)[ \t]*$/);if(close&&close[1][0]===ch&&close[1].length>=n){i++;closed=true;break}body.push(lines[i].replace(new RegExp('^[ \t]{0,'+indent+'}'),''));i++;}if(!closed&&body.at(-1)==='')body.pop();out.push({type:'code',text:body.join('\n').replace(/\n$/,''),nonempty:body.join('\n').length>0,info:unescape(info.split(/\s+/)[0])});continue;}
 if(/^(?: {4}| {0,3}\t)/.test(line)){let body=[];while(i<lines.length){if(!lines[i].trim()){body.push(lines[i].replace(/^(?: {4}| {0,3}\t)|^ {1,3}$/,''));i++;}else if(/^(?: {4}| {0,3}\t)/.test(lines[i])){body.push(lines[i].replace(/^(?: {4}| {0,3}\t)|^ {1,3}$/,''));i++;}else break;}while(body.at(-1)==='')body.pop();out.push({type:'code',text:body.join('\n'),info:''});continue;}
 let hk=htmlKind(line);if(hk){let body=[],end=hk===1?/<\/(?:script|pre|style|textarea)>/i:hk===2?/-->/:hk===3?/\?>/:hk===4?/>/:hk===5?/\]\]>/:null;while(i<lines.length){if(!end&&!lines[i].trim())break;let x=lines[i++];body.push(x);if(end&&end.test(x))break;}out.push({type:'html',text:body.join('\n')+(i<lines.length&&!((hk<=5?lines[i]==='':!lines[i].trim())&&i<lines.length-1)?'\n':'')});continue;}
 if(/^ {0,3}>/.test(line)){let body=[],lazySet=new Set();while(i<lines.length){if(/^ {0,3}>/.test(lines[i])){let q=lines[i++];if(q.includes('\t')&&!/^ {0,3}> ?>/.test(q))q=expand(q);body.push(q.replace(/^ {0,3}> ?/,''));}else if(lines[i].trim()&&body.at(-1)?.trim()&&!interrupt(lines[i])&&canLazy(blocks(body.join('\n'),refs,true))){let lazy=lines[i++].replace(/^ {4}/,'');lazySet.add(body.length);body.push(/^=+[ \t]*$/.test(lazy)?'    '+lazy:lazy);}else break;}out.push({type:'quote',body:blocks(body.join('\n'),refs,true,lazySet)});continue;}
 if(listRE.test(line)&&line.includes('\t')){lines[i]=line=expand(line);}
 if((m=listRE.exec(line))){let ordered=/\d/.test(m[2][0]),marker=ordered?m[2].at(-1):m[2],start=ordered?parseInt(m[2]):1,items=[],loose=false;
 while(i<lines.length){if(lines[i].includes('\t'))lines[i]=expand(lines[i]);let li=listRE.exec(lines[i]);if(!li||hr.test(lines[i])||(/\d/.test(li[2][0])!==ordered)||(ordered?li[2].at(-1):li[2])!==marker)break;
 let base=li[1].length,pad=(li[3]||' ').length;if(pad>4||!li[4])pad=1;let indent=base+li[2].length+pad;let first=lines[i].slice(Math.min(indent,lines[i].length));let body=[first],lazySet=new Set();i++;let blank=false,internal=false;
 while(i<lines.length){let x=lines[i];if(!x.trim()){if(!first.trim()){let j=i;while(j<lines.length&&!lines[j].trim())j++;if(listRE.test(lines[j]||'')){body.push('');blank=true;i=j;}break;}body.push('');blank=true;i++;continue;}let expanded=/^[ \t]*>/.test(x)?x.replace(/^[ \t]*/,expand):expand(x),sp=expanded.match(/^ */)[0].length;
 if(sp>=indent){if(blank)internal=true;body.push(expanded.slice(indent));blank=false;i++;continue;}
 if(listRE.test(x)||hr.test(x)||blank||interrupt(x)||!first.trim()||fence.test(body.at(-1)||''))break;
 lazySet.add(body.length);body.push(x.replace(/^ {4}/,''));i++;
 }
 let trailing=body.length>1&&body.at(-1)==='';while(body.at(-1)==='')body.pop();let next=listRE.exec(lines[i]||'');if(trailing&&next&&(ordered?next[2].at(-1):next[2])===marker)loose=true;
 if(trailing&&!(next&&(ordered?next[2].at(-1):next[2])===marker)){while(i>0&&!lines[i-1].trim())i--;}let text=body.join('\n'),task=/^\[([ xX])\][ \t]+/.exec(text),checked=false;if(task){checked=task[1]!==' ';text=text.slice(task[0].length)}let child=blocks(text,refs,false,lazySet,true);if(child.some(n=>n.type==='space'))loose=true;items.push({body:child,task:!!task,checked});
 }
 out.push({type:'list',ordered,start,items,loose});continue;
 }
 // Reference definitions are gathered during block lexing.
 if(/^ {0,3}\[/.test(line)){const def=readDefinition(lines.slice(i).join('\n'));if(def){if(!refs.has(label(def.name)))refs.set(label(def.name),def);i+=def.lines;continue;}}
 let align=i+1<lines.length?tableAlign(lines[i+1]):null;if(align&&cells(line).length===align.length){let header=cells(line),rows=[];i+=2;while(i<lines.length&&!/^ *$/.test(lines[i])&&!interrupt(lines[i])){rows.push(cells(lines[i++]));}out.push({type:'table',header,align,rows});continue;}
 let para=[line];i++;let level=0;while(i<lines.length&&(lines[i].trim()||quoted&&lines[i]===' ')){if(lazyLines.has(i)){para.push(lines[i++]);continue;}if(/^ {0,3}(=+|-+)[ \t]*$/.test(lines[i])){level=lines[i].trim()[0]==='='?1:2;i++;break;}if(interrupt(lines[i])||listMode&&listRE.test(lines[i]))break;if(i+1<lines.length&&tableAlign(lines[i+1]))break;para.push(lines[i]);i++;}
 out.push({type:level?'h':'p',level,text:level?para.join('\n').trim():para.join('\n')});
 }
 return out;
}
function render(nodes,refs,tight=false){let out='';for(let n of nodes){switch(n.type){case 'h':out+='<h'+n.level+'>'+inline(n.text,refs)+'</h'+n.level+'>\n';break;case 'p':out+=(tight?'':'<p>')+inline(n.text,refs)+(tight?'':'</p>\n');break;case 'hr':out+='<hr>\n';break;case 'code':out+='<pre><code'+(n.info?' class="language-'+escape(n.info)+'"':'')+'>'+escape(n.text||n.nonempty?(n.text+'\n'):'',true)+'</code></pre>\n';break;case 'html':out+=n.text;break;case 'quote':out+='<blockquote>\n'+render(n.body,refs)+'</blockquote>\n';break;case 'list':{let tag=n.ordered?'ol':'ul';out+='<'+tag+(n.ordered&&n.start!==1?' start="'+n.start+'"':'')+'>\n';for(let item of n.items){let html=render(item.body,refs,!n.loose),check=item.task?'<input '+(item.checked?'checked="" ':'')+'disabled="" type="checkbox"> ':'';if(check&&n.loose&&html.startsWith('<p>'))html='<p>'+check+html.slice(3);else html=check+html;out+='<li>'+html+'</li>\n';}out+='</'+tag+'>\n';break;}case 'table':{out+='<table>\n<thead>\n<tr>\n';for(let i=0;i<n.header.length;i++)out+='<th'+(n.align[i]?' align="'+n.align[i]+'"':'')+'>'+inline(n.header[i],refs)+'</th>\n';out+='</tr>\n</thead>\n';if(n.rows.length){out+='<tbody>';for(let row of n.rows){out+='<tr>\n';for(let i=0;i<n.header.length;i++)out+='<td'+(n.align[i]?' align="'+n.align[i]+'"':'')+'>'+inline(row[i]||'',refs)+'</td>\n';out+='</tr>\n'}out+='</tbody>';}out+='</table>\n';break;}}}return out;}
export function parse(markdown){const refs=new Map();return render(blocks(markdown.replace(/\r\n?/g,'\n'),refs),refs);}
