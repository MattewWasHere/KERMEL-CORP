(function () {
  const protocol = ["http:", "https:"].includes(window.location.protocol)
    ? window.location.protocol
    : "http:";
  const hostname = window.location.hostname || "127.0.0.1";

  const baseUrl = `${protocol}//${hostname}:8000/api`;

  async function request(path, options = {}, fallbackMessage = "La solicitud no se pudo completar.") {
    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        credentials: "include"
      });
    } catch {
      throw new Error("No se pudo conectar con la API. Verifica que FastAPI esté iniciado.");
    }

    let result;
    try {
      result = await response.json();
    } catch {
      if (!response.ok) {
        const hint = response.status === 403
          ? " Verifica el origen del frontend y que uses la API en el puerto 8000."
          : "";
        const error = new Error(
          `La API respondió con un error HTTP ${response.status}.${hint}`
        );
        error.status = response.status;
        throw error;
      }
      throw new Error("La API devolvió una respuesta no válida.");
    }

    if (!response.ok) {
      const detail = Array.isArray(result?.detail)
        ? result.detail.map(error => error.msg).join(" ")
        : result?.detail;
      const error = new Error(
        detail || (response.status === 401 ? "La sesión expiró." : fallbackMessage)
      );
      error.status = response.status;
      throw error;
    }

    return result;
  }

  window.KERMEL_API_BASE_URL = baseUrl;
  window.KERMEL_API = { baseUrl, request };
})();
