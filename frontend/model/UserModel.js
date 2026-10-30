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

  register(user) {
    return this.request("/auth/register", user);
  }
}

window.UserModel = UserModel;
