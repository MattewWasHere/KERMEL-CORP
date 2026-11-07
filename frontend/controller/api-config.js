(function () {
  const protocol = ["http:", "https:"].includes(window.location.protocol)
    ? window.location.protocol
    : "http:";
  const hostname = window.location.hostname || "127.0.0.1";

  const baseUrl = `${protocol}//${hostname}:8000/api`;

  const fieldLabels = {
    username: "Usuario o correo",
    password: "Contraseña",
    name: "Nombre",
    email: "Correo electrónico",
    confirmPassword: "Confirmar contraseña",
    category_id: "Categoría",
    price: "Precio",
    stock: "Stock",
    quantity: "Cantidad",
    product_id: "Producto"
  };

  function formatValidationError(error) {
    const location = error.loc || [];
    const field = fieldLabels[location[location.length - 1]] || "El campo";
    switch (error.type) {
      case "missing":
        return `${field} es obligatorio.`;
      case "string_too_short":
        return `${field} debe tener al menos ${error.ctx?.min_length ?? 1} caracteres.`;
      case "string_too_long":
        return `${field} no puede superar ${error.ctx?.max_length ?? "el límite permitido"} caracteres.`;
      case "greater_than_equal":
        return `${field} debe ser igual o mayor que ${error.ctx?.ge ?? 0}.`;
      case "less_than_equal":
        return `${field} debe ser igual o menor que ${error.ctx?.le ?? 0}.`;
      case "int_parsing":
      case "int_type":
      case "float_parsing":
      case "int_from_float":
        return `${field}: ingresa un número entero válido.`;
      case "string_type":
        return `${field}: ingresa un texto válido.`;
      case "string_pattern_mismatch":
        return `${field}: el formato ingresado no es válido.`;
      case "url_parsing":
        return `${field}: ingresa una dirección URL válida.`;
      case "greater_than":
        return `${field} debe ser mayor que ${error.ctx?.gt ?? 0}.`;
      case "less_than":
        return `${field} debe ser menor que ${error.ctx?.lt ?? 0}.`;
      case "value_error":
        return `${field}: el valor ingresado no es válido.`;
      default:
        return error.msg || "Revisa los datos ingresados.";
    }
  }

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

    if (response.status === 204) return null;

    let result;
    try {
      const body = await response.text();
      result = body ? JSON.parse(body) : null;
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
        ? result.detail.map(formatValidationError).join(" ")
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
