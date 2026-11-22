// 池袋ショー共通Webアプリ。会場・店舗データは map.json / shops.json から読込。
(() => {
'use strict';
const $=id=>document.getElementById(id);
const normalize=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/[\s\-_～〜・.,，、]/g,'');
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let shopData, mapData, shops=[], days=[], floors=[], day='', floor='2', view='map', selected=null, records={}, pinTarget=null, zoom=1;
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

function findShop(id){return shops.find(s=>s.id===id)}
function match(s){const q=normalize($('search').value);return !q||normalize([s.name,s.boothText,s.area,`${s.floor}階`, ...(s.booths||[]),currentRecord(s).memo].join(' ')).includes(q)}
function listShops(){let base=shops.filter(s=>match(s));if(view==='fav')base=base.filter(s=>currentRecord(s).fav);else if(!$('search').value.trim())base=base.filter(s=>shopFloor(s)===floor);base.sort((a,b)=>{
  const ar=orderFor(a)||Infinity, br=orderFor(b)||Infinity;
  if(view==='fav'&&ar!==br)return ar-br;
  if(a.floor!==b.floor)return a.floor-b.floor;
  return a.name.localeCompare(b.name,'ja');
});return base}
function changeView(next){view=next;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view===next));render()}
function switchFloor(next){floor=String(next);pinTarget=null;zoom=1;render()}
function switchDay(next){day=next;render()}
function renderTabs(){
 $('dayTabs').innerHTML=days.map(d=>`<button data-day="${esc(d.id)}" class="${day===d.id?'on':''}">${esc(d.label)}</button>`).join('');
 $('floorTabs').innerHTML=floors.map(f=>`<button data-floor="${esc(f.id)}" class="${floor===f.id?'on':''}">${esc(f.label)}</button>`).join('');
}
function render(){
 renderTabs();
 const map=view==='map';
 $('mapPanel').classList.toggle('hidden',!map);$('listPanel').classList.toggle('hidden',map);
 if(map){renderMap()}else{renderList()}
}
function renderList(){
 const list=listShops();$('resultsCount').textContent=`${list.length}店舗を表示（収録 ${shops.length}店舗）`;
 $('shopList').innerHTML=list.length?list.map(s=>{
  const r=currentRecord(s),n=orderFor(s);
  return `<button class="entry" data-shop-id="${esc(s.id)}"><span class="name"><span class="favmark">${r.fav?'★ ':''}</span>${esc(s.name)}<small>${s.floor}階・第${s.hall}会場／エリア${esc(s.area)}${visitedFor(s)?'　✓訪問済':''}</small></span>${n?`<span class="rank">${n}</span>`:''}<span class="booth">${esc(s.boothText)}</span></button>`;
 }).join(''):'<p class="hint">該当する店舗はまだ収録されていないよ。公式一覧も確認してね。</p>';
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
function renderQuickResults(){
 const raw=$('search').value.trim(),out=$('quickResults');
 if(!raw){out.classList.add('hidden');out.innerHTML='';return}
 const matches=shops.filter(match).slice(0,12);
 out.classList.remove('hidden');
 out.innerHTML=matches.length?matches.map(s=>`<button data-quick-shop="${esc(s.id)}" title="${esc(s.name)}">${esc(s.name)}　${s.floor}F ${esc(s.boothText)}</button>`).join(''):'<span class="small muted">一致する店舗は未収録だよ</span>';
}
function renderMap(){
 const m=floorMeta();if(!m)return;
 const img=$('floorImage');
 if(img.dataset.floor!==floor){
   img.dataset.floor=floor;
   img.onerror=()=>{message('公式画像が読み込めないよ。下の公式マップのリンクを開いてね。')};
   img.src=m.image;
   img.alt=`${m.label} 2026年東京ミネラルショー公式配置図`;
 }
 $('officialMap').href=m.officialPage;
 $('mapCanvas').classList.toggle('pinMode',!!pinTarget);
 $('mapHint').textContent=pinTarget?`📍 ${pinTarget.name} の「${pinTarget.boothText}」が印刷されている位置をタップしてね。`:'地図のブース番号をタップするとお店の詳細が開くよ。検索すると該当ブースが光るよ。';
 applyZoom();renderHotspots();renderPins();renderQuickResults();
}
function renderHotspots(){
 const layer=$('hotspotLayer');
 if(!layer)return;
 const raw=$('search').value.trim(), q=!!raw;
 const usedRank=new Set();
 const byCode=new Map();
 shops.filter(s=>shopFloor(s)===floor).forEach(s=>shopBooths(s).forEach(c=>{
  const key=normBooth(c),arr=byCode.get(key)||[];arr.push(s);byCode.set(key,arr);
 }));
 let highlighted=0, located=0;
 const html=boothSpots().map(h=>{
  const matches=byCode.get(normBooth(h.code))||[];
  if(matches.length)located++;
  const shop=matches.find(s=>q&&match(s))||matches[0];
  const record=shop?currentRecord(shop):null;
  const hasManualPin=record?.pin?.floor===floor;
  const hit=!!(q&&matches.some(s=>match(s))&&!hasManualPin);
  const fav=!!(matches.some(s=>currentRecord(s).fav)&&!hasManualPin);
  const visited=!!(matches.length&&matches.every(s=>visitedFor(s)));
  const orderShop=matches.find(s=>orderFor(s)&&!usedRank.has(s.id));
  const n=orderShop&&!hasManualPin?orderFor(orderShop):0;
  if(n)usedRank.add(orderShop.id);
  if(hit)highlighted++;
  const provisional=h.confidence==='provisional';
  const cls=['hotspot',hit?'hotspotHit':'',fav?'hotspotFav':'',visited?'hotspotVisited':'',provisional?'hotspotProvisional':''].filter(Boolean).join(' ');
  const tip=`${h.code}${matches.length?' '+matches.map(s=>s.name).join('・'):'（店舗情報なし）'}${provisional?' ※位置の対応は暫定':''}`;
  const badge=n?`<span class="hotspotRank">${n}</span>`:'';
  return `<button type="button" class="${cls}" data-hotspot="${esc(h.code)}" aria-label="${esc(tip)}" title="${esc(tip)}" style="left:${(h.x*100).toFixed(3)}%;top:${(h.y*100).toFixed(3)}%;width:${(h.w*100).toFixed(3)}%;height:${(h.h*100).toFixed(3)}%">${badge}</button>`;
 }).join('');
 layer.innerHTML=html;
 $('hotspotStatus').textContent=`${floor}階：配置対応 ${boothSpots().length}区画（店舗データと一致 ${located}区画）${q?`／検索ヒット ${highlighted}区画`:''}。${floorMeta().mappingNotice||''}`;
}

function renderPins(){
 const q=!!$('search').value.trim();
 const pins=shops.filter(s=>shopFloor(s)===floor&&currentRecord(s).pin?.floor===floor);
 $('pinLayer').innerHTML=pins.map(s=>{
  const r=currentRecord(s), p=r.pin, n=orderFor(s);
  const cls=['pin',r.fav?'favorite':'',r.visited?.[day]?'visited':'',q&&match(s)?'highlight':''].filter(Boolean).join(' ');
  return `<button class="${cls}" data-pin-shop="${esc(s.id)}" title="${esc(s.name)}：${esc(s.boothText)}" style="left:${Math.max(0,Math.min(100,p.x*100))}%;top:${Math.max(0,Math.min(100,p.y*100))}%">${n||'●'}</button>`;
 }).join('');
}
function openShop(shop){
 if(!shop)return;
 selected=shop;
 const r=currentRecord(shop);
 $('shopName').textContent=shop.name;
 $('shopLocation').textContent=`${shop.floor}階・第${shop.hall}会場　エリア${shop.area}　ブース ${shop.boothText}`;
 $('visitDays').textContent='公式出展者一覧は会期共通の掲載。個別の出展日は未確認。';
 $('memoInput').value=r.memo||'';$('orderInput').value=orderFor(shop)||'';$('formError').textContent='';
 refreshActions();$('modal').classList.remove('hidden');
}
function refreshActions(){
 if(!selected)return;
 const r=currentRecord(selected);
 $('favBtn').textContent=r.fav?'★ お気に入り登録済':'☆ お気に入り';$('favBtn').classList.toggle('active',r.fav);
 $('visitedBtn').textContent=visitedFor(selected)?'✓ 訪問済み':'□ 訪問前';$('visitedBtn').classList.toggle('active',visitedFor(selected));
 $('removePinBtn').disabled=!r.pin;
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
function beginPin(){
 if(!selected)return;
 if(!saveDetail(false))return;
 pinTarget=selected;floor=String(selected.floor);zoom=1;closeShop();changeView('map');
 $('mapScroll').scrollTo({left:0,top:0});message('地図のブース番号が印刷されている場所をタップしてね。');
}
function handleMapClick(e){
 if(!pinTarget){
  const booth=e.target.closest('[data-hotspot]');
  if(booth){
   const sellers=shopsAt(booth.dataset.hotspot,floor);
   if(sellers.length===1){openShop(sellers[0]);return}
   if(sellers.length>1){openShop(sellers[0]);message(`同じ区画に${sellers.length}店舗の登録があるよ。`);return}
   message(`${booth.dataset.hotspot} の店舗データはまだ登録されていないよ。`);return;
  }
 }
 const pinButton=e.target.closest('[data-pin-shop]');
 if(pinButton){openShop(findShop(pinButton.dataset.pinShop));return}
 if(!pinTarget)return;
 const rect=$('mapCanvas').getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height;
 if(x<0||x>1||y<0||y>1)return;
 const item=pinTarget;
 currentRecord(item).pin={floor:shopFloor(item),x,y};save();pinTarget=null;renderMap();message(`${item.name} の位置を記録したよ。`);
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
  const [s,m]=await Promise.all([fetch('./shops.json',{cache:'no-store'}),fetch('./map.json',{cache:'no-store'})]);
  if(!s.ok||!m.ok)throw Error('shops.json / map.json が見つからないよ。5ファイルが同じ階層にあるか確認してね。');
  [shopData,mapData]=await Promise.all([s.json(),m.json()]);
  if(!Array.isArray(shopData.shops)||!Array.isArray(mapData.floors))throw Error('JSON形式が正しくないよ。');
  shops=shopData.shops;days=shopData.dates;floors=mapData.floors;day=days[0].id;floor=floors[0].id;
  storeKey='mineral-show-memory:'+shopData.eventId;
  try{records=JSON.parse(localStorage.getItem(storeKey)||'{}')||{}}catch(err){records={}}
  document.querySelector('h1').textContent='💎 '+shopData.title;
  $('dataStatus').textContent=`現在の収録：${shops.length}店舗（${shopData.coverage==='partial'?'先行収録・未完成':'公式一覧から更新したデータ'}）`;
  $('coverageBanner').textContent=shopData.coverage==='partial'?`※ 初期版は${shops.length}店舗のみ先行収録。全店の登録は未完了だよ。`:`公式出展者一覧から更新した${shops.length}店舗を収録。`;
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>changeView(b.dataset.view));
  $('dayTabs').onclick=e=>{const b=e.target.closest('[data-day]');if(b)switchDay(b.dataset.day)};
  $('floorTabs').onclick=e=>{const b=e.target.closest('[data-floor]');if(b)switchFloor(b.dataset.floor)};
  $('search').oninput=()=>{if(view==='map'){renderHotspots();renderPins();renderQuickResults()}else renderList()};
  $('quickResults').onclick=e=>{const b=e.target.closest('[data-quick-shop]');if(b){const s=findShop(b.dataset.quickShop);if(s){if(shopFloor(s)!==floor){floor=shopFloor(s);zoom=1;render()}openShop(s)}}};
  $('clear').onclick=()=>{$('search').value='';render()};
  $('shopList').onclick=e=>{const b=e.target.closest('[data-shop-id]');if(b)openShop(findShop(b.dataset.shopId))};
  $('mapCanvas').onclick=handleMapClick;
  $('favBtn').onclick=()=>{if(!selected)return;const r=currentRecord(selected);r.fav=!r.fav;if(!r.fav)r.orders={};save();refreshActions();renderHotspots();renderPins()};
  $('visitedBtn').onclick=()=>{if(!selected)return;const r=currentRecord(selected);r.visited||={};r.visited[day]=!r.visited[day];save();refreshActions();renderHotspots();renderPins()};
  $('saveBtn').onclick=()=>saveDetail(true);
  $('setPinBtn').onclick=beginPin;
  $('removePinBtn').onclick=()=>{if(!selected)return;currentRecord(selected).pin=null;save();refreshActions();renderPins();message('位置の印を解除したよ。')};
  $('closeBtn').onclick=closeShop;$('cancelBtn').onclick=closeShop;$('modal').onclick=e=>{if(e.target===$('modal'))closeShop()};
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeShop()});
  $('zoomIn').onclick=()=>{zoom=Math.min(4,Math.round((zoom+.25)*100)/100);applyZoom()};
  $('zoomOut').onclick=()=>{zoom=Math.max(.65,Math.round((zoom-.25)*100)/100);applyZoom()};
  $('zoomFit').onclick=()=>{zoom=1;$('mapScroll').scrollTo({left:0,top:0});applyZoom()};
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
