import {BRANDS, CONDITIONS, loadListings, filterListings, safeUrl} from './data.js';
import {initialLanguage, translate} from './i18n.js';
const $ = selector => document.querySelector(selector);
const form = $('#filters'), cards = $('#cards'), dialog = $('#detail');
let dataset = null;
let language = initialLanguage();
let statusKey = null;
const locale = () => ({th:'th-TH-u-ca-gregory',en:'en-GB',de:'de-DE'})[language];
const t = (key, values) => translate(language,key,values);
const money = value => new Intl.NumberFormat(locale()).format(value);
const date = (value, long = false) => new Intl.DateTimeFormat(locale(), {timeZone:'Asia/Bangkok',year:'numeric',month:long?'long':'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
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
  options($('#model'),models.map(value => [value,value]),t('allModels'));
}
function age(value) {
  // Demo ages stay anchored to the snapshot; live datasets use the actual clock.
  const now = dataset.isDemo ? Date.parse(dataset.updatedAt) : Date.now();
  const minutes = Math.max(0,Math.floor((now-Date.parse(value))/60000));
  if (minutes < 60) return t('minutesAgo',{count:minutes});
  if (minutes < 1440) return t('hoursAgo',{count:Math.floor(minutes/60)});
  return t('daysAgo',{count:Math.floor(minutes/1440)});
}
function photo(item,className) {
  const img = el('img',className);
  const sourceImage = safeUrl(item.sourceImage,true);
  const fallback = new URL('../assets/placeholder.svg',import.meta.url).href;
  img.src = sourceImage || safeUrl(item.image,true) || fallback;
  img.alt = sourceImage || !item.imageIsPlaceholder ? item.title : t('placeholderAlt',{model:item.model});
  img.loading = 'lazy'; img.width = 640; img.height = 360;
  img.addEventListener('error',()=>{img.src=fallback;img.alt=t('noImage');},{once:true});
  return img;
}
function originalLink(item) {
  const url = safeUrl(item.url);
  if (!url) return el('span','muted',t('noLink'));
  const link = el('a','original-link');
  link.href=url;link.target='_blank';link.rel='noopener noreferrer';
  link.append(el('span','',t('original')),el('span','', '↗'));
  link.setAttribute('aria-label',t('originalLabel',{title:item.title,demo:dataset.isDemo?t('demoLink'):''}));
  link.addEventListener('click',event=>event.stopPropagation());
  return link;
}
function card(item) {
  const node = el('article',`card${item.isNew?' is-new':''}`);
  const image = el('div','card-image');image.append(photo(item));
  if(item.isNew) image.append(el('span','badge new',t('newBadge')));
  if(item.imageIsPlaceholder && !safeUrl(item.sourceImage,true)) image.append(el('span','image-caption',t('placeholderImage')));
  const content = el('div','card-content');
  content.append(el('p','card-brand',item.brand === 'Other'?t('other'):item.brand));
  const heading = el('h4');const trigger = el('button','card-title',item.title);trigger.type='button';trigger.setAttribute('aria-haspopup','dialog');
  trigger.addEventListener('click',event=>{event.stopPropagation();showDetail(item);});heading.append(trigger);
  const price = el('p','price',item.price === null?t('unknownPrice'):money(item.price));
  if(item.price !== null) price.append(el('span','','฿'));
  content.append(heading,price,el('span','badge',conditionLabel(item.condition)),el('p','description',item.description));
  const meta = el('div','card-meta');meta.append(el('span','location',item.location),el('span','',age(item.publishedAt || item.discoveredAt)));
  const source = el('div','source-line');source.append(el('span','source-dot'),el('span','',item.source));
  content.append(meta,source,el('p','discovered',t('foundAt',{date:date(item.discoveredAt)})),originalLink(item));
  node.append(image,content);node.addEventListener('click',()=>showDetail(item));
  return node;
}
function showDetail(item) {
  const layout=el('div','detail-layout');const side=el('div','detail-side');
  side.append(photo(item,'detail-image'));
  if(item.imageIsPlaceholder && !safeUrl(item.sourceImage,true)) side.append(el('p','',t('imageDisclaimer')));
  const content=el('div','detail-main');const title=el('h2','',item.title);title.id='detail-title';
  const price=el('p','price',item.price === null?t('unknownPrice'):`${money(item.price)} ฿`);
  content.append(title,price,el('span','badge',conditionLabel(item.condition)),el('p','detail-description',item.fullDescription || item.description));
  const details=el('dl');
  const fields=[[t('seller'),item.seller || t('unspecified')],[t('area'),item.location],[t('dataSource'),item.source],[t('listingAge'),age(item.publishedAt || item.discoveredAt)],[t('firstFound'),date(item.discoveredAt)],[t('lastChecked'),date(item.lastCheckedAt)],[t('listingId'),item.id],[t('defect'),item.defect || conditionLabel(item.condition)],[t('status'),t(item.status)]];
  for(const [label,value] of fields) details.append(el('dt','',label),el('dd','',value));
  const url=safeUrl(item.url);details.append(el('dt','',t('originalUrl')),el('dd','',url || t('unspecified')));
  content.append(details,el('p','detail-notes',t('notes',{notes:item.notes || t('noNotes'),demo:dataset.isDemo?t('fictional'):''})),originalLink(item));
  layout.append(side,content);$('#detail-content').replaceChildren(layout);dialog.showModal();
}
function render() {
  if(!dataset)return;
  const filters=Object.fromEntries(new FormData(form));filters.newOnly=form.elements.newOnly.checked;
  const items=filterListings(dataset.listings,filters,$('#sort').value);
  cards.replaceChildren(...items.map(card));$('#result-count').textContent=items.length;
  const invalidRange=filters.min!=='' && filters.max!=='' && Number(filters.min)>Number(filters.max);
  $('#result-summary').textContent=invalidRange?t('rangeError'):t('resultSummary',{shown:items.length,total:dataset.listings.filter(item=>item.status==='active').length,demo:dataset.isDemo?t('demoSuffix'):''});
  $('#empty').hidden=items.length>0;
}
async function refresh() {
  $('#refresh').disabled=true;cards.setAttribute('aria-busy','true');$('#status').hidden=true;
  try {
    const next=await loadListings();dataset=next;
    const active=dataset.listings.filter(item=>item.status==='active');
    $('#total').textContent=money(active.length);$('#new-total').textContent=money(active.filter(item=>item.isNew).length);$('#sources-total').textContent=new Set(active.map(item=>item.source)).size;
    $('#updated').textContent=date(dataset.updatedAt,true);$('#demo-notice').hidden=!dataset.isDemo;
    populateOptions();render();
    statusKey=dataset.isDemo?'loadedDemo':'loaded';$('#status').textContent=t(statusKey);$('#status').hidden=false;
  } catch {
    statusKey=dataset?'refreshFailed':'loadFailed';$('#status').textContent=t(statusKey);$('#status').hidden=false;
    if(!dataset) $('#result-summary').textContent=t('noData');
  } finally {$('#refresh').disabled=false;cards.setAttribute('aria-busy','false');}
}
form.addEventListener('submit',event=>event.preventDefault());
form.addEventListener('input',event=>{if(event.target.name==='brand')populateModels();render();});
form.addEventListener('reset',()=>{setTimeout(()=>{if(dataset){populateModels();render();}},0);});
$('#clear-empty').addEventListener('click',()=>form.reset());$('#sort').addEventListener('change',render);$('#refresh').addEventListener('click',refresh);
$('#close-detail').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
function conditionLabel(condition) {
  if (language === 'th') return CONDITIONS[condition];
  const labels = {en:{broken:'Broken',parts_only:'Parts only',screen_damage:'Screen damage',battery_issue:'Battery issue',charging_issue:'Charging issue',water_damage:'Water damage',unknown:'Unknown issue',working_used:'Used / working'},de:{broken:'Defekt',parts_only:'Nur Ersatzteile',screen_damage:'Displayschaden',battery_issue:'Akkuproblem',charging_issue:'Ladeproblem',water_damage:'Wasserschaden',unknown:'Unbekannter Defekt',working_used:'Gebraucht / funktionsfähig'}};
  return labels[language][condition];
}
function populateOptions() {
  options($('#brand'),BRANDS.map(value=>[value,value==='Other'?t('other'):value]),t('allBrands'));
  options($('#condition'),Object.keys(CONDITIONS).map(value=>[value,conditionLabel(value)]),t('allConditions'));
  options($('#source'),unique('source'),t('allSources'));options($('#location'),unique('location'),t('allLocations'));populateModels();
}
function applyLanguage() {
  document.documentElement.lang=language;
  document.querySelectorAll('[data-i18n]').forEach(node=>{node.textContent=t(node.dataset.i18n);});
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node=>{node.placeholder=t(node.dataset.i18nPlaceholder);});
  document.querySelectorAll('[data-i18n-aria-label]').forEach(node=>{node.setAttribute('aria-label',t(node.dataset.i18nAriaLabel));});
  $('#language').value=language;
  if(statusKey) $('#status').textContent=t(statusKey);
  if(dataset){$('#updated').textContent=date(dataset.updatedAt,true);populateOptions();render();}
}
$('#language').addEventListener('change',event=>{language=event.target.value;try{localStorage.setItem('phone-finder-language',language);}catch{}if(dialog.open)dialog.close();applyLanguage();});
applyLanguage();
refresh();
