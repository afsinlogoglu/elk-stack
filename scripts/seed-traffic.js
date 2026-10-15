const base = process.env.API_URL || 'http://127.0.0.1:3000';

async function request(path, options) {
  const response = await fetch(`${base}${path}`, options);
  const requestId = response.headers.get('x-request-id');
  const body = await response.text();
  console.log(`${options?.method || 'GET'} ${path} -> ${response.status} requestId=${requestId}`);
  if (body) console.log(body);
  return response;
}

const products = ['p1', 'p2', 'p3'];

async function main() {
  await request('/products');
  await request('/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ productId: 'missing', quantity: 1 }),
  });
  await request('/orders', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'seed-order-1',
    },
    body: JSON.stringify({ productId: 'p1', quantity: 2 }),
  });
  await request('/error-test');

  for (let i = 2; i <= 40; i += 1) {
    const productId = products[i % products.length];
    await request('/products');
    await request('/orders', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': `seed-order-${i}`,
      },
      body: JSON.stringify({ productId, quantity: (i % 3) + 1 }),
    });

    if (i % 7 === 0) {
      await request('/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId: 'missing', quantity: 0 }),
      });
    }

    if (i % 5 === 0) {
      await request('/error-test');
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
