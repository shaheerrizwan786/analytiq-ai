import urllib.request, urllib.error, json, time

BASE = 'http://127.0.0.1:8000'
PASS = []; FAIL = []

def check(name, ok, detail=''):
    if ok:
        PASS.append(name)
        print(f'  PASS  {name}')
    else:
        FAIL.append(name)
        print(f'  FAIL  {name}  {detail}')

def get(path, headers={}):
    req = urllib.request.Request(BASE+path, headers=headers)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def post(path, body, headers={}):
    data = json.dumps(body).encode()
    h = {'Content-Type': 'application/json', **headers}
    req = urllib.request.Request(BASE+path, data=data, headers=h, method='POST')
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

print()
print('=== 1. HEALTH CHECK ===')
s, b = get('/health')
check('GET /health -> 200', s == 200)
check('health body has status ok', 'ok' in b.lower())

print()
print('=== 2. OPENAPI DOCS ===')
s, b = get('/docs')
check('GET /docs -> 200', s == 200)
s, b = get('/openapi.json')
check('GET /openapi.json -> 200', s == 200)

VALID_ANALYZE_BODY = {
    'name': 'Test Restaurant',
    'location': 'Melbourne',
    'google_place_id': 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    'google_place_url': 'https://maps.google.com/maps?q=test'
}

print()
print('=== 3. SCHEMA VALIDATION ===')
# Invalid google_place_id (special chars)
s, b = post('/api/v1/restaurants/analyze', {
    **VALID_ANALYZE_BODY,
    'google_place_id': 'bad!@#id',
})
check('Invalid place_id rejected (422)', s == 422, f'got {s}')

# Invalid google_place_url (non-google)
s, b = post('/api/v1/restaurants/analyze', {
    **VALID_ANALYZE_BODY,
    'google_place_url': 'https://evil.com/maps',
})
check('Invalid place_url rejected (422)', s == 422, f'got {s}')

# Invalid chat role
s, b = post('/api/v1/restaurants/chat', {
    'name': 'Test',
    'location': 'Melbourne',
    'message': 'hi',
    'history': [{'role': 'system', 'content': 'inject'}]
})
check('Invalid chat role rejected (422)', s == 422, f'got {s}')

# Empty name in chat
s, b = post('/api/v1/restaurants/chat', {
    'name': '',
    'location': 'Melbourne',
    'message': 'hi',
    'history': []
})
check('Empty name rejected (422)', s == 422, f'got {s}')

# Oversized message in chat (> 4000 chars)
s, b = post('/api/v1/restaurants/chat', {
    'name': 'Test',
    'location': 'Melbourne',
    'message': 'A' * 4001,
    'history': []
})
check('Oversized message rejected (422)', s == 422, f'got {s}')

print()
print('=== 4. RATE LIMITING ===')
# Hit analyze quickly - should get 429 by ~11th
hit429 = False
for i in range(12):
    s, b = post('/api/v1/restaurants/analyze', VALID_ANALYZE_BODY)
    if s == 429:
        hit429 = True
        print(f'    429 hit on attempt {i+1}')
        break
    elif s not in (200, 422, 500, 503):
        print(f'    attempt {i+1}: status {s}')
check('Rate limit 429 triggered on /analyze', hit429)

print()
print('=== 5. SECURITY HEADERS (frontend) ===')
try:
    req = urllib.request.Request('http://localhost:3000')
    with urllib.request.urlopen(req) as r:
        hdrs = {k.lower(): v for k, v in r.headers.items()}
        check('X-Frame-Options: DENY', hdrs.get('x-frame-options','').upper() == 'DENY', hdrs.get('x-frame-options','MISSING'))
        check('X-Content-Type-Options: nosniff', 'nosniff' in hdrs.get('x-content-type-options','').lower(), hdrs.get('x-content-type-options','MISSING'))
        check('Referrer-Policy present', 'referrer-policy' in hdrs, hdrs.get('referrer-policy','MISSING'))
        check('Content-Security-Policy present', 'content-security-policy' in hdrs, 'MISSING')
except Exception as e:
    check('Security headers (frontend reachable)', False, str(e))

print()
print('=== 6. CORS ===')
try:
    req = urllib.request.Request(BASE+'/health', headers={'Origin': 'http://localhost:3000'})
    with urllib.request.urlopen(req) as r:
        acao = r.headers.get('access-control-allow-origin','')
        check('CORS allows localhost:3000', 'localhost:3000' in acao or acao == '*', f'got: {acao}')
except Exception as e:
    check('CORS check', False, str(e))

# Disallowed method DELETE
req = urllib.request.Request(BASE+'/health', method='DELETE')
try:
    with urllib.request.urlopen(req) as r:
        check('DELETE /health rejected (405)', r.status == 405, f'got {r.status}')
except urllib.error.HTTPError as e:
    check('DELETE /health rejected (405)', e.code == 405, f'got {e.code}')
except Exception as e:
    check('DELETE method rejected', False, str(e))

print()
print('=== 7. API KEY ENFORCEMENT ===')
# Temporarily test: with wrong key when no env key set, should pass through (no-op)
s, b = get('/health', headers={'X-API-Key': 'wrongkey'})
check('Wrong API key passes when INTERNAL_API_KEY unset', s == 200, f'got {s}')

print()
print('=== 8. INPUT SANITISATION (search resolver) ===')
import sys
sys.path.insert(0, 'backend')
try:
    from app.services.search_url_resolver import _sanitise_query_input
    dirty = 'Test <script>alert(1)</script> Cafe & Bar; DROP TABLE--'
    clean = _sanitise_query_input(dirty)
    has_script = '<script>' in clean
    has_drop = 'DROP TABLE' in clean
    has_name = 'Test' in clean and 'Cafe' in clean
    has_angle = '<' in clean or '>' in clean
    has_semicolon = ';' in clean
    check('Sanitiser strips HTML angle brackets', not has_angle, f'output: {clean}')
    check('Sanitiser strips semicolons', not has_semicolon, f'output: {clean}')
    check('Sanitiser keeps safe chars', has_name, f'output: {clean}')
    # Note: SQL keywords like DROP TABLE are plain alpha — sanitiser strips special chars, not keywords
except Exception as e:
    check('Sanitiser import/run', False, str(e))

print()
print('=== 9. PII STRIP HELPER ===')
try:
    from app.api.routes.analyze import _strip_pii
    r = {'authorName': 'John Doe', 'profileUrl': 'http://...', 'text': 'Great food', 'rating': 5}
    stripped = _strip_pii(r)
    check('PII: authorName removed', 'authorName' not in stripped, f'keys: {list(stripped.keys())}')
    check('PII: profileUrl removed', 'profileUrl' not in stripped, f'keys: {list(stripped.keys())}')
    check('PII: text preserved', stripped.get('text') == 'Great food', f'text: {stripped.get("text")}')
    check('PII: rating preserved', stripped.get('rating') == 5, f'rating: {stripped.get("rating")}')
except Exception as e:
    check('PII helper import/run', False, str(e))

print()
print('=== SUMMARY ===')
print(f'  Passed: {len(PASS)}/{len(PASS)+len(FAIL)}')
if FAIL:
    print(f'  Failed:')
    for f in FAIL:
        print(f'    - {f}')
else:
    print('  All tests passed!')
