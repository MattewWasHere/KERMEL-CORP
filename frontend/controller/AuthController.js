(function () {
  function LoginController(model, view) {
    this.model = model;
    this.view = view;
  }

  LoginController.prototype.init = function () {
    this.view.bindSubmit(this.handleSubmit.bind(this));
  };

  LoginController.prototype.handleSubmit = async function (event) {
    event.preventDefault();

    var credentials = this.view.getCredentials();
    var username = credentials.username;
    var password = credentials.password;

    if (!username.trim() || !password.trim()) {
      this.view.setMessage("error", "Completa todos los campos para continuar.");
      return;
    }

    try {
      var user = await this.model.login(username, password);
      this.view.setMessage("success", "Bienvenido " + user.username + ". Acceso autorizado.");
      this.view.resetForm();
      window.location.assign("Dashboard.html");
    } catch (error) {
      this.view.setMessage("error", error.message);
    }
  };

  function RegisterController(model, view) {
    this.model = model;
    this.view = view;
  }

  RegisterController.prototype.init = function () {
    this.view.bindSubmit(this.handleSubmit.bind(this));
  };

  RegisterController.prototype.handleSubmit = async function (event) {
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
      name: data.name.trim(),
      email: data.email.trim(),
      password: data.password
    };

    try {
      await this.model.register(user);
      this.view.setMessage("success", "Cuenta creada correctamente. Ya puedes iniciar sesión.");
      this.view.resetForm();
    } catch (error) {
      this.view.setMessage("error", error.message);
    }
  };

  window.LoginController = LoginController;
  window.RegisterController = RegisterController;
})();
