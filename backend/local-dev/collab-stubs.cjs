/**
 * Collaborator stubs for flight-service local E2E.
 * auth-service :5910 (/user/*), payment-service :5914 (/api/pay/*),
 * email-service :5915 (/api/v1/*). Wallet ops append to a ledger observable
 * at GET /__ledger; POST /__reset clears it (always reset before asserting).
 */
const http = require('http');

const ledger = [];
const note = (entry) => {
  ledger.push({ ...entry, at: new Date().toISOString() });
  console.log('[ledger]', JSON.stringify(entry));
};

let lastOrigin = 'http://localhost:5173';
const json = (res, code, body, req) => {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    // withCredentials requests forbid the wildcard — echo the caller's origin
    'Access-Control-Allow-Origin': (req && req.headers.origin) || lastOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,apikey',
    'Vary': 'Origin',
  });
  res.end(JSON.stringify(body));
};

const preflight = (req, res) => {
  if (req.method !== 'OPTIONS') return false;
  json(res, 204, {}, req);
  return true;
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({ raw }); }
    });
  });

// ---- auth-service :5910 ----
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const body = await readBody(req);

  if (preflight(req, res)) return;
  if (p === '/__ledger') return json(res, 200, ledger, req);

  if (p === '/user/wallet/b2c') {
    note({ op: 'wallet-view', amount: Number(url.searchParams.get('amount') || 0) });
    return json(res, 200, { success: true, data: { balance: 10_000_000, currency: 'INR', canUseWallet: true } }, req);
  }
  if (p === '/__reset') { ledger.length = 0; return json(res, 200, { reset: true }, req); }

  if (p === '/user/auth/validate-token')
    return json(res, 200, {
      success: true,
      data: { userId: 'local-e2e-user', email: 'kakisekhar4u@gmail.com', roles: ['user'], clientType: 'b2b' },
    }, req);

  if (p.startsWith('/user/book/check-balance/')) {
    const bookingId = p.split('/').pop();
    const required = Number(url.searchParams.get('totalPrice') || 0);
    note({ op: 'check-balance', bookingId, required });
    return json(res, 200, {
      success: true,
      isAlreadyPaid: false,
      data: {
        hasSufficientBalance: true,
        currentBalance: 10_000_000,
        requiredAmount: required,
        shortfallAmount: 0,
      },
    }, req);
  }

  if (p === '/user/book/pay') {
    note({ op: 'debit', bookingId: body.bookingId, amount: Number(body.totalPrice) });
    return json(res, 200, { success: true, message: 'wallet debited (stub)' }, req);
  }

  if (p === '/user/wallet/credit') {
    note({ op: 'credit', bookingId: body.bookingId, amount: Number(body.amount ?? body.totalPrice) });
    return json(res, 200, { success: true, message: 'wallet credited (stub)' }, req);
  }

  if (p.startsWith('/user/markup/'))
    return json(res, 200, { services: [{ percentageMarkup: 0, fixedMarkup: 0 }], appliedTo: 'BASE_FARE' }, req);

  console.log('[auth-stub] unhandled', req.method, p);
  return json(res, 200, { success: true, stub: 'auth fallthrough' }, req);
}).listen(5910, () => console.log('auth-service stub on :5910'));

// ---- payment-service :5914 ----
http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  if (preflight(req, res)) return;
  if (p.includes('/razorpay/razorpay-order/'))
    return json(res, 200, { success: true, data: { orderId: p.split('/').pop(), status: 'paid' } }, req);
  console.log('[pay-stub] unhandled', req.method, p);
  return json(res, 200, { success: true, stub: 'payment fallthrough' }, req);
}).listen(5914, () => console.log('payment-service stub on :5914'));

// ---- email-service :5915 ----
http.createServer(async (req, res) => {
  if (preflight(req, res)) return;
  console.log('[email-stub]', req.method, new URL(req.url, 'http://x').pathname);
  return json(res, 200, { success: true, stub: 'email accepted' }, req);
}).listen(5915, () => console.log('email-service stub on :5915'));
