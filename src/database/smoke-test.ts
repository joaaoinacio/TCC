import 'reflect-metadata';

const BASE_URL = process.env.API_URL ?? 'http://localhost:3000';

function decodeJwt(token: string): { sub: string; email: string } {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

async function runStep(
  label: string,
  fn: () => Promise<Response>,
): Promise<{ ok: boolean; status: number; body: any }> {
  try {
    const res = await fn();
    let body: any = null;
    try {
      body = await res.json();
    } catch {}

    const ok = res.ok;
    const tag = ok ? '✔ OK  ' : '✖ ERRO';
    console.log(`  ${tag} [${res.status}]  ${label}`);
    if (!ok) console.log(`         → ${JSON.stringify(body)}`);

    return { ok, status: res.status, body };
  } catch (err: any) {
    console.log(`  ✖ ERRO [---]  ${label} — ${err.message}`);
    return { ok: false, status: 0, body: null };
  }
}

async function main(): Promise<void> {
  console.log(`\n── Smoke Test ──────────────────────────────`);
  console.log(`   ${BASE_URL}`);
  console.log(`────────────────────────────────────────────\n`);

  // 1. Login
  const login = await runStep('POST /auth/login', () =>
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'joao@test.com', password: '123456' }),
    }),
  );

  if (!login.ok) {
    console.log('\n  Login falhou — abortando smoke test.\n');
    process.exit(1);
  }

  const token: string = login.body.access_token;
  const { sub: userId } = decodeJwt(token);
  const auth = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. GET /users/:id  (id extraído do JWT)
  await runStep(`GET /users/:id  (id=${userId.slice(0, 8)}…)`, () =>
    fetch(`${BASE_URL}/users/${userId}`, { headers: auth }),
  );

  // 3. GET /events
  const listEvents = await runStep('GET /events', () =>
    fetch(`${BASE_URL}/events`, { headers: auth }),
  );

  // 4. POST /events
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const newEvent = await runStep('POST /events', () =>
    fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        title: 'Smoke Test Event',
        description: 'Evento criado automaticamente pelo smoke test',
        date: futureDate,
        location: 'Smoke Test Arena',
        capacity: 50,
      }),
    }),
  );

  // Resolve o eventId para criar o ticket: usa o evento recém-criado;
  // cai no primeiro evento da listagem se a criação falhou.
  const eventIdForTicket: string | undefined =
    newEvent.body?.id ?? listEvents.body?.[0]?.id;

  // Etapa auxiliar: POST /tickets — necessária para ter um ticketId válido em POST /sales
  let ticketId: string | undefined;
  if (eventIdForTicket) {
    const ticket = await runStep('POST /tickets  (auxiliar para POST /sales)', () =>
      fetch(`${BASE_URL}/tickets`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          eventId: eventIdForTicket,
          type: 'Geral',
          price: 50,
          quantity: 10,
        }),
      }),
    );
    ticketId = ticket.body?.id;
  }

  // 5. POST /sales
  if (ticketId) {
    await runStep('POST /sales', () =>
      fetch(`${BASE_URL}/sales`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ ticketId, quantity: 1 }),
      }),
    );
  } else {
    console.log('  ✖ ERRO [---]  POST /sales — ticketId indisponível, etapa ignorada');
  }

  console.log('\n────────────────────────────────────────────');
  console.log('  Smoke test concluído.');
  console.log('────────────────────────────────────────────\n');
}

main().catch((err) => {
  console.error('\nErro fatal no smoke test:', err);
  process.exit(1);
});
