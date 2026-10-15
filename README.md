# Backend Log Monitoring

Küçük bir e-commerce API JSON Lines log üretir. Logstash dosyayı okur, Elasticsearch indeksler, Kibana Discover üzerinden incelersin. API host üzerinde çalışır. Elasticsearch, Logstash ve Kibana Docker Compose ile ayağa kalkar.

## Servisler

- API: `http://127.0.0.1:3000`
- Elasticsearch: `http://127.0.0.1:9200`
- Kibana: `http://127.0.0.1:5601`

Portlar yalnız localhost'a bağlanır. Bu lab için `xpack.security.enabled=false`. Elasticsearch'ü internete açma.

## Başlatma

Docker Desktop'a en az 4 GB memory ver. Elasticsearch heap 512m, Logstash heap 512m.

```bash
docker compose up -d
```

```bash
cd app
npm install
npm start
```

Başka bir terminalde örnek trafik ve Kibana data view:

```bash
node scripts/seed-traffic.js
node scripts/setup-kibana.js
```

`setup-kibana.js` Kibana `available` olana kadar bekler, sonra `backend-logs-*` data view oluşturur. Time field `@timestamp`.

## Log akışı

API `logs/app.log` dosyasına yazar. Logstash bu dosyayı `/logs/app.log` olarak okur (`stat_interval` 1s, Windows bind mount üzerinde poll). Index adı `backend-logs-YYYY.MM.dd`.

Her satırda `timestamp`, `level`, `service`, `method`, `path`, `statusCode`, `durationMs`, `message`, `requestId`, `event` vardır.

- `GET /products` — `product-service`, `http_access`
- `POST /orders` — geçerli body 201 ve `order_created`; geçersiz body 400
- `GET /error-test` — 500, message `Order creation failed`

Aynı isteğin access log'u ve business log'u aynı `requestId` ile yazılır. Header `x-request-id` gönderirsen o değer kullanılır.

## Kibana Discover

Data view: `backend-logs`. Time picker: Last 1 hour veya Last 15 minutes.

- Son bir saatte kaç 500: KQL `statusCode: 500`
- En çok hata veren endpoint: KQL `statusCode >= 400`, breakdown field `path`
- Ortalama response time: metric `Average` of `durationMs`, KQL `event: http_access`
- Hangi servis hata üretiyor: KQL `level: error`, breakdown field `service`
- Tek isteğin logları: KQL `requestId: "seed-order-1"`

`event: http_access` sadece HTTP access satırıdır. `event: order_created` sipariş business event'idir. Ortalama response time için access satırını kullan; business satırı aynı isteği ikinci kez saymasın.

Pipeline çıktısını görmek için:

```bash
docker compose logs -f logstash
```

Index sayısını kontrol:

```bash
curl http://127.0.0.1:9200/backend-logs-*/_count
```
