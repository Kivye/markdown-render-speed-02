const named = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',copy:'©',reg:'®',trade:'™',hellip:'…',mdash:'—',ndash:'–',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”',laquo:'«',raquo:'»',bull:'•',euro:'€',pound:'£',yen:'¥',cent:'¢',sect:'§',para:'¶',deg:'°',plusmn:'±',times:'×',divide:'÷',micro:'µ',middot:'·',iexcl:'¡',iquest:'¿',Agrave:'À',Aacute:'Á',Acirc:'Â',Atilde:'Ã',Auml:'Ä',Aring:'Å',AElig:'Æ',Ccedil:'Ç',Egrave:'È',Eacute:'É',Ecirc:'Ê',Euml:'Ë',Igrave:'Ì',Iacute:'Í',Icirc:'Î',Iuml:'Ï',Ntilde:'Ñ',Ograve:'Ò',Oacute:'Ó',Ocirc:'Ô',Otilde:'Õ',Ouml:'Ö',Oslash:'Ø',Ugrave:'Ù',Uacute:'Ú',Ucirc:'Û',Uuml:'Ü',Yacute:'Ý',szlig:'ß',agrave:'à',aacute:'á',acirc:'â',atilde:'ã',auml:'ä',aring:'å',aelig:'æ',ccedil:'ç',egrave:'è',eacute:'é',ecirc:'ê',euml:'ë',igrave:'ì',iacute:'í',icirc:'î',iuml:'ï',ntilde:'ñ',ograve:'ò',oacute:'ó',ocirc:'ô',otilde:'õ',ouml:'ö',oslash:'ø',ugrave:'ù',uacute:'ú',ucirc:'û',uuml:'ü',yacute:'ý',yuml:'ÿ'};
const escapeChars = {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'};
const escapePattern = /[&<>"']/g;
const escapeChar = c => escapeChars[c];
const escapeTest = /[&<>"']/;
const esc = s => { s = String(s); return escapeTest.test(s) ? s.replace(escapePattern, escapeChar) : s; };
const attr = s => esc(s).replace(/&amp;((?:#(?:x[\da-f]+|\d+)|[a-z][\da-z]*);)/gi, '&$1');
const urlAttr = s => { try { return attr(encodeURI(s).replace(/%25/g, '%').replace(/\\/g, '%5C')); } catch { return attr(s); } };
let refs = Object.create(null);
let rawAnchor = false;

function expandTabs(s) {
  if (!s.includes("\t")) return s;
  let token=null, indent=0, inTable=false, listColumn=0, firstBody=false, listColumns=[];
  return s.split('\n').map(line=>{
    if (/^[ \t]*$/.test(line)) { inTable=false; return line; }
    if (!token && /^ {0,3}<table(?:\s|>)/i.test(line)) inTable=true;
    if(inTable) return line;
    // List extraction still needs visual columns; standalone code keeps content tabs.
    const visual=line.replace(/^[ \t]*/, lead=>{let col=0;for(const c of lead)col+=c==='\t'?4-col%4:1;return ' '.repeat(col);});
    const marker=visual.match(/^( {0,3})(?:[-+*]|\d+[.)]) +/);
    if(!token){
      // Leaving a nested list restores its enclosing content column.
      if(marker){
        listColumn=marker[0].length;
        listColumns=listColumns.filter(c=>c<listColumn);
        listColumns.push(listColumn);
      }else{
        const col=visual.search(/\S/);
        listColumns=listColumns.filter(c=>c<=col);
        listColumn=listColumns.at(-1)||0;
      }
    }
    let f=line.match(/^( *)(`{3,}|~{3,})(.*)$/);
    // Backticks in info and standalone indented code cannot open a fence.
    if(f && (f[2][0]==='`' && f[3].includes('`') || f[1].length>3 && !listColumn)) f=null;
    // An unindented first body line ends the enclosing list's fence context.
    if(token && firstBody && listColumn && visual.search(/\S/)<listColumn) { token=null; listColumn=0; listColumns=[]; }
    firstBody=false;
    if(token){
      let col=0;
      if(indent>0)line=line.replace(/^[ \t]*/,lead=>{let r='';for(const c of lead){const n=c==='\t'?4-col%4:1;r+=c==='\t'&&listColumn?' '.repeat(n):c;col+=n;}return r;});
      // A deeper indented fence is literal content of this container.
      if(new RegExp('^ {0,'+Math.max(indent,listColumn+3)+'}'+token[0]+'{'+token.length+',}\\s*$').test(line))token=null;
      return line;
    }
    if(f){token=f[2];indent=f[1].length;firstBody=true;return line;}
    const lead=line.match(/^[ \t]*(?:(?:>|[-+*]|\d+[.)])[ \t]*)*/)[0];let col=0,r='';
    for(const c of lead){if(c==='>')col=0;const n=c==='\t'?4-col%4:1;r+=c==='\t'&&!(col>=4&&(/^ {4}/.test(line)||!listColumn&&/^\t/.test(line))&&! /^[ \t]*(?:>|[-+*]|\d+[.)])/.test(line))?' '.repeat(n):c;col+=n;}
    return r+line.slice(lead.length);
  }).join('\n');
}

function labelEnd(s, start) {
  let depth=1;
  for(let j=start;j<s.length;j++){
    if(s[j]==='\\'){j++;continue;}
    if(s[j]==='`') {
      // Prefer an exact closing run within the label; embedded shorter runs
      // are code content. Keep the existing fallback for unmatched labels.
      let e=j; while(s[e]==='`') e++;
      const mark=s.slice(j,e); let k=e;
      while((k=s.indexOf(mark,k))>=0) {
        if(s[k-1]!=='`' && s[k+mark.length]!=='`') break;
        k+=mark.length;
      }
      if(k>=0 && k<s.indexOf(']',e)) { j=k+mark.length-1; continue; }
      const m=s.slice(j).match(/^`+[^`]*?`+/);
      if(m) { j+=m[0].length-1; continue; }
    }
    if(s[j]==='<'){const m=s.slice(j).match(/^(?:<[^>]*>|<!--[\s\S]*?-->)/);if(m){j+=m[0].length-1;continue;}}
    if(s[j]==='[')depth++;if(s[j]===']'&&!--depth)return j;
  }
  return -1;
}

function emphasisPlan(s) {
  const runs = [], stack = [];
  // Without delimiters there is no emphasis plan to build.
  if (!/[*_~]/.test(s)) return new Map();
  // Mask code across the whole source before links hide their label text.
  // A backtick run inside a label can pair with a later run outside it.
  const codeMask = new Uint8Array(s.length);
  const codeBoundary = /[\\`]/g;
  for (let pos = 0; pos < s.length; pos++) {
    codeBoundary.lastIndex = pos;
    const nextCode = codeBoundary.exec(s);
    if (!nextCode) break;
    pos = nextCode.index;
    if (s[pos] === '\\') { pos++; continue; }
    if (s[pos] !== '`') continue;
    let end = pos;
    while (s[end] === '`') end++;
    const marker = s.slice(pos, end);
    let close = end;
    while ((close = s.indexOf(marker, close)) >= 0) {
      if (s[close - 1] !== '`' && s[close + marker.length] !== '`') break;
      close += marker.length;
    }
    if (close >= 0) { codeMask.fill(1, pos, close + marker.length); pos = close + marker.length - 1; }
    else pos = end - 1;
  }
  const ws = c => !c || /\s/u.test(c);
  const punct = c => !!c && /[\p{P}\p{S}]/u.test(c);
  const planBoundary = /[\\`<\[!*_~]/g;
  for (let i = 0; i < s.length;) {
    planBoundary.lastIndex = i;
    const next = planBoundary.exec(s);
    if (!next) break;
    i = next.index;
    if (s[i] === '\\') { i += 2; continue; }
    if (s[i] === '`') { let j=i; while(s[j]==='`')j++; const mark=s.slice(i,j); let k=j; while((k=s.indexOf(mark,k))>=0){if(s[k-1]!=='`'&&s[k+mark.length]!=='`')break;k+=mark.length;} i=k<0?j:k+mark.length; continue; }
    if(s[i]==='<'){const h=s.slice(i).match(/^<[^>]*>/);if(h){i+=h[0].length;continue;}}
    if(s[i]==='[' || s[i]==='!'&&s[i+1]==='['){const start=i+(s[i]==='!'?2:1),end=labelEnd(s,start);if(end>=0){const suffix=s.slice(end+1).match(/^(?:\((?:\\.|[^\n])*?\)|\[[^\]]*\])/);const key=s.slice(start,end).trim().replace(/\s+/g,' ').toLowerCase();if(((suffix?.[0].startsWith('(')||refs[(suffix?.[0].slice(1,-1)||key).toLowerCase()])||refs[key])&&!/(?<!!)\[/.test(s.slice(start,end))){i=end+1+(suffix?.[0].length||0);continue;}}}
    if (codeMask[i]) { i++; continue; }
    if (s[i] !== '*' && s[i] !== '_' && s[i] !== '~') { i++; continue; }
    let j=i; while(s[j]===s[i])j++;
    const before=s[i-1], after=s[j];
    const left=!ws(after)&&(!punct(after)||ws(before)||punct(before));
    const right=!ws(before)&&(!punct(before)||ws(after)||punct(after));
    if(s[i]==='~' && j-i>2){i=j;continue;}
    const r={i,n:j-i,left:j-i,c:s[i],open:left&&(s[i]!=='_'||!right||punct(before)),close:right&&(s[i]!=='_'||!left||punct(after)),start:'',end:''};
    if(r.close) {
      for(let k=stack.length-1;k>=0 && r.left;k--) {
        const o=stack[k];
        if(o.c!==r.c || !o.left)continue;
        if(o.c==='~' && o.n!==r.n)continue;
        if(o.c==='*' && o.left===1 && r.left===2 && stack.slice(0,k).some(v=>v.c===o.c&&v.left===2) && runs.some(v=>v.i>o.i&&v.n===2&&v.start==='</strong>'))continue;
        if(o.c!=='~' && o.left===2 && r.left===1 && runs.some(v=>v.i>o.i&&v.c===o.c&&(v.n===1&&!v.left||v.n===2&&v.start==='</strong>')) && s.slice(j).includes(o.c+o.c))continue;
        if(o.c!=='~' && (o.close||r.open) && (o.left+r.left)%3===0 && (o.left%3!==0||r.left%3!==0))continue;
        if(o.c==='*' && o.n===1 && r.n===1 && runs.some((v,idx)=>v.i>o.i&&v.c===o.c&&v.n===2&&v.close&&v.open&&v.start==='</strong>'&&runs.slice(0,idx).some(w=>w.i>o.i&&w.n===2&&w.end==='<strong>'&&!w.close)))continue;
        // Nested emphasis leaves an unmatched leading star inside this closer.
        if (o.c==='*' && o.n===2 && o.left===2 && r.left===3 && !stack.slice(0,k).some(v=>v.c==='*' && v.left) && runs.some(v=>v.i>o.i && v.start==='</em>')) { r.left=2; r.start='*'; }
        while(o.left && r.left) {
          const n=o.left>=2&&r.left>=2?2:1, tag=o.c==='~'?'del':n===2?'strong':'em';
          o.left-=n;r.left-=n;o.end='<'+tag+'>'+o.end;r.start+='</'+tag+'>';
        }
        stack.splice(k+1);
        if(!o.left)stack.splice(k,1);
      }
    }
    if(r.open&&r.left)stack.push(r);
    runs.push(r);i=j;
  }
  return new Map(runs.map(r=>[r.i,{length:r.n,html:r.start+r.c.repeat(r.left)+r.end}]));
}

function inline(s, inLink = false, bracketOnly = false) {
  // Plain labels and cells need escaping but no inline syntax machinery.
  if (!/[&\\`<\[!~*_\n@]|mailto:|xmpp:|https?:\/\/|www\./i.test(s)) return esc(s);
  let out = '', i = 0;
  let emphasis = emphasisPlan(s);
  // Stop literal runs at every syntax or autolink candidate.
  const literalBoundary = s.includes('@')
    ? /[&\\`<\[!~*_\n]| +\n|(?:mailto:|xmpp:|https?:\/\/|www\.)|[a-z0-9._+-]+@/gi
    : /[&\\`<\[!~*_\n]| +\n|(?:mailto:|xmpp:|https?:\/\/|www\.)/gi;

  const plain = v => esc(v.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z][\da-z]+);/gi, (m, e) => {
    if (e[0] !== '#') return named[e] ?? m;
    const n = e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1);
    if (!n || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return '�';
    const windows = {128:8364,130:8218,131:402,132:8222,133:8230,134:8224,135:8225,136:710,137:8240,138:352,139:8249,140:338,142:381,145:8216,146:8217,147:8220,148:8221,149:8226,150:8211,151:8212,152:732,153:8482,154:353,155:8250,156:339,158:382,159:376};
    try { return String.fromCodePoint(windows[n] || n); } catch { return '�'; }
  }));
  while (i < s.length) {
    literalBoundary.lastIndex = i;
    const nextLiteral = literalBoundary.exec(s);
    const literalEnd = nextLiteral ? nextLiteral.index : s.length;
    if (literalEnd > i) { out += esc(s.slice(i, literalEnd)); i = literalEnd; }
    if (i === s.length) break;
    // Recover simple deletion spans missed by the shared delimiter plan.
    if (s[i] === '~' && s[i - 1] !== '~' && s[i + 2] !== '~'
        && (!emphasis.has(i) || !emphasis.get(i).html.includes('<del>'))) {
      const del = s.slice(i).match(/^(~~)(?=\S)([^~\n]*?\S)\1(?!~)/);
      if (del) {
        out += '<del>' + inline(del[2], inLink) + '</del>';
        i += del[0].length;
        continue;
      }
    }
    const entity = s[i] === '&' && s.slice(i).match(/^&(?:#(?:x[\da-f]+|\d+)|[a-z][\da-z]*);/i);
    if (entity) {
      const body = entity[0].slice(1, -1);
      if (body[0] !== '#') out += entity[0];
      else {
        const value = /^#x/i.test(body) ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        out += value > 0x10ffff ? '&amp;' + body + ';' : plain(entity[0]);
      }
      i += entity[0].length; continue;
    }
    const badNumeric = s[i] === '&' && s.slice(i).match(/^&#(?:x[\da-f]*|\d*);/i);
    if (badNumeric) { out += '&amp;' + badNumeric[0].slice(1); i += badNumeric[0].length; continue; }
    if (s[i] === '\\' && i + 1 < s.length) {
      if (s[i + 1] === '\n') { out += '<br>'; i += 2; while(s[i] === ' ') i++; continue; }
      if (/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(s[i + 1])) { out += esc(s[i + 1]); i += 2; continue; }
    }
    if (s[i] === '`') {
      let j = i; while (s[j] === '`') j++;
      const mark = s.slice(i, j); let k = j; while ((k = s.indexOf(mark, k)) >= 0) { if (s[k - 1] !== '`' && s[k + mark.length] !== '`') break; k += mark.length; }
      if (k < 0) { out += mark; i=j; continue; }
      if (k >= 0) { let v = s.slice(j, k).replace(/\n/g, ' '); if (/^ .* $/.test(v) && /[^ ]/.test(v)) v = v.slice(1, -1); out += '<code>' + esc(v) + '</code>'; i = k + mark.length; if((s[i]==='_'||s[i]==='*')&&!emphasis.has(i)) for(const [at,e] of emphasisPlan('!'+s.slice(i))) if(!emphasis.has(at+i-1)) emphasis.set(at+i-1,e); continue; }
    }
    if (s[i] === '<') {
      const k = s.indexOf('>', i + 1), v = k >= 0 ? s.slice(i + 1, k) : '';
      if (!bracketOnly && k >= 0 && /^[a-z][a-z0-9+.-]{1,31}:[^\s<>]*$/i.test(v)) { out += '<a href="' + urlAttr(v) + '">' + esc(v) + '</a>'; i = k + 1; continue; }
      if (!bracketOnly && k >= 0 && /^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i.test(v)) { out += '<a href="mailto:' + esc(v) + '">' + esc(v) + '</a>'; i = k + 1; continue; }
      const html = s.slice(i).match(/^(?:<!--(?:>|->|[\s\S]*?(?:-->|$))|<\?[\s\S]*?\?>|<![A-Z][\s\S]*?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/[a-z][\w-]*\s*>|<[a-z][\w-]*(?:\s+[a-z_:][\w.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>)/i);
      if (html) { if (/^<a(?:\s|>)/i.test(html[0])) rawAnchor = true; else if (/^<\/a\s*>/i.test(html[0])) rawAnchor = false; out += html[0]; i += html[0].length; continue; }
    }
    // Balanced brackets and parentheses allow images in links and nested destinations.
    const image = s[i] === '!' && s[i + 1] === '[';
    const labelStart = i + (image ? 2 : 1);
    if (s[i] === '[' || image) {
      const j = labelEnd(s,labelStart);
      if (s[j] === ']' && s[j + 1] === '(') {
        let k = j + 2; while (/[ \t\n\r]/.test(s[k] || '') && k < s.length) k++;
        let url = '', title = '', valid = true;
        // Nested-backtick labels cannot use angle destinations or parenthesized titles.
        const nestedCodeLabel = [...s.slice(labelStart, j).matchAll(/(?<!`)(`{2,})(?!`)([\s\S]*?)(?<!`)\1(?!`)/g)].some(m => m[2].includes('`'));
        if (s[k] === '<' && nestedCodeLabel) valid = false;
        if (s[k] === '<') {
          const end = s.indexOf('>', k + 1);
          if (end < 0 || /[\n<>]/.test(s.slice(k+1, end)) || s[end-1]==='\\') valid = false;
          else { url = s.slice(k + 1, end); k = end + 1; }
        } else {
          let balance = 0;
          while (k < s.length) {
            const c = s[k];
            if (c === '\\' && k + 1 < s.length) { url += s.slice(k, k + 2); k += 2; continue; }
            if (c === '(') balance++;
            if (c === ')') { if (!balance || s[k+1] === ']') break; balance--; }
            if (/[ \t\n\r]/.test(c)) break;
            url += c; k++;
          }
          if (balance) valid = false;
        }
        const gap = k; while (/[ \t\n\r]/.test(s[k] || '') && k < s.length) k++;
        if (k > gap && /["'(]/.test(s[k] || '') && s[k]) {
          if (s[k] === '(' && nestedCodeLabel) valid = false;
          const close = s[k] === '(' ? ')' : s[k]; let end = ++k;
          while (end < s.length && s[end] !== close) { if (s[end] === '\\') end++; end++; }
          title = s.slice(k, end); k = end + 1;
          while (/[ \t\n\r]/.test(s[k] || '') && k < s.length) k++;
        }
        if (nestedCodeLabel && [...s.slice(labelStart,j).matchAll(/(?<!`)(`{2,})(?!`)([\s\S]*?)(?<!`)\1(?!`)/g)].some(m=>m[2].includes('`') && s.slice(labelStart,j).slice(m.index+m[0].length).trim())) valid = false;
        if (valid && s[k] === ')' && (image || !/<a /.test(inline(s.slice(labelStart,j).replace(/<[^>]*>/g,''), true, true)))) {
          const unescape = v => v.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1');
          const label = s.slice(labelStart, j), t = title ? ' title="' + attr(unescape(title)) + '"' : '';
          out += image ? '<img src="' + urlAttr(unescape(url)) + '" alt="' + inline(label).replace(/<img[^>]*alt="([^"]*)"[^>]*>/g, '$1').replace(/<[^>]*>/g, '') + '"' + t + '>' : '<a href="' + urlAttr(unescape(url)) + '"' + t + '>' + inline(label, true) + '</a>';
          i = k + 1; continue;
        }
      }
    }
    let ref=null;
    if(s[i]==='['||image){const j=labelEnd(s,labelStart);if(j>=0){const suffix=s.slice(j+1).match(/^\[((?:\\.|[^\[\]\\])*)\]/);const label=s.slice(labelStart,j);ref=[s.slice(i,j+1)+(suffix?.[0]||''),image?'!':'',label,suffix?.[1]];if(!image&&(/<a /.test(inline(label.replace(/<[^>]*>/g,''), true, true)) || [...label.matchAll(/(?<!`)(`{2,})(?!`)([\s\S]*?)(?<!`)\1(?!`)/g)].some(m=>m[2].includes('`') && label.slice(m.index+m[0].length).trim())))ref=null;}}
    if (ref) {
      const key = (ref[3] || ref[2]).trim().replace(/\s+/g, ' ').toLowerCase().replace(/ß/g,'ss'), target = refs[key];
      if (target) {
        const title = target.title ? ' title="' + attr(target.title) + '"' : '';
        out += ref[1] ? '<img src="' + urlAttr(target.url) + '" alt="' + inline(ref[2]).replace(/<[^>]*>/g, '') + '"' + title + '>' : '<a href="' + urlAttr(target.url) + '"' + title + '>' + inline(ref[2], true) + '</a>';
        i += ref[0].length; continue;
      }
    }
    const protocol = (s[i] === 'm' || s[i] === 'M' || s[i] === 'x' || s[i] === 'X') && s.slice(i).match(/^(?:mailto:[^\s<>/]+|xmpp:[^\s<>/]+(?:\/[^\s<>/]*)?)/i);
    if(protocol && /[-_]$/.test(protocol[0])){out+=esc(protocol[0]);i+=protocol[0].length;continue;}
    if(protocol && !inLink && !rawAnchor){let v=protocol[0].replace(/[.,!?;:]+$/,'');out+='<a href="'+esc(v)+'">'+esc(v)+'</a>';i+=v.length;continue;}
    const auto = (s[i] === 'h' || s[i] === 'H' || s[i] === 'w' || s[i] === 'W') && s.slice(i).match(/^(https?:\/\/[^\s<>]+|www\.[^\s<>]+)/i);
    if (auto && !/^Www\./.test(auto[0]) && !inLink && !rawAnchor && !/[\w/]/.test(s[i - 1] || '')) {
      let v = auto[0].replace(/\([^)]*$/, '');
      v = v.replace(/&[a-z0-9]+;$/i, '');
      while (/[.,!?;:*_~]$/.test(v) || v.endsWith(')') && (()=>{let depth=0;for(let n=v.length-1;n>=0;n--){if(v[n]===')')depth++;else if(v[n]==='('&&!--depth)return false;}return true;})()) v = v.slice(0, -1);
      out += '<a href="' + urlAttr(v.startsWith('www.') ? 'http://' + v : v) + '">' + esc(v) + '</a>'; i += v.length; continue;
    }
    const email = !inLink && !rawAnchor && !/[\w.+-]/.test(s[i - 1] || '') && s.slice(i).match(/^[a-z0-9._+-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+/i);
    if (email && !inLink && !rawAnchor && !/[-_]/.test(s[i+email[0].length]||'!') && !/[\w.+-]/.test(s[i - 1] || '')) { const v = email[0]; out += '<a href="mailto:' + esc(v) + '">' + esc(v) + '</a>'; i += v.length; continue; }
    if (s[i] === ' ' && /^ +\n/.test(s.slice(i)) && /^ {2,}\n/.test(s.slice(i))) { const n = s.slice(i).match(/^ +/)[0].length; out += '<br>'; i += n + 1; while(s[i] === ' ') i++; continue; }
    if (emphasis.has(i)) { const e=emphasis.get(i); out+=e.html; i+=e.length; continue; }
    out += escapeChars[s[i]] || s[i]; i++;
  }
  // Revisit formatted text after delimiter removal; link labels stay protected.
  // Apply this only to the contents of formatting spans; top-level prose remains literal.
  if (!inLink && (out.includes('@') || /https?:\/\//i.test(out))) {
    out = out.replace(/<(strong|em)>((?:(?!<\/\1>)[\s\S])*?)<\/\1>/g, (all, tag, body, offset) => {
      // A formatting span may have been rendered inside an outer link label.
      const anchors = out.slice(0, offset).match(/<\/?a\b[^>]*>/gi) || [];
      if (anchors.reduce((depth, token) => depth + (token[1] === "/" ? -1 : 1), 0) > 0) return all;
      const bits = body.split(/(<[^>]+>)/);
      for (let q=0;q<bits.length;q+=2) {
        if (q && /^<a\b/i.test(bits[q-1])) continue;
        // A closing underscore can suppress the preceding email match.
        if (tag === 'em' && (q !== bits.length - 1 || !/@[a-z0-9.-]+$/i.test(bits[q]))) continue;
        bits[q] = bits[q].replace(/(^|[^\w.+-:])([a-z0-9._+-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)(?![-_\w.+-])/ig, '$1<a href="mailto:$2">$2</a>');
        if (tag === 'strong') bits[q] = bits[q].replace(/(^|[^\w/<>\"])(https?:\/\/[^\s<>]+)/ig, (m,p,v)=>p+'<a href="'+urlAttr(v)+'">'+v+'</a>');
      }
      body=bits.join('');
      return '<'+tag+'>'+body+'</'+tag+'>';
    });
  }
  return out;
}

export function parse(markdown) {
  rawAnchor = false;
  const src = expandTabs(String(markdown).replace(/\r\n?/g, '\n'));
  const lines = src.split('\n');
  if (lines.at(-1) === '') lines.pop();
  refs = Object.create(null);
  const unescapeRef = v => v?.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1');
  const refKey = v => v.trim().replace(/\s+/g, ' ').toLowerCase().replace(/ß/g,'ss');
  function collect(lines) {
  let inFence = null, paragraph = false, listIndent = 0, fenceListIndent = 0;
  for (let i = 0; i < lines.length; i++) {
    let fm = lines[i].match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fm && fm[1][0] === '`' && fm[2].includes('`')) fm = null;
    if (inFence && fenceListIndent && /^ {0,3}(`{3,}|~{3,})/.test(lines[i-1] || '') && lines[i].trim() && lines[i].search(/\S/) < fenceListIndent) {
      inFence = null; listIndent = 0; fenceListIndent = 0;
    }
    if (inFence) { if (new RegExp('^ {0,3}' + inFence[0] + '{' + inFence.length + ',}\\s*$').test(lines[i])) inFence=null; continue; }
    if (fm) { inFence=fm[1]; fenceListIndent=listIndent && lines[i].search(/\S/) >= listIndent ? listIndent : 0; paragraph=false; continue; }
    const listStart = lines[i].match(/^( {0,3})([-+*]|\d{1,9}[.)])( +)/);
    if(listStart) listIndent=listStart[0].length;
    else if(lines[i].trim() && lines[i].search(/\S/) < listIndent) listIndent=0;
    if (/^ {0,3}>/.test(lines[i])) {
      let end=i; const q=[]; const prefixes=[];
      while(end<lines.length && /^ {0,3}>/.test(lines[end])) { prefixes.push(lines[end].match(/^ {0,3}> ?/)[0]); q.push(lines[end++].replace(/^ {0,3}> ?/,'')); }
      collect(q); if(!q.length)q.push(''); lines.splice(i,end-i,...q.map((v,k)=>(prefixes[k]||prefixes[0])+v)); i+=q.length-1; paragraph=false; continue;
    }
    if (!lines[i].trim()) { paragraph=false; continue; }
    if (paragraph) { if (/^ {0,3}(?:#{1,6} |[-*+] |\d+[.)] |<)/.test(lines[i])) paragraph=false; else continue; }
    let labelEnd=i, candidate=lines[i];
    if (/^ {0,3}\[/.test(candidate)) while(!candidate.includes(']:') && labelEnd+1<lines.length && lines[labelEnd+1].trim()) candidate+='\n'+lines[++labelEnd];
    const start = candidate.match(/^ {0,3}\[((?:\\.|[^\]\\])+)\]:[ \t]*([^]*)$/);
    if (!start || !start[1].trim() || /(?<!\\)\[/.test(start[1])) { paragraph=!/^ {0,3}(?:#|<|[-*+] |\d+[.)] )/.test(lines[i]); continue; }
    let j = labelEnd, rest = start[2];
    if (!rest && j + 1 < lines.length && lines[j + 1].trim()) rest = lines[++j].trim();
    const dest = rest.match(/^(?:<([^<>\n]*)>|((?:\\.|[^\s])+))(.*)$/);
    if (!dest) continue;
    if (dest[3] && !/^[ \t]/.test(dest[3])) continue;
    let tail = dest[3].trim(), title, end = j;
    if (!tail && lines[j + 1]?.trim().match(/^["'(]/)) { tail = lines[j + 1].trim(); end = j + 1; }
    if (tail) {
      const quote = tail[0], close = quote === '(' ? ')' : quote;
      if (!'"\'('.includes(quote)) continue;
      while (!tail.slice(1).includes(close) && end + 1 < lines.length && lines[end + 1].trim()) tail += '\n' + lines[++end];
      if (!tail.endsWith(close)) { if (end > j) { end = j; tail = ''; } else continue; }
      if (tail) title = tail.slice(1, -1);
    }
    const key = refKey(start[1]);
    if (!refs[key]) refs[key] = {url: unescapeRef(dest[1] ?? dest[2]), title: unescapeRef(title)};
    lines.splice(i, end - i + 1); i--;
  }
  }
  collect(lines);
  const blank = x => /^[ \t]*$/.test(x);
  const isHr = x => /^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(x);
  const blockTags = /^(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)$/i;
  function htmlType(line) {
    let first = 0;
    while (first < 3 && line.charCodeAt(first) === 32) first++;
    if (line.charCodeAt(first) !== 60) return 0;
    const v = line.replace(/^ {0,3}/, '');
    if (/^<(script|pre|style|textarea)(?:\s|>|$)/i.test(v)) return 1;
    if (v.startsWith('<!--')) return 2;
    if (v.startsWith('<?')) return 3;
    if (/^<![A-Z]/.test(v)) return 4;
    if (v.startsWith('<![CDATA[')) return 5;
    const tag = v.match(/^<\/?([a-z][\w-]*)(?:\s|\/?>|$)/i);
    if (tag && blockTags.test(tag[1])) return 6;
    if (/^<\/[a-z][\w-]*\s*>\s*$/i.test(v)) return 7;
    if (/^<[a-z][\w-]*(?:\s+[a-z_:][\w.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>\s*$/i.test(v)) return 7;
    return 0;
  }
  const fence = x => { const m = x.match(/^ {0,3}(`{3,}|~{3,})(.*)$/); return m && !(m[1][0] === '`' && m[2].includes('`')) ? m : null; };
      const listMark = x => x.match(/^( {0,3})([-+*]|\d{1,9}[.)])(?:[ \t]+(.*)|$)/);
  function tightItem(html) {
    let depth=0;
    return html.replace(/<\/?(?:p|blockquote|ul|ol|li)(?: [^>]*)?>\n?/g, token => {
      const close=token.startsWith('</'), tag=token.match(/^<\/?(\w+)/)[1];
      if(tag==='p') return depth===0?'':token;
      if(close)depth--;else depth++;
      return token;
    }).replace(/(?<!<\/p>)\n(?=<(?:ul|ol)(?: |>))/g,'');
  }
  function quoteAllowsLazy(q) {
    let active = null, paragraph = false;
    for (const line of q) {
      if (active) {
        if (new RegExp('^ {0,3}' + active[0] + '{' + active.length + ',}\\s*$').test(line)) active = null;
        continue;
      }
      const marker = fence(line);
      if (marker) { active = marker[1]; paragraph = false; }
      else if (blank(line)) paragraph = false;
      else if (!/^ {4}/.test(line)) paragraph = true;
    }
    return !active && paragraph;
  }
  function render(a, nested = false, inList = false, inQuote = false) {
    let out = '', i = 0;
    while (i < a.length) {
      const l = a[i];
      if (blank(l)) { i++; continue; }
      const ht = htmlType(l);
      if (ht) {
        const tag = l.match(/<(script|pre|style|textarea)/i);
        const end = ht === 1 ? new RegExp('</' + tag[1] + '\\s*>', 'i') : ht === 2 ? /-->/ : ht === 3 ? /\?>/ : ht === 4 ? />/ : ht === 5 ? /\]\]>/ : null;
        const raw = [];
        do { raw.push(a[i++]); } while (i < a.length && (end ? !end.test(raw.at(-1)) : !blank(a[i])));
        out += raw.join('\n') + (nested && !(end && i < a.length && !blank(a[i])) || i < a.length && blank(a[i]) && !(end && /^[ \t]+$/.test(a[i])) || i===a.length&&!src.endsWith('\n') ? '' : '\n');
        continue;
      }
      let m = l.match(/^ {0,3}(#{1,6})(?:[ \t]+|$)(.*?)(?:[ \t]+#+[ \t]*|[ \t]*)$/);
      if (m) { const n = m[1].length; out += `<h${n}>${inline(m[2].replace(/^#+[ \t]*$/, ''))}</h${n}>\n`; i++; continue; }
      m = fence(l);
      if (m) {
        // Only backtick fences compensate indentation after container removal.
        const fenceIndent = m[1][0] === '`' ? l.match(/^ */)[0].length : 0;
        const token = m[1], ch = token[0], n = token.length, code = [], info = m[2].trim().split(/\s+/)[0]?.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1'); i++;
        const closingFence = new RegExp('^ {0,3}' + ch + '{' + n + ',}\\s*$');
        while (i < a.length && !closingFence.test(a[i])) {
          const v = a[i++];
          let pos = 0, col = 0;
          // A tab crossing the stripped indentation boundary is consumed whole.
          while (pos < v.length && col < fenceIndent && (v[pos] === ' ' || v[pos] === '\t')) {
            col += v[pos] === '\t' ? 4 - col % 4 : 1;
            pos++;
          }
          code.push(v.slice(pos));
        }
        if (i < a.length) i++;
        if(code.length && code.at(-1)==='')code.pop();
        out += '<pre><code' + (info ? ' class="language-' + attr(info) + '"' : '') + '>' + esc(code.join('\n')) + (code.length ? '\n' : '') + '</code></pre>\n'; continue;
      }
      if (/^ {0,3}>/.test(l)) {
        const q = [];
        while (i < a.length && (/^ {0,3}>/.test(a[i]) || (q.length && !(htmlType(a[i]) && htmlType(a[i]) !== 7) && !blank(a[i]) && !isHr(a[i]) && !listMark(a[i]) && quoteAllowsLazy(q) && !blank(q.at(-1)) && !/^ {0,3}(?:#|`{3,}|~{3,})/.test(a[i])))) {
          const quoted = /^ {0,3}>/.test(a[i]);
          let v = a[i++].replace(/^ {0,3}> ?/, '');
          if (!quoted && /^ {0,3}=+\s*$/.test(v)) v = '    ' + v;
          if (/^\t/.test(v)) v = v.replace(/^\t+/, tabs => ' '.repeat(tabs.length * 4));
          q.push(v);
        }
        out += '<blockquote>\n' + render(q, true, false, true) + '</blockquote>\n'; continue;
      }
      if (isHr(l)) { out += '<hr>\n'; i++; continue; }
      // Split escaped pipes before inline rendering, including pipes inside code spans.
      const splitCells = x => {
        const cells = []; let cell = '';
        x = x.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '');
        for (let k = 0; k < x.length; k++) {
          if (x[k] === '\\' && x[k + 1] === '|') { cell += '|'; k++; }
          else if (x[k] === '|') { cells.push(cell.trim()); cell = ''; }
          else cell += x[k];
        }
        cells.push(cell.trim()); return cells;
      };
      const delimiters = l.includes('|') && i + 1 < a.length ? splitCells(a[i + 1]) : [];
      if (/\|/.test(l) && delimiters.length && delimiters.every(v => /^:?-+:?$/.test(v)) && splitCells(l).length === delimiters.length) {
        const heads = splitCells(l), aligns = delimiters.map(v => v.startsWith(':') && v.endsWith(':') ? 'center' : v.startsWith(':') ? 'left' : v.endsWith(':') ? 'right' : null);
        const cell = (tag, v, idx) => '<' + tag + (aligns[idx] ? ' align="' + aligns[idx] + '"' : '') + '>' + inline(v) + '</' + tag + '>\n';
        out += '<table>\n<thead>\n<tr>\n'; heads.forEach((v, idx) => { out += cell('th', v, idx); });
        out += '</tr>\n</thead>\n'; i += 2;
        let body = '';
        while (i < a.length && !/^ *$/.test(a[i]) && !listMark(a[i]) && !isHr(a[i]) && !htmlType(a[i]) && !/^ {0,3}(?:>|#|`{3,}|~{3,})/.test(a[i])) {
          const vals = splitCells(a[i]); body += '<tr>\n'; heads.forEach((_, idx) => { body += cell('td', vals[idx] || '', idx); }); body += '</tr>\n'; i++;
        }
        if (body) out += '<tbody>' + body + '</tbody>';
        out += '</table>\n'; continue;
      }
      m = listMark(l);
      if (m) {
        const ordered = /^\d/.test(m[2]), tag = ordered ? 'ol' : 'ul', items = []; let loose=false;
        while (i < a.length) {
          const first = listMark(a[i]); if (!first || isHr(a[i]) || /^\d/.test(first[2]) !== ordered || first[2].slice(-1)!==m[2].slice(-1)) break;
          const prefix = first[1].length + first[2].length;
          const spaces = (a[i].slice(prefix).match(/^ +/)?.[0].length||1);
          const padding = spaces > 4 ? 1 : spaces;
          const indent = prefix + padding, item = [a[i].slice(indent)]; i++;
          while (i < a.length) {
            // A fence starts a block, so its body cannot be a lazy list continuation.
            if (!blank(a[i]) && a[i].search(/\S/) < indent && (fence(item.at(-1)) || fence(a[i]))) break;
            if (blank(a[i])) {
              if(item.length===1&&!item[0].trim())break;
              // A blank line keeps following continuation text in this item;
              // it ends the item only when the next nonblank line is a sibling.
              let j = i;
              while (j < a.length && blank(a[j])) j++;
              if (j === a.length) { i = j; break; }
              const next = j < a.length ? listMark(a[j]) : null;
              if (next && next[1].length < indent) break;
              if(a[j].search(/\S/) < indent) break;
              item.push(''); i++;
              continue;
            }
            if ((isHr(a[i]) || /^ {0,3}>/.test(a[i])) && a[i].search(/\S/)<indent) break;
            const next = listMark(a[i]); if (next && next[1].length < indent) break;
            if (a[i].search(/\S/) < indent && /^ +(?:[-+*]|\d+[.)])\s/.test(a[i])) { item[item.length-1] += '\n' + a[i++].trimStart(); continue; }
            if (/^\t/.test(a[i])) item.push('    ' + a[i].slice(1));
            else if (/^\s/.test(a[i])) { let col=0; const v=a[i].replace(/^[ \t]*/, lead=>{let r='';for(const c of lead){const n=c==='\t'?4-col%4:1;r+=c==='\t'&&col<=indent?' '.repeat(n):c;col+=n;}return r;}); item.push(inQuote && v.search(/\S|$/)<indent && (spaces===1 || v.search(/\S|$/)<4)?v:!ordered && item[0].trim() && v.search(/\S|$/)<indent?v:v.slice(Math.min(indent,v.search(/\S|$/)))); }
            else item.push(a[i]); i++;
          }
          if(item[0]===''&&item.length>1)item.shift();
          const task = item[0].match(/^\[([ xX])\]\s+(.*)$/); if (task) item[0] = task[2];
          while(item.length>1 && blank(item.at(-1)))item.pop();
          let html = render(item, true, true, inQuote);
          let childIndent=null, codeFence=null;
          for(let k=0;k<item.length;k++){
            const f=fence(item[k]); if(f){codeFence=codeFence?null:f[1];continue;} if(codeFence)continue;
            const child=listMark(item[k]);if(child)childIndent=Math.min(childIndent??Infinity,child[1].length+child[2].length+1);
            if(blank(item[k])&&k>0){let j=k+1;while(j<item.length&&blank(item[j]))j++;if(j<item.length&&(childIndent===null||item[j].search(/\S/)<childIndent)&&!(listMark(item[j])&&childIndent!==null&&listMark(item[j])[1].length<childIndent&&listMark(item[j])[1].length>=childIndent-(listMark(item[j])[2].length+1)))loose=true;}
          }
          if (task) { const input = '<input ' + (task[1].toLowerCase() === 'x' ? 'checked="" ' : '') + 'disabled="" type="checkbox"> '; html = html.startsWith('<p>') ? '<p>' + input + html.slice(3) : input + html; }
          items.push(html);
          let after=i; while (after < a.length && blank(a[after])) after++;
          if(after>i && listMark(a[after]||'') && !isHr(a[after]) && /^\d/.test(listMark(a[after])[2])===ordered && listMark(a[after])[2].slice(-1)===m[2].slice(-1))loose=true;
          i=after;
        }
        const start = ordered ? parseInt(m[2], 10) : 1;
        out += '<' + tag + (ordered && start !== 1 ? ' start="' + start + '"' : '') + '>\n' + items.map(html=>'<li>'+(loose?html:tightItem(html))+'</li>\n').join('') + '</' + tag + '>\n'; continue;
      }
      if (/^ {4}/.test(l)) {
        const code = []; while (i < a.length && (/^ {4}/.test(a[i]) || blank(a[i]))) { code.push(a[i].slice(4)); i++; }
        while (code.at(-1) === '') code.pop(); out += '<pre><code>' + esc(code.join('\n')) + '\n</code></pre>\n'; continue;
      }
      let setext = -1;
      for (let j = i; j + 1 < a.length && !blank(a[j]) && !isHr(a[j]) && !/^ {0,3}(?:#{1,6}(?:\s|$)|>|(?:[-+*]|\d+[.)])\s|(?:`{3,}|~{3,}))/.test(a[j]); j++) {
        if (/^ {0,3}(?:=+|-+)\s*$/.test(a[j + 1])) { setext = j; break; }
      }
      if (setext >= i) {
        const level = a[setext + 1].trim()[0] === '=' ? 1 : 2;
        out += `<h${level}>${inline(a.slice(i, setext + 1).map(v => v.trim()).join('\n'))}</h${level}>\n`;
        i = setext + 2; continue;
      }
      if (i + 1 < a.length && /^ {0,3}(?:=+|-+)\s*$/.test(a[i + 1])) { const n = a[i + 1].trim()[0] === '=' ? 1 : 2; out += `<h${n}>${inline(l.trim())}</h${n}>\n`; i += 2; continue; }

      const p = [l]; i++;
      while (i < a.length && (!blank(a[i]) || nested && /^ +$/.test(a[i])) && !isHr(a[i]) && !(htmlType(a[i]) && htmlType(a[i]) !== 7) && !fence(a[i]) && !/^ {0,3}(?:#{1,6}(?:\s|$)|>|(?:[-+*]|1[.)])\s)/.test(a[i])) {
        if (i + 1 < a.length && /^ {0,3}(?:=+|-+)\s*$/.test(a[i + 1])) break;
        if(inList&&listMark(a[i]))break;
        p.push(inQuote && /^ {4,}(?:[-+*]|\d+[.)])\s/.test(a[i]) ? a[i++].trimStart() : a[i++]);
      }
      out += '<p>' + inline(p.join('\n')) + '</p>\n';
    }
    return out;
  }
  return render(lines);
}
