// 池袋ショー共通Webアプリ。会場・店舗データは map.json / shops.json から読込。
(() => {
'use strict';
const $=id=>document.getElementById(id);
const normalize=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/[\s\-_～〜・.,，、]/g,'');
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let shopData, mapData, shops=[], days=[], floors=[], day='', floor='2', view='map', selected=null, records={}, zoom=1, focusShopId=null;
let storeKey='';
const currentRecord=shop=>records[shop.id]||(records[shop.id]={fav:false,memo:'',orders:{},visited:{},pin:null});
const orderFor=shop=>Number(currentRecord(shop).orders?.[day]||0)||0;
const visitedFor=shop=>!!currentRecord(shop).visited?.[day];
function save(){try{localStorage.setItem(storeKey,JSON.stringify(records))}catch(err){message('このブラウザでは保存できないみたい。バックアップも試してね。')}}
function message(msg){const t=$('toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(message.timer);message.timer=setTimeout(()=>t.classList.add('hidden'),3800)}
function floorMeta(){return floors.find(f=>f.id===floor)}
function shopFloor(shop){return String(shop.floor)}
const normBooth=code=>String(code??'').normalize('NFKC').toUpperCase().replace(/[\sー－‐–-]/g,'');
function shopBooths(shop){
  const result=new Set((shop.booths||[]).map(normBooth));
  // Exhibition list can identify joint spaces as A・B15, corresponding to A15/B15.
  for(const b of [...result]){
    const m=b.match(/^([A-Z])(?:･|・|\.|\/)([A-Z])(\d+)$/);
    if(m){result.add(m[1]+m[3]);result.add(m[2]+m[3]);}
  }
  return result;
}
const shopsAt=(code,locFloor)=>shops.filter(s=>shopFloor(s)===locFloor&&shopBooths(s).has(normBooth(code)));
const boothSpots=()=>floorMeta()?.hotspots||[];
// 地図に実際の四角を描けるブースのみ「位置あり」と判定する。
function mappedSpotsFor(shop){
 if(!shop)return [];
 const codes=shopBooths(shop);
 const meta=floors.find(f=>f.id===shopFloor(shop));
 return (meta?.hotspots||[]).filter(h=>codes.has(normBooth(h.code))&&
  [h.x,h.y,h.w,h.h].every(v=>typeof v==='number'&&Number.isFinite(v))&&
  h.x>=0&&h.x<=1&&h.y>=0&&h.y<=1&&h.w>0&&h.h>0);
}

function findShop(id){return shops.find(s=>s.id===id)}
function match(s){const q=normalize($('search').value);return !q||normalize([s.name,s.boothText,s.area,`${s.floor}階`, ...(s.booths||[]),currentRecord(s).memo].join(' ')).includes(q)}
function listShops(){
 let base=shops.filter(s=>shopFloor(s)===floor&&match(s));
 if(view==='fav')base=base.filter(s=>currentRecord(s).fav);
 base.sort((a,b)=>{
  const ar=orderFor(a)||Infinity,br=orderFor(b)||Infinity;
  if(view==='fav'&&ar!==br)return ar-br;
  return a.name.localeCompare(b.name,'ja');
 });
 return base;
}
function changeView(next){view=next;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view===next));render()}
function switchFloor(next){floor=String(next);focusShopId=null;zoom=1;render()}
function switchDay(next){day=next;focusShopId=null;render()}
function renderTabs(){
 $('dayTabs').innerHTML=days.map(d=>`<button data-day="${esc(d.id)}" class="${day===d.id?'on':''}">${esc(d.label)}</button>`).join('');
 $('floorTabs').innerHTML=floors.map(f=>`<button data-floor="${esc(f.id)}" class="${floor===f.id?'on':''}">${esc(f.label)}</button>`).join('');
}
function render(){
 renderTabs();
 const map=view==='map';
 $('mapPanel').classList.toggle('hidden',!map);$('listPanel').classList.toggle('hidden',map);$('mapLegend').classList.toggle('hidden',!map);
 if(map){renderMap()}else{renderList()}
}
function renderList(){
 const list=listShops();
 $('resultsCount').textContent=`${days.find(d=>d.id===day)?.label||''}・${floor}階　該当 ${list.length}店舗（この階 ${shops.filter(s=>shopFloor(s)===floor).length}店舗）`;
 $('shopList').innerHTML=list.length?list.map(s=>{
  const r=currentRecord(s),n=orderFor(s),status=visitedFor(s)?' ・ ✓訪問済み':'';
  return `<button class="entry" data-shop-id="${esc(s.id)}"><span class="entryMain">${n?`<span class="listBadge" aria-label="訪問順 ${n}">${n}</span>`:''}<span class="entryText"><b>${r.fav?'★ ':''}${esc(s.name)}</b><small>第${s.hall}会場・エリア${esc(s.area||'')}${status}</small></span></span><span class="code">${esc(s.floor)}F ${esc(s.boothText)}</span></button>`;
 }).join(''):'<div class="nohits">該当するお店がないよ。日付・階を確認してね。</div>';
}
function applyZoom(){
 const meta=floorMeta(),scroll=$('mapScroll'),canvas=$('mapCanvas');
 if(!meta)return;
 const width=Math.max(260,scroll.clientWidth-2)*zoom;
 canvas.style.width=`${Math.round(width)}px`;
 canvas.style.aspectRatio=`${meta.imageSize[0]} / ${meta.imageSize[1]}`;
 $('zoomPercent').textContent=`${Math.round(zoom*100)}%`;
 $('zoomOut').disabled=zoom<=0.65;$('zoomIn').disabled=zoom>=4;
}
function renderQuickResults(){ /* 浅草版と同じシンプルな検索表示。候補のチップは出さない。 */ }
function renderMap(){
 const m=floorMeta();if(!m)return;
 $('officialMap').href=m.officialPage;
 $('resultsCount').textContent=`${days.find(d=>d.id===day)?.label||''}・${floor}階　登録 ${shops.filter(s=>shopFloor(s)===floor).length}店舗`;
 $('mapHint').classList.add('hidden');
 applyZoom();renderHotspots();renderQuickResults();
}

function venueDrawing(){
 // 会場の外形・通路などもブースと同じSVG内に図形として描画する。
 // ブースの塗り分けは同じrect要素のclassで行うため、画像への色重ねは不要。
 const base=(path,fill)=>`<path class="venueOutline" d="${path}" fill="${fill}"/>`;
 const text=(x,y,label,size=12,cls='venueLabel')=>`<text class="${cls}" x="${x}" y="${y}" font-size="${size}">${esc(label)}</text>`;
 const spot=(x,y,w,h,label,cls='venueBlock')=>`<g><rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2"/>${label?text(x+w/2,y+h/2+3,label,Math.min(10,h*.3),'venueBlockText'):''}</g>`;
 if(floor==='2'){
   const blocks=[];
   // 店舗位置と照合できない13〜97番は、押せない薄色の参考区画として示す。
   // 数字を割り当てないことで、誤ったブースへの位置案内を防ぐ。
   for(let r=0;r<9;r++)for(let c=0;c<5;c++)blocks.push(spot(151+c*24.4,760+r*21.0,23,18,'','venueUnmapped'));
   for(let r=0;r<10;r++)for(let c=0;c<4;c++)blocks.push(spot(318+c*25.2,759+r*18.5,24,16,'','venueUnmapped'));
   return `<g class="venueScenery">
     ${base('M110 84 H332 V58 H503 V988 H345 V953 H87 V741 H179 V715 H273 V487 H110 Z','#e7f2e2')}
     <path class="venueDash" d="M485 50 H525 V991 H505 M94 738 H182 M272 437 H522"/>
     ${text(25,80,'2F',50,'venueFloorNo')}${text(97,70,'第1会場',21,'venueTitle')}
     ${spot(248,497,26,91,'メインショップ','venueInfo')}${spot(249,630,27,85,'受付','venueInfo')}
     ${text(160,624,'入口',25,'venueEntrance')}${text(81,465,'出口',15,'venueExit')}${text(183,735,'出口',12,'venueExit')}
     ${text(45,482,'階段',12,'venueStairs')}${text(28,576,'1F',18,'venueStairs')}
     ${text(519,320,'L',18,'venueArea')}${text(518,597,'C',18,'venueArea')}${text(518,880,'R',18,'venueArea')}
     ${blocks.join('')}
     ${text(154,749,'13〜57 位置確認中',9,'venueUnmappedLabel')}${text(318,750,'58〜97 位置確認中',9,'venueUnmappedLabel')}
   </g>`;
 }
 if(floor==='3'){
   return `<g class="venueScenery">
     ${base('M106 80 H505 V366 L458 400 V540 L505 573 V956 H177 V573 H107 V365 H177 V80 Z','#e3eafa')}
     ${text(25,77,'3F',50,'venueFloorNo')}${text(98,68,'第2会場',21,'venueTitle')}
     ${spot(316,422,115,111,'特別展示','venueInfo')}${spot(147,571,31,93,'宝石の魅力','venueInfo')}${spot(147,700,31,112,'ライヴ','venueInfo')}
     ${text(68,541,'出入口',17,'venueEntrance')}${text(32,457,'階段',13,'venueStairs')}
     ${text(515,262,'L',18,'venueArea')}${text(516,733,'R',18,'venueArea')}
   </g>`;
 }
 return `<g class="venueScenery">
   ${base('M172 100 H754 V762 L688 812 H246 L172 765 Z','#f8e4d4')}
   <path class="venueDash" d="M457 89 V960"/>
   ${text(48,104,'4F',61,'venueFloorNo')}${text(136,86,'第3会場',27,'venueTitle')}
   ${text(290,882,'入口',34,'venueEntrance')}${text(568,876,'出口',32,'venueExit')}
   ${text(86,699,'階段',18,'venueStairs')}${text(308,958,'L',19,'venueArea')}${text(553,958,'R',19,'venueArea')}
 </g>`;
}

function renderHotspots(){
 const layer=$('hotspotLayer');if(!layer)return;
 const m=floorMeta(),W=m.imageSize[0],H=m.imageSize[1];
 const q=!!$('search').value.trim()||!!focusShopId;
 const isHit=s=>focusShopId?s.id===focusShopId:match(s);
 const usedRank=new Set(),byCode=new Map();
 shops.filter(s=>shopFloor(s)===floor).forEach(s=>shopBooths(s).forEach(c=>{
  const code=normBooth(c);if(!byCode.has(code))byCode.set(code,[]);byCode.get(code).push(s);
 }));
 let highlighted=0,located=0;
 const tiles=boothSpots().map(h=>{
  const matches=byCode.get(normBooth(h.code))||[];
  if(matches.length)located++;
  const hit=!!(q&&matches.some(isHit));
  const fav=matches.some(s=>currentRecord(s).fav);
  const visited=!!(matches.length&&matches.every(s=>visitedFor(s)));
  const orderShop=matches.find(s=>orderFor(s)&&!usedRank.has(s.id));
  const n=orderShop?orderFor(orderShop):0;
  if(n)usedRank.add(orderShop.id);
  if(hit)highlighted++;
  const provisional=h.confidence==='provisional';
  const cls=['boothSVG',hit?'tileHit':'',fav?'tileFav':'',visited?'tileVisited':'',provisional?'tileProvisional':'',matches.length?'hasShop':'noShop'].filter(Boolean).join(' ');
  const tip=`${h.code}${matches.length?' '+matches.map(s=>s.name).join('・'):'（店舗情報なし）'}`;
  const cx=h.x*W,cy=h.y*H,ww=h.w*W,hh=h.h*H,x=cx-ww/2,y=cy-hh/2;
  const fz=Math.max(4.6,Math.min(9,hh*.53,ww/(String(h.code).length*.68)));
  const rx=Math.min(1,ww*.04,hh*.08);
  // 公式図と操作領域を、同一のSVG座標系に配置する。ズーム時も伸縮率が一致。
  return `<g class="${cls}" data-hotspot="${esc(h.code)}" role="button" tabindex="0" aria-label="${esc(tip)}"><title>${esc(tip)}</title><rect class="tileBody" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${ww.toFixed(2)}" height="${hh.toFixed(2)}" rx="${rx.toFixed(1)}"/><text class="tileFallbackCode" x="${cx.toFixed(2)}" y="${(cy+fz*.34).toFixed(2)}" text-anchor="middle" font-size="${fz.toFixed(2)}">${esc(h.code)}</text>${n?`<g class="tileRank"><circle cx="${(x+3).toFixed(1)}" cy="${(y+2).toFixed(1)}" r="6.2"/><text x="${(x+3).toFixed(1)}" y="${(y+4.8).toFixed(1)}" text-anchor="middle" font-size="8">${n}</text></g>`:''}</g>`;
 }).join('');
 // 四角と色付けは同一のSVG要素。外部画像を重ねない。
 layer.innerHTML=`<svg class="floorSVG" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-label="${floor}階 ブース配置図"><rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>${venueDrawing()}<g class="boothGroup">${tiles}</g></svg>`;
 $('hotspotStatus').textContent=`${floor}階：位置データ登録 ${boothSpots().length}区画、店舗一致 ${located}区画${q?`、強調 ${highlighted}区画`:''}。${floor==='2'?'13〜97番はブースと店舗の位置対応が未登録です。':''}`;
}

function openShop(shop){
 if(!shop)return;
 selected=shop;
 const r=currentRecord(shop);
 $('shopName').textContent=shop.name;
 $('shopLocation').textContent=`${shop.floor}階・第${shop.hall}会場　エリア${shop.area}　ブース ${shop.boothText}`;
 $('memoInput').value=r.memo||'';$('orderInput').value=orderFor(shop)||'';$('formError').textContent='';
 refreshActions();$('modal').classList.remove('hidden');
}
function refreshActions(){
 if(!selected)return;
 const r=currentRecord(selected);
 $('favBtn').textContent=r.fav?'★ お気に入り登録済':'☆ お気に入り';$('favBtn').classList.toggle('active',r.fav);
 // 石フリマ版と同じ「□ 訪問前／✓ 訪問済み」の表示を維持。
 $('visitedBtn').textContent=visitedFor(selected)?'✓ 訪問済み':'□ 訪問前';$('visitedBtn').classList.toggle('active',visitedFor(selected));
 const locationButton=$('showOnMapBtn');
 const mapped=mappedSpotsFor(selected).length>0;
 locationButton.disabled=!mapped;
 locationButton.title=mapped?'':'位置情報が未登録の店舗です';
 locationButton.setAttribute('aria-label',mapped?'この店舗の位置を表示':'位置情報未登録のため、地図上に表示できません');
}
function closeShop(){selected=null;$('modal').classList.add('hidden')}
function saveDetail(close=true){
 if(!selected)return false;
 const s=selected,r=currentRecord(s),v=$('orderInput').value.trim();
 const n=v===''?0:Number(v);
 if(v!==''&&(!/^\d+$/.test(v)||!Number.isInteger(n)||n<1||n>999)){$('formError').textContent='訪問順は1〜999の整数で入力してね。';return false}
 const other=shops.find(x=>x.id!==s.id&&Number(currentRecord(x).orders?.[day]||0)===n&&n);
 if(other){$('formError').textContent=`${n}番は「${other.name}」で使っているよ。`;return false}
 r.orders ||= {};r.orders[day]=n||null;
 r.memo=$('memoInput').value;
 if(n)r.fav=true;
 save();if(close)closeShop();render();return true;
}
// 「位置を表示」はデータを変更せず、以前の検索ヒットを消して最後に選んだ1店だけ強調。
function showShopOnMap(){
 if(!selected)return;
 const s=selected;
 const spots=mappedSpotsFor(s);
 if(!spots.length)return; // データ更新などに備えた安全策。エラーは表示しない。
 // モーダル内で編集したメモ・訪問順は、従来と同じく移動前に保存。
 if(!saveDetail(false))return;
 $('search').value='';
 focusShopId=s.id;
 floor=shopFloor(s);
 zoom=Math.max(zoom,1.8);
 closeShop();
 changeView('map');
 // 地図上の対象ブース（複数区画なら中央）へ寄せる。
 const loc={
  x:spots.reduce((sum,h)=>sum+h.x,0)/spots.length,
  y:spots.reduce((sum,h)=>sum+h.y,0)/spots.length
 };
 const center=()=>{
  if(focusShopId!==s.id)return;
  const scroll=$('mapScroll');
  scroll.scrollTo({
   left:Math.max(0,scroll.scrollWidth*loc.x-scroll.clientWidth/2),
   top:Math.max(0,scroll.scrollHeight*loc.y-scroll.clientHeight/2),
   behavior:'smooth'
  });
 };
 requestAnimationFrame(center);
}
function handleMapClick(e){
 const booth=e.target.closest('[data-hotspot]');
 if(!booth)return;
 const sellers=shopsAt(booth.dataset.hotspot,floor);
 if(sellers.length===1){openShop(sellers[0]);return}
 if(sellers.length>1){openShop(sellers[0]);message(`同じ区画に${sellers.length}店舗の登録があるよ。`);return}
 message(`${booth.dataset.hotspot} の店舗データはまだ登録されていないよ。`);
}

async function exportRecords(){
 const json=JSON.stringify({format:'mineral-show-memory',version:1,eventId:shopData.eventId,exportedAt:new Date().toISOString(),records},null,2);
 const url=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=`memory-${shopData.eventId}.json`;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);$('backupMsg').textContent='バックアップを作成したよ。iPhoneのファイルに保管してね。';
}
async function importRecords(){
 const file=$('importFile').files?.[0];if(!file)return;
 try{
  const value=JSON.parse(await file.text());
  if(value.format!=='mineral-show-memory'||value.eventId!==shopData.eventId||!value.records||Array.isArray(value.records))throw Error('池袋版のバックアップファイルを選んでね。');
  if(!confirm('記録を読み込んでよい？ 同じ店舗の内容はバックアップで上書きするよ。'))return;
  records={...records,...value.records};save();render();$('backupMsg').textContent='記録を読み込んだよ。';
 }catch(err){$('backupMsg').textContent='読み込み失敗：'+err.message}
 finally{$('importFile').value=''}
}
async function start(){
 try{
  const [s,m]=await Promise.all([fetch('./shops.json',{cache:'no-store'}),fetch('./map.json?v=14',{cache:'no-store'})]);
  if(!s.ok||!m.ok)throw Error('shops.json または map.json が読み込めません。配置を確認してください。');
  [shopData,mapData]=await Promise.all([s.json(),m.json()]);
  if(!Array.isArray(shopData.shops)||!Array.isArray(mapData.floors))throw Error('JSON形式が正しくないよ。');
  shops=shopData.shops;days=shopData.dates;floors=mapData.floors;day=days[0].id;floor=floors[0].id;
  storeKey='mineral-show-memory:'+shopData.eventId;
  try{records=JSON.parse(localStorage.getItem(storeKey)||'{}')||{}}catch(err){records={}}
  document.querySelector('h1').textContent='💎 '+shopData.title;
  $('coverageBanner').textContent=shopData.coverage==='partial'?`※ 初期版は${shops.length}店舗のみ先行収録。全店の登録は未完了だよ。`:`公式出展者一覧から更新した${shops.length}店舗を収録。`;
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>changeView(b.dataset.view));
  $('dayTabs').onclick=e=>{const b=e.target.closest('[data-day]');if(b)switchDay(b.dataset.day)};
  $('floorTabs').onclick=e=>{const b=e.target.closest('[data-floor]');if(b)switchFloor(b.dataset.floor)};
  $('search').oninput=()=>{
   focusShopId=null;
   const q=$('search').value.trim();
   if(q){
    const hits=shops.filter(match);
    const floorsHit=[...new Set(hits.map(s=>shopFloor(s)))];
    if(hits.length&&!floorsHit.includes(floor)&&floorsHit.length===1){floor=floorsHit[0];zoom=1;}
   }
   render();
  };
  $('clear').onclick=()=>{$('search').value='';focusShopId=null;render()};
  $('shopList').onclick=e=>{const b=e.target.closest('[data-shop-id]');if(b)openShop(findShop(b.dataset.shopId))};
  $('mapCanvas').onclick=handleMapClick;
 $('mapCanvas').onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-hotspot]')){e.preventDefault();handleMapClick(e)}};
  $('favBtn').onclick=()=>{if(!selected)return;const r=currentRecord(selected);r.fav=!r.fav;if(!r.fav)r.orders={};save();refreshActions();render()};
  $('visitedBtn').onclick=()=>{if(!selected)return;const r=currentRecord(selected);r.visited||={};r.visited[day]=!r.visited[day];save();refreshActions();render()};
  $('saveBtn').onclick=()=>saveDetail(true);
  $('showOnMapBtn').onclick=showShopOnMap;
  $('closeBtn').onclick=closeShop;$('cancelBtn').onclick=closeShop;$('modal').onclick=e=>{if(e.target===$('modal'))closeShop()};
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeShop()});
  $('zoomIn').onclick=()=>{zoom=Math.min(4,Math.round((zoom+.25)*100)/100);applyZoom()};
  $('zoomOut').onclick=()=>{zoom=Math.max(.65,Math.round((zoom-.25)*100)/100);applyZoom()};
  $('zoomFit').onclick=()=>{zoom=1;$('mapScroll').scrollTo({left:0,top:0});applyZoom()};
  $('zoomReset').onclick=()=>{zoom=1;$('mapScroll').scrollTo({left:0,top:0});applyZoom()};
  // 2本指ピンチ拡大・縮小。クリック/タップでの位置指定とは干渉しないようにする。
  let pinch=null;
  $('mapScroll').addEventListener('touchstart',e=>{if(e.touches.length===2)pinch={dist:Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY),zoom};else pinch=null},{passive:true});
  $('mapScroll').addEventListener('touchmove',e=>{if(!pinch||e.touches.length!==2)return;e.preventDefault();const dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);zoom=Math.min(4,Math.max(.65,pinch.zoom*(dist/pinch.dist)));applyZoom()},{passive:false});
  $('mapScroll').addEventListener('touchend',()=>{pinch=null},{passive:true});
  $('exportBtn').onclick=exportRecords;$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=importRecords;
  render();
 }catch(err){console.error(err);$('mapHint').textContent='読み込みエラー：'+err.message}
}
start();
})();
