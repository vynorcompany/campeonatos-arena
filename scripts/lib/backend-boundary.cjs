function isBackendApiRequest(value) {
  try {
    const url = new URL(value, 'http://backend.invalid');
    return url.origin === 'http://backend.invalid' && url.pathname.startsWith('/api/');
  } catch { return false; }
}

function backendOnlyHandler(handle) {
  return (request, response) => {
    if (isBackendApiRequest(request.url)) return handle(request, response);
    response.writeHead(404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end('{"error":"Not found"}');
  };
}

module.exports = { isBackendApiRequest, backendOnlyHandler };
