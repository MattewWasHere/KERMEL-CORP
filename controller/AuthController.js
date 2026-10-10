(function () {
  function LoginController(model, view) {
    this.model = model;
    this.view = view;
  }

  LoginController.prototype.init = function () {
    this.view.bindSubmit(this.handleSubmit.bind(this));
  };

  LoginController.prototype.handleSubmit = function (event) {
    event.preventDefault();

    var credentials = this.view.getCredentials();
    var username = credentials.username;
    var password = credentials.password;

    if (!username.trim() || !password.trim()) {
      this.view.setMessage("error", "Completa todos los campos para continuar.");
      return;
    }

    var user = this.model.findUser(username, password);

    if (user) {
      this.view.setMessage("success", "Bienvenido " + user.username + ". Acceso autorizado.");
      this.view.resetForm();
      return;
    }

    this.view.setMessage("error", "Credenciales incorrectas. Intenta nuevamente.");
  };

  function RegisterController(model, view) {
    this.model = model;
    this.view = view;
  }

  RegisterController.prototype.init = function () {
    this.view.bindSubmit(this.handleSubmit.bind(this));
  };

  RegisterController.prototype.handleSubmit = function (event) {
    event.preventDefault();

    var data = this.view.getCredentials();

    if (!data.name.trim() || !data.email.trim() || !data.password.trim()) {
      this.view.setMessage("error", "Completa todos los campos.");
      return;
    }

    if (data.password !== data.confirmPassword) {
      this.view.setMessage("error", "Las contraseñas no coinciden.");
      return;
    }

    var user = {
      username: data.name.trim(),
      email: data.email.trim(),
      password: data.password.trim()
    };

    this.model.saveUser(user);
    this.view.setMessage("success", "Cuenta creada correctamente. Ya puedes iniciar sesión.");
    this.view.resetForm();
  };

  window.LoginController = LoginController;
  window.RegisterController = RegisterController;
})();
