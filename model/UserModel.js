(function () {
  function UserModel() {
    this.users = [
      { username: "admin", email: "admin@kermelcorp.com", password: "kermel123" },
      { username: "operador", email: "ops@kermelcorp.com", password: "corp2025" },
      { username: "ventas", email: "ventas@kermelcorp.com", password: "ventas2025" }
    ];

    var storedUsers = JSON.parse(localStorage.getItem("kermelUsers") || "[]");
    this.users = this.users.concat(storedUsers);
  }

  UserModel.prototype.findUser = function (identifier, password) {
    var normalizedIdentifier = String(identifier || "").trim().toLowerCase();

    return this.users.find(function (user) {
      var sameUsername = user.username.toLowerCase() === normalizedIdentifier;
      var sameEmail = user.email.toLowerCase() === normalizedIdentifier;
      var samePassword = user.password === password;

      return (sameUsername || sameEmail) && samePassword;
    });
  };

  UserModel.prototype.saveUser = function (user) {
    var existing = JSON.parse(localStorage.getItem("kermelUsers") || "[]");
    existing.push(user);
    localStorage.setItem("kermelUsers", JSON.stringify(existing));
  };

  window.UserModel = UserModel;
})();
