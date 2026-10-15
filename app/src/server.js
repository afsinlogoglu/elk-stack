const { randomUUID } = require('crypto');
const express = require('express');
const logger = require('./logger');

const PORT = Number(process.env.PORT || 3000);
const app = express();

const products = [
  { id: 'p1', name: 'Notebook', price: 1200 },
  { id: 'p2', name: 'Headphones', price: 180 },
  { id: 'p3', name: 'Keyboard', price: 90 },
];

const orders = [];

function serviceFor(path) {
  if (path.startsWith('/products')) return 'product-service';
  return 'order-service';
}

app.use(express.json());

app.use((req, res, next) => {
  const requestId = req.get('x-request-id') || randomUUID();
  const start = process.hrtime.bigint();
  req.requestId = requestId;
  req.startedAt = start;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const statusCode = res.statusCode;
    const durationMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const message =
      res.locals.logMessage || (statusCode >= 500 ? 'request failed' : 'request completed');

    logger[level](
      {
        service: serviceFor(req.path),
        method: req.method,
        path: req.path,
        statusCode,
        durationMs,
        requestId,
        event: 'http_access',
      },
      message
    );
  });

  next();
});

app.get('/products', (req, res) => {
  res.json({ products });
});

app.post('/orders', (req, res) => {
  const { productId, quantity } = req.body || {};
  const product = products.find((item) => item.id === productId);
  const qty = Number(quantity);

  if (!product || !Number.isInteger(qty) || qty < 1) {
    res.locals.logMessage = 'Invalid order';
    res.status(400).json({ error: 'Invalid order' });
    return;
  }

  const order = {
    id: `o${orders.length + 1}`,
    productId: product.id,
    quantity: qty,
    total: product.price * qty,
  };
  orders.push(order);

  const durationMs = Math.round(Number(process.hrtime.bigint() - req.startedAt) / 1e6);
  logger.info(
    {
      service: 'order-service',
      method: req.method,
      path: req.path,
      statusCode: 201,
      durationMs,
      requestId: req.requestId,
      event: 'order_created',
      orderId: order.id,
      productId: order.productId,
      quantity: order.quantity,
    },
    'Order created'
  );

  res.status(201).json({ order });
});

app.get('/error-test', (req, res, next) => {
  const error = new Error('Order creation failed');
  error.statusCode = 500;
  next(error);
});

app.use((req, res) => {
  res.locals.logMessage = 'Not found';
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'request failed';
  res.locals.logMessage = message;
  res.status(statusCode).json({ error: message });
});

app.listen(PORT, () => {
  logger.info(
    {
      service: 'ecommerce-api',
      method: 'BOOT',
      path: '/',
      statusCode: 0,
      durationMs: 0,
      requestId: 'startup',
      event: 'startup',
    },
    `API listening on ${PORT}`
  );
});
