async function test() {
  const baseUrl = 'http://localhost:3005';
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    console.log('Health:', res.status, await res.text());
    
    const res2 = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' })
    });
    console.log('Analyze:', res2.status, await res2.text());
  } catch (e) {
    console.error('No se pudo conectar al servidor local en http://localhost:3005. ¿Está corriendo `npm run dev`?', e);
  }
}
test();
