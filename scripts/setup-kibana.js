const kibana = process.env.KIBANA_URL || 'http://127.0.0.1:5601';
const dataViewName = 'backend-logs';
const dataViewTitle = 'backend-logs-*';

async function waitForKibana() {
  const deadline = Date.now() + 3 * 60 * 1000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${kibana}/api/status`);
      if (response.ok) {
        const body = await response.json();
        if (body?.status?.overall?.level === 'available') return;
      }
    } catch {
      // Kibana is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Kibana did not become available at ${kibana}`);
}

async function findDataView() {
  const response = await fetch(`${kibana}/api/data_views`, {
    headers: { 'kbn-xsrf': 'true' },
  });
  if (!response.ok) {
    throw new Error(`List data views failed: ${response.status} ${await response.text()}`);
  }
  const body = await response.json();
  const views = body.data_view || body.data_views || [];
  return views.find((view) => view.title === dataViewTitle || view.name === dataViewName);
}

async function main() {
  await waitForKibana();
  const existing = await findDataView();
  if (existing) {
    console.log(`Data view already exists: ${existing.id} (${existing.title})`);
    return;
  }

  const response = await fetch(`${kibana}/api/data_views/data_view`, {
    method: 'POST',
    headers: {
      'kbn-xsrf': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      data_view: {
        title: dataViewTitle,
        name: dataViewName,
        timeFieldName: '@timestamp',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Create data view failed: ${response.status} ${await response.text()}`);
  }

  const created = await response.json();
  console.log(`Created data view ${created.data_view?.id} (${dataViewTitle})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
