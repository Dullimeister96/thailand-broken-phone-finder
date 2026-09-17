import {BRANDS, CONDITIONS, loadListings, filterListings, safeUrl} from './data.js';
const $ = selector => document.querySelector(selector);
const form = $('#filters'), cards = $('#cards'), dialog = $('#detail');
let dataset = null;
const money = value => new Intl.NumberFormat('th-TH').format(value);
const date = (value, long = false) => new Intl.DateTimeFormat('th-TH-u-ca-gregory', {timeZone:'Asia/Bangkok',year:'numeric',month:long?'long':'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function options(select, values, first) {
  const current = select.value;
  select.replaceChildren(new Option(first,''), ...values.map(([value,label]) => new Option(label,value)));
  if (values.some(([value]) => value === current)) select.value = current;
}
const unique = key => [...new Set(dataset.listings.filter(item => item.status==='active').map(item => item[key]))].sort((a,b) => a.localeCompare(b,'th')).map(value => [value,value]);
function populateModels() {
  const brand = form.elements.brand.value;
  const models = [...new Set(dataset.listings.filter(item => item.status === 'active' && (!brand || item.brand === brand)).map(item => item.model))].sort();
  options($('#model'),models.map(value => [value,value]),'ทุกรุ่น');
}
function age(value) {
  // Demo ages stay anchored to the snapshot; live datasets use the actual clock.
  const now = dataset.isDemo ? Date.parse(dataset.updatedAt) : Date.now();
  const minutes = Math.max(0,Math.floor((now-Date.parse(value))/60000));
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  if (minutes < 1440) return `${Math.floor(minutes/60)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(minutes/1440)} วันที่แล้ว`;
}
function photo(item,className) {
  const img = el('img',className);
  img.src = safeUrl(item.image,true) || new URL('../assets/placeholder.svg',import.meta.url).href;
  img.alt = item.imageIsPlaceholder ? `ภาพตัวอย่างสำหรับ ${item.model} ไม่ใช่ภาพสินค้าจริง` : item.title;
  img.loading = 'lazy'; img.width = 640; img.height = 360;
  img.addEventListener('error',()=>{img.src=new URL('../assets/placeholder.svg',import.meta.url).href;img.alt='ไม่มีภาพประกาศ';},{once:true});
  return img;
}
function originalLink(item) {
  const url = safeUrl(item.url);
  if (!url) return el('span','muted','ไม่มีลิงก์ประกาศ');
  const link = el('a','original-link');
  link.href=url;link.target='_blank';link.rel='noopener noreferrer';
  link.append(el('span','', 'ดูประกาศต้นฉบับ'),el('span','', '↗'));
  link.setAttribute('aria-label',`ดูประกาศต้นฉบับ ${item.title}${dataset.isDemo?' (ลิงก์สาธิต)':''} — เปิดแท็บใหม่`);
  link.addEventListener('click',event=>event.stopPropagation());
  return link;
}
function card(item) {
  const node = el('article',`card${item.isNew?' is-new':''}`);
  const image = el('div','card-image');image.append(photo(item));
  if(item.isNew) image.append(el('span','badge new','ใหม่'));
  if(item.imageIsPlaceholder) image.append(el('span','image-caption','ภาพตัวอย่าง'));
  const content = el('div','card-content');
  content.append(el('p','card-brand',item.brand === 'Other'?'อื่น ๆ':item.brand));
  const heading = el('h4');const trigger = el('button','card-title',item.title);trigger.type='button';trigger.setAttribute('aria-haspopup','dialog');
  trigger.addEventListener('click',event=>{event.stopPropagation();showDetail(item);});heading.append(trigger);
  const price = el('p','price',money(item.price));price.append(el('span','','฿'));
  content.append(heading,price,el('span','badge',CONDITIONS[item.condition]),el('p','description',item.description));
  const meta = el('div','card-meta');meta.append(el('span','location',item.location),el('span','',age(item.publishedAt || item.discoveredAt)));
  const source = el('div','source-line');source.append(el('span','source-dot'),el('span','',item.source));
  content.append(meta,source,el('p','discovered',`พบเมื่อ: ${date(item.discoveredAt)}`),originalLink(item));
  node.append(image,content);node.addEventListener('click',()=>showDetail(item));
  return node;
}
function showDetail(item) {
  const layout=el('div','detail-layout');const side=el('div','detail-side');
  side.append(photo(item,'detail-image'));
  if(item.imageIsPlaceholder) side.append(el('p','','ภาพตัวอย่าง ไม่ใช่ภาพสินค้าจริง'));
  const content=el('div','detail-main');const title=el('h2','',item.title);title.id='detail-title';
  const price=el('p','price',`${money(item.price)} ฿`);
  content.append(title,price,el('span','badge',CONDITIONS[item.condition]),el('p','detail-description',item.fullDescription || item.description));
  const details=el('dl');
  const fields=[['ผู้ขาย',item.seller || 'ไม่ระบุ'],['พื้นที่',item.location],['แหล่งข้อมูล',item.source],['อายุประกาศ',age(item.publishedAt || item.discoveredAt)],['พบครั้งแรก',date(item.discoveredAt)],['ตรวจสอบล่าสุด',date(item.lastCheckedAt)],['รหัสรายการ',item.id],['อาการเสีย',item.defect || CONDITIONS[item.condition]],['สถานะ',{active:'ยังประกาศขาย',sold:'ขายแล้ว',removed:'นำประกาศออกแล้ว'}[item.status]]];
  for(const [label,value] of fields) details.append(el('dt','',label),el('dd','',value));
  const url=safeUrl(item.url);details.append(el('dt','','URL ต้นฉบับ'),el('dd','',url || 'ไม่ระบุ'));
  content.append(details,el('p','detail-notes',`หมายเหตุ: ${item.notes || 'ไม่มีหมายเหตุ'}${dataset.isDemo?' รายการนี้เป็นข้อมูลสมมติ ไม่สามารถซื้อได้จริง':''}`),originalLink(item));
  layout.append(side,content);$('#detail-content').replaceChildren(layout);dialog.showModal();
}
function render() {
  if(!dataset)return;
  const filters=Object.fromEntries(new FormData(form));filters.newOnly=form.elements.newOnly.checked;
  const items=filterListings(dataset.listings,filters,$('#sort').value);
  cards.replaceChildren(...items.map(card));$('#result-count').textContent=items.length;
  const invalidRange=filters.min!=='' && filters.max!=='' && Number(filters.min)>Number(filters.max);
  $('#result-summary').textContent=invalidRange?'ราคาต่ำสุดต้องไม่เกินราคาสูงสุด':`แสดง ${items.length} จาก ${dataset.listings.filter(item=>item.status==='active').length} รายการ${dataset.isDemo?' · ข้อมูลตัวอย่าง':''}`;
  $('#empty').hidden=items.length>0;
}
async function refresh() {
  $('#refresh').disabled=true;cards.setAttribute('aria-busy','true');$('#status').hidden=true;
  try {
    const next=await loadListings();dataset=next;
    const active=dataset.listings.filter(item=>item.status==='active');
    $('#total').textContent=money(active.length);$('#new-total').textContent=money(active.filter(item=>item.isNew).length);$('#sources-total').textContent=new Set(active.map(item=>item.source)).size;
    $('#updated').textContent=date(dataset.updatedAt,true);$('#demo-notice').hidden=!dataset.isDemo;
    options($('#brand'),BRANDS.map(value=>[value,value==='Other'?'อื่น ๆ':value]),'ทุกยี่ห้อ');
    options($('#condition'),Object.entries(CONDITIONS),'ทุกสภาพ');
    options($('#source'),unique('source'),'ทุกเว็บไซต์');options($('#location'),unique('location'),'ทุกพื้นที่');populateModels();render();
    $('#status').textContent=dataset.isDemo?'โหลดข้อมูลตัวอย่างเรียบร้อยแล้ว':'โหลดข้อมูลเรียบร้อยแล้ว';$('#status').hidden=false;
  } catch {
    $('#status').textContent=dataset?'รีเฟรชไม่สำเร็จ กำลังแสดงข้อมูลเดิม กรุณาลองอีกครั้ง':'โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วกดรีเฟรชข้อมูล';$('#status').hidden=false;
    if(!dataset) $('#result-summary').textContent='ยังไม่มีข้อมูล';
  } finally {$('#refresh').disabled=false;cards.setAttribute('aria-busy','false');}
}
form.addEventListener('submit',event=>event.preventDefault());
form.addEventListener('input',event=>{if(event.target.name==='brand')populateModels();render();});
form.addEventListener('reset',()=>{setTimeout(()=>{if(dataset){populateModels();render();}},0);});
$('#clear-empty').addEventListener('click',()=>form.reset());$('#sort').addEventListener('change',render);$('#refresh').addEventListener('click',refresh);
$('#close-detail').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
refresh();
