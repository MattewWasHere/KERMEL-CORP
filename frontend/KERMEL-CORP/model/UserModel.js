(function () {
  function UserModel() {
    this.apiUrl = "http://127.0.0.1:8000/api";
  }

  UserModel.prototype.request = async function (path, data) {
    var response;
    try {
      response = await fetch(this.apiUrl + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } catch (error) {
      throw new Error("No se pudo conectar con la API. Verifica que FastAPI esté iniciado.");
    }

    var result = await response.json();
    if (!response.ok) {
      var detail = result.detail;
      if (Array.isArray(detail)) {
        detail = detail.map(function (item) {
          return item.msg;
        }).join(" ");
      }
      throw new Error(detail || "La solicitud no se pudo completar.");
    }
    return result;
  };

  UserModel.prototype.login = function (username, password) {
    return this.request("/auth/login", { username: username, password: password });
  };

  UserModel.prototype.register = function (user) {
    return this.request("/auth/register", user);
  };

  window.UserModel = UserModel;
})();
