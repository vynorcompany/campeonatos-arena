// Self-contained fallback: no scripts, remote assets, or customer data.
export const PORTAL_PWA_OFFLINE_DOCUMENT = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'">
<title>Sem conexão · Portal do Atleta</title>

</head>
<body><main><h1>Sem conexão</h1><p>Conecte-se à internet para acessar o Portal do Atleta.</p><a href="/portal">Tentar novamente</a></main></body>
</html>`;
