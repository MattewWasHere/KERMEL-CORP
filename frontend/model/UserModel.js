class UserModel {
  request(path, data) {
    return window.KERMEL_API.request(
      path,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      },
      "La solicitud no se pudo completar."
    );
  }

  login(username, password) {
    return this.request("/auth/login", { username: username, password: password });
  }

  getCurrentUser() {
    return window.KERMEL_API.request("/auth/me");
  }

  register(user) {
    return this.request("/auth/register", user);
  }

  logout() {
    return window.KERMEL_API.request("/auth/logout", { method: "POST" });
  }
}

window.UserModel = UserModel;
