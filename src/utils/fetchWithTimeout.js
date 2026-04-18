const resolveTimeoutMs = () => {
  const configured = Number(process.env.FETCH_TIMEOUT_MS);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return 10000;
};

const DEFAULT_FETCH_TIMEOUT_MS = resolveTimeoutMs();

const fetchWithTimeout = async (url, options = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) => {
  if (typeof fetch !== 'function') {
    const runtimeError = new Error('Server runtime does not support fetch.');
    runtimeError.code = 'FETCH_NOT_SUPPORTED';
    throw runtimeError;
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(`Request timed out after ${timeoutMs}ms`);
      timeoutError.code = 'FETCH_TIMEOUT';
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
};

module.exports = {
  DEFAULT_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
};