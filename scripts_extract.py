#!/usr/bin/env python
# Extracts ZOB report + Payout slab xlsx into js/data.js (window.SDCData)
import openpyxl, re, json, hashlib, os

BASE = os.path.dirname(os.path.abspath(__file__))
ZOB = os.path.join(BASE, "Files", "ZOB Report - SD Computronix _ 1st to 31st July.26.xlsx")
PAY = os.path.join(BASE, "Files", "PAyout_Slab.xlsx")

def h(s):  # deterministic 0..1 from string
    return int(hashlib.md5(str(s).encode()).hexdigest(), 16) % 100000 / 100000.0

# ---------- state centroids (approx lat,lng) ----------
STATE_LL = {
    'Maharashtra': (19.3, 75.5), 'Gujarat': (22.6, 71.8), 'Haryana': (29.2, 76.3),
    'Karnataka': (14.6, 76.0), 'Delhi': (28.63, 77.20), 'Uttar Pradesh': (27.0, 80.5),
    'Telangana': (17.9, 79.0), 'Tamil Nadu': (11.1, 78.6), 'Chandigarh': (30.73, 76.78),
    'Punjab': (31.0, 75.5), 'West Bengal': (23.0, 87.8), 'Rajasthan': (26.8, 74.5),
    'Goa': (15.4, 74.0), 'Madhya Pradesh': (23.5, 78.3), 'Andhra Pradesh': (15.9, 79.7),
    'Chattisgarh': (21.3, 81.8), 'Jharkhand': (23.6, 85.3), 'Kerala': (10.5, 76.3),
    'Uttarakhand': (30.0, 79.0), 'Odisha': (20.5, 84.8), 'Bihar': (25.6, 85.5),
    'Assam': (26.2, 92.5), 'Meghalaya': (25.5, 91.4), 'Pondicherry': (11.94, 79.83),
}
# major city coords for realism
CITY_LL = {
    'Mumbai': (19.076, 72.877), 'Navi Mumbai': (19.033, 73.03), 'Thane': (19.218, 72.978),
    'Pune': (18.52, 73.856), 'Nagpur': (21.146, 79.088), 'Nashik': (19.997, 73.789),
    'Ahmedabad': (23.022, 72.571), 'Surat': (21.17, 72.831), 'Vadodara': (22.307, 73.181),
    'Rajkot': (22.303, 70.802), 'Delhi': (28.7, 77.1), 'New Delhi': (28.61, 77.20),
    'Gurgaon': (28.457, 77.026), 'Gurugram': (28.457, 77.026), 'Noida': (28.535, 77.391),
    'Faridabad': (28.408, 77.317), 'Ghaziabad': (28.669, 77.453), 'Bengaluru': (12.972, 77.594),
    'Bangalore': (12.972, 77.594), 'Mysore': (12.295, 76.639), 'Mysuru': (12.295, 76.639),
    'Hyderabad': (17.385, 78.487), 'Secunderabad': (17.44, 78.5), 'Chennai': (13.083, 80.27),
    'Coimbatore': (11.017, 76.956), 'Madurai': (9.925, 78.12), 'Kolkata': (22.573, 88.364),
    'Howrah': (22.595, 88.263), 'Jaipur': (26.912, 75.787), 'Indore': (22.72, 75.858),
    'Bhopal': (23.26, 77.413), 'Lucknow': (26.847, 80.947), 'Kanpur': (26.45, 80.33),
    'Varanasi': (25.32, 82.97), 'Chandigarh': (30.73, 76.78), 'Amritsar': (31.634, 74.872),
    'Ludhiana': (30.9, 75.857), 'Kochi': (9.931, 76.267), 'Cochin': (9.931, 76.267),
    'Thiruvananthapuram': (8.524, 76.936), 'Patna': (25.594, 85.137), 'Ranchi': (23.344, 85.309),
    'Guwahati': (26.144, 91.736), 'Bhubaneswar': (20.296, 85.824), 'Raipur': (21.251, 81.629),
    'Dehradun': (30.317, 78.032), 'Visakhapatnam': (17.686, 83.218), 'Vijayawada': (16.506, 80.648),
    'Goa': (15.49, 73.82), 'Panaji': (15.49, 73.82), 'Vapi': (20.37, 72.9), 'Anand': (22.56, 72.95),
}

def coords_for(city, region):
    city_k = (city or '').strip()
    if city_k in CITY_LL:
        lat, lng = CITY_LL[city_k]
        j = h(city_k + '1'); k = h(city_k + '2')
        return round(lat + (j - 0.5) * 0.05, 5), round(lng + (k - 0.5) * 0.05, 5)
    lat, lng = STATE_LL.get(region, (22.0, 79.0))
    j = h(city_k + region + 'a'); k = h(city_k + region + 'b')
    return round(lat + (j - 0.5) * 1.6, 5), round(lng + (k - 0.5) * 1.6, 5)

# ---------- slab parser ----------
def to_amt(numstr, unit):
    n = float(numstr)
    u = (unit or '').lower()
    if u in ('l', 'lac', 'lakh'): return n * 100000
    if u == 'k': return n * 1000
    return n

TOK = re.compile(r'(\d+\.?\d*)\s*(lac|lakh|l|k)?\s*(%)?', re.I)

def parse_slab(raw):
    s = (raw or '').strip()
    low = s.lower()
    if not s or s in ('-',) or low in ('no inc', 'slab incentive', 'nil', 'na'):
        return {'kind': 'none', 'tiers': []}
    is_pct = '%' in s
    toks = [(m.group(1), m.group(2), m.group(3)) for m in TOK.finditer(s) if m.group(1)]
    if not toks:
        return {'kind': 'none', 'tiers': []}
    tiers = []
    if is_pct:
        # '100%' / '100 %' is almost always a "target" marker in this data, not a rate — drop it
        thresholds = [to_amt(n, u) for (n, u, p) in toks if not p]
        pcts = [float(n) for (n, u, p) in toks if p and float(n) <= 30]
        # a bare 'Nk' incentive amount can appear in "...100% target get 2k" strings
        flat_amt = None
        m = re.search(r'(\d)\s*k\b', low) if 'target' in low or 'get' in low else None
        if not thresholds and pcts:
            tiers = [{'from': 0, 'type': 'pct', 'value': pcts[0]}]
        else:
            prev = -1
            for i in range(min(len(thresholds), len(pcts))):
                frm = int(thresholds[i])
                if frm <= prev: frm = prev + 1
                prev = frm
                tiers.append({'from': frm, 'type': 'pct', 'value': pcts[i]})
        kind = 'pct'
        # "After 50k (100% target) get 2k incentive" → flat, no usable pct tiers
        if not tiers and thresholds and m:
            tiers = [{'from': int(thresholds[0]), 'type': 'flat', 'value': int(m.group(1)) * 1000}]
            kind = 'flat'
    else:
        nums = [to_amt(n, u) for (n, u, p) in toks]
        prev = -1
        i = 0
        while i + 1 < len(nums):
            frm = int(nums[i]); amt = int(nums[i + 1])
            if amt > 60000: amt = int(amt / 1000)  # guard against typo'd 'k' on amounts
            # reversed pairs like "2K-50,000" / "2k inc after 50k" → swap so bigger is the threshold
            if frm < 10000 and amt >= 20000:
                frm, amt = amt, frm
            if frm <= prev: frm = prev + 1
            prev = frm
            tiers.append({'from': frm, 'type': 'flat', 'value': amt})
            i += 2
        kind = 'flat'
        if not tiers and len(nums) == 1:
            tiers = [{'from': 0, 'type': 'flat', 'value': int(nums[0])}]
    # drop nonsense tiers (parse noise), keep sane incentives only
    if kind == 'pct':
        tiers = [t for t in tiers if 1 <= t['value'] <= 30]
    else:
        tiers = [t for t in tiers if 100 <= t['value'] <= 20000]
    if not tiers:
        return {'kind': 'none', 'tiers': []}
    return {'kind': kind, 'tiers': tiers}

# ---------- read ZOB ----------
wb = openpyxl.load_workbook(ZOB, read_only=True, data_only=True)
ws = wb["Export"]
zrows = [r for r in ws.iter_rows(min_row=3, values_only=True) if r[1] and r[1] != 'Store Code']
# columns: 1 code,2 name,3 BM,4 CM,5 zone,6 region,7 city,13 net value
zob = {}
for r in zrows:
    code = str(r[1]).strip()
    zob[code] = {
        'code': code, 'store': (r[2] or '').strip(), 'bm': (r[3] or '').strip(),
        'cm': (r[4] or '').strip(), 'zone': (r[5] or '').strip(), 'region': (r[6] or '').strip(),
        'city': (r[7] or '').strip(), 'netValue': r[13] if isinstance(r[13], (int, float)) else 0,
    }

# ---------- read payout ----------
wb2 = openpyxl.load_workbook(PAY, read_only=True, data_only=True)
ws2 = wb2["Sheet1"]
prows = [r for r in ws2.iter_rows(min_row=2, values_only=True) if r[0]]

def base_code(c):
    return re.split(r'[-\s]', str(c).strip())[0].upper()

# unique slab templates
raw_to_tpl = {}
templates = []
def slab_label(raw, parsed):
    if parsed['kind'] == 'none': return 'No incentive'
    parts = []
    for t in parsed['tiers']:
        frm = t['from']
        fl = ('₹%dL' % (frm // 100000)) if frm >= 100000 else ('₹%dk' % (frm // 1000)) if frm >= 1000 else '₹%d' % frm
        if t['type'] == 'pct': parts.append('%s→%g%%' % (fl, t['value']))
        else: parts.append('%s→₹%s' % (fl, t['value']))
    return ' · '.join(parts)

def get_template(raw):
    key = (raw or '').strip()
    if key in raw_to_tpl:
        return raw_to_tpl[key]
    parsed = parse_slab(key)
    tid = 'tpl_%d' % (len(templates) + 1)
    tpl = {'id': tid, 'raw': key or '—', 'kind': parsed['kind'],
           'tiers': parsed['tiers'], 'label': slab_label(key, parsed)}
    templates.append(tpl)
    raw_to_tpl[key] = tid
    return tid

# build employees + collect store slab votes
employees = []
store_slab_votes = {}
TRAVEL_AMTS = [1000, 1500, 2000, 2500, 3000]
for idx, r in enumerate(prows):
    name = (r[0] or '').strip()
    site_raw = str(r[1] or '').strip()
    store_name = (r[2] or '').strip()
    empid = (r[3] or '').strip() or ('ZOBS%05d' % (idx + 1))
    base = base_code(site_raw)
    salary = int(r[5]) if isinstance(r[5], (int, float)) and r[5] else 14000
    slab_raw = (r[6] or '').strip()
    tid = get_template(slab_raw)
    store_slab_votes.setdefault(base, {}).setdefault(tid, 0)
    store_slab_votes[base][tid] += 1
    first = name.split(' ')[0].lower() if name else 'techie'
    hh = h(empid + name)
    employees.append({
        'id': 'ze_%03d' % (idx + 1), 'code': empid,
        'name': name, 'phone': '+91 %05d %05d' % (90000 + int(h(empid) * 9999), int(hh * 99999)),
        'email': re.sub(r'[^a-z]', '', first) + '.' + empid[-3:].lower() + '@sdc.in',
        'role': 'field-employee', 'status': 'active',
        'siteCode': base, 'baseSalary': salary, 'slabId': tid,
        'avatarHue': int(hh * 360),
        'presentJun': 24 + int(h(empid + 'jun') * 7),   # 24..30
        'presentJul': 26 + int(h(empid + 'jul') * 5),   # 26..30 (partial month capped later)
        'presentToday': h(empid + 't') > 0.08,
        'salesJun': 18000 + int(h(empid + 'sj') * 130000),
        'salesJul': 15000 + int(h(empid + 'sl') * 125000),
        'travelEligible': h(empid + 'tr') > 0.62,
        'travelAmount': TRAVEL_AMTS[int(h(empid + 'ta') * len(TRAVEL_AMTS))],
        'joiningDate': '20%02d-%02d-%02d' % (23 + int(h(empid + 'y') * 3), 1 + int(h(empid + 'm') * 11), 1 + int(h(empid + 'd') * 27)),
    })

# ---------- build sites from ZOB ----------
DEFAULT_TPL = get_template('30k - 5%, 50k - 10%, 90k - 15%')
none_tpl_ids = {t['id'] for t in templates if t['kind'] == 'none'}
def store_slab(code):
    votes = store_slab_votes.get(code)
    if not votes: return DEFAULT_TPL
    # prefer a real (non-"none") slab if any technician at the store has one
    real = {k: v for k, v in votes.items() if k not in none_tpl_ids}
    pool = real if real else votes
    return max(pool.items(), key=lambda kv: kv[1])[0]

sites = []
for code, z in zob.items():
    lat, lng = coords_for(z['city'], z['region'])
    is_svc = 'service' in z['store'].lower()
    sites.append({
        'id': 'st_' + code, 'code': code,
        'name': z['store'] or (z['city'] + ' Store'),
        'city': z['city'] or z['region'], 'region': z['region'], 'zone': z['zone'],
        'bm': z['bm'], 'cm': z['cm'],
        'type': 'service-centre' if is_svc else 'store',
        'lat': lat, 'lng': lng, 'radius': 120 if is_svc else 150,
        'shiftStart': '10:00', 'shiftEnd': '19:00',
        'slabId': store_slab(code),
        'netValue': int(z['netValue']) if z['netValue'] else 0,
    })

site_codes = set(zob.keys())
# map any employee whose base code has no matching site to a fallback site
fallback_site = sites[0]['code'] if sites else None
for e in employees:
    if e['siteCode'] not in site_codes:
        e['siteCode'] = fallback_site
    e['siteId'] = 'st_' + e['siteCode']

# hierarchy summaries
zones = sorted({s['zone'] for s in sites if s['zone']})
regions = sorted({(s['region'], s['zone']) for s in sites if s['region']})
regions = [{'name': r, 'zone': z} for (r, z) in regions]
bms = {}
for s in sites:
    if s['bm']:
        bms.setdefault(s['bm'], {'name': s['bm'], 'zone': s['zone'], 'regions': set(), 'stores': 0})
        bms[s['bm']]['regions'].add(s['region']); bms[s['bm']]['stores'] += 1
business_managers = [{'name': v['name'], 'zone': v['zone'], 'regions': sorted(v['regions']), 'stores': v['stores']} for v in bms.values()]
cms = {}
for s in sites:
    if s['cm']:
        cms.setdefault(s['cm'], {'name': s['cm'], 'zone': s['zone'], 'region': s['region'], 'stores': 0})
        cms[s['cm']]['stores'] += 1
cluster_managers = [{'name': v['name'], 'zone': v['zone'], 'region': v['region'], 'stores': v['stores']} for v in cms.values()]

data = {
    'zones': zones,
    'regions': regions,
    'businessManagers': business_managers,
    'clusterManagers': cluster_managers,
    'slabTemplates': templates,
    'sites': sites,
    'employees': employees,
    'defaultSlabId': DEFAULT_TPL,
    'meta': {'employeeCount': len(employees), 'siteCount': len(sites),
             'zoneCount': len(zones), 'regionCount': len(regions),
             'bmCount': len(business_managers), 'cmCount': len(cluster_managers),
             'slabTemplateCount': len(templates)},
}

out = os.path.join(BASE, "js", "data.js")
with open(out, "w", encoding="utf-8") as f:
    f.write("/* Auto-generated from ZOB Report + Payout Slab xlsx. Do not edit by hand. */\n")
    f.write("window.SDCData = ")
    f.write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    f.write(";\n")

print("WROTE", out)
print(json.dumps(data['meta'], indent=2))
print("sample templates:")
for t in templates[:12]:
    print("  ", t['id'], '|', t['kind'], '|', t['label'], '  <=', t['raw'][:45])
print("bytes:", os.path.getsize(out))
