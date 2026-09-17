// Data boundary: an hourly publisher can replace the JSON atomically.
export const CONDITIONS = Object.freeze({broken:'เครื่องเสีย',parts_only:'อะไหล่',screen_damage:'หน้าจอแตก',battery_issue:'แบตเตอรี่เสื่อม',charging_issue:'ชาร์จไม่เข้า',water_damage:'ตกน้ำ',unknown:'ไม่ทราบอาการ',working_used:'มือสอง / ใช้งานได้'});
export const BRANDS = ['Apple','Samsung','Xiaomi','Oppo','Vivo','Google','Huawei','Other'];
export function safeUrl(value, image = false) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, document.baseURI);
    if (!['http:','https:'].includes(url.protocol)) return null;
    if (image && url.origin !== location.origin && url.protocol !== 'https:') return null;
    return url.href;
  } catch { return null; }
}
export function validateDataset(data) {
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.listings) || !Number.isFinite(Date.parse(data.updatedAt))) throw new Error('Invalid dataset');
  const ids = new Set();
  for (const item of data.listings) {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) throw new Error('Invalid or repeated ID');
    ids.add(item.id);
    for (const key of ['title','brand','model','description','location','source','condition','status']) {
      if (typeof item[key] !== 'string' || !item[key].trim()) throw new Error(`Invalid ${key}`);
    }
    if (!BRANDS.includes(item.brand) || !Object.hasOwn(CONDITIONS,item.condition) || !['active','sold','removed'].includes(item.status) || typeof item.isNew !== 'boolean' || item.currency !== 'THB' || !Number.isFinite(item.price) || item.price < 0 || !Number.isFinite(Date.parse(item.discoveredAt)) || !Number.isFinite(Date.parse(item.lastCheckedAt))) throw new Error('Invalid listing');
  }
  return data;
}
export async function loadListings() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(new URL('../data/listings.json', import.meta.url), {cache:'no-store',signal:controller.signal});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return validateDataset(await response.json());
  } finally { clearTimeout(timer); }
}
export function filterListings(listings, filters, sort) {
  const search = filters.search.trim().toLocaleLowerCase();
  return listings.filter(item => item.status === 'active'
    && (!search || [item.title,item.brand,item.model,item.description,item.defect,item.location,item.source,CONDITIONS[item.condition]].join(' ').toLocaleLowerCase().includes(search))
    && ['brand','model','condition','source','location'].every(key => !filters[key] || item[key] === filters[key])
    && (filters.min === '' || item.price >= Number(filters.min))
    && (filters.max === '' || item.price <= Number(filters.max))
    && (!filters.newOnly || item.isNew))
    .sort((a,b) => (sort === 'price-asc' ? a.price-b.price : sort === 'price-desc' ? b.price-a.price : Date.parse(b.discoveredAt)-Date.parse(a.discoveredAt)) || a.id.localeCompare(b.id));
}
