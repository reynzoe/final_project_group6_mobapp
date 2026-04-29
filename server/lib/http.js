class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  });
  response.end(JSON.stringify(payload));
}

function handleOptions(request, response) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return true;
  }

  return false;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let rawBody = '';

    request.on('data', (chunk) => {
      rawBody += chunk.toString();

      if (rawBody.length > 1_000_000) {
        reject(new AppError(413, 'Request body is too large.'));
      }
    });

    request.on('end', () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch {
        reject(new AppError(400, 'Request body must be valid JSON.'));
      }
    });

    request.on('error', () => {
      reject(new AppError(400, 'Unable to read the request body.'));
    });
  });
}

function getRequestUrl(request) {
  return new URL(request.url, `http://${request.headers.host || 'localhost'}`);
}

function getBearerToken(request) {
  const header = request.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.replace('Bearer ', '').trim();
}

function handleError(response, error) {
  if (error instanceof AppError) {
    sendJson(response, error.statusCode, {
      message: error.message,
      details: error.details,
    });
    return;
  }

  sendJson(response, 500, {
    message: 'The server encountered an unexpected error.',
  });
}

module.exports = {
  AppError,
  sendJson,
  handleOptions,
  readJsonBody,
  getRequestUrl,
  getBearerToken,
  handleError,
};
