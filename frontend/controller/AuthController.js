(function () {
  class LoginController {
    constructor(model, view) {
      this.model = model;
      this.view = view;
    }

    init() {
      this.view.bindSubmit(event => this.handleSubmit(event));
    }

    async handleSubmit(event) {
      event.preventDefault();

      const { username, password } = this.view.getCredentials();
      if (!username.trim() || !password.trim()) {
        this.view.setMessage("error", "Completa todos los campos para continuar.");
        return;
      }

      this.view.setSubmitting(true, "Ingresando…");
      try {
        const user = await this.model.login(username, password);
        this.view.setMessage("success", `Bienvenido ${user.username}. Acceso autorizado.`);
        this.view.resetForm();
        window.location.assign("Dashboard.html");
      } catch (error) {
        this.view.setMessage("error", error.message);
      } finally {
        this.view.setSubmitting(false);
      }
    }
  }

  class RegisterController {
    constructor(model, view) {
      this.model = model;
      this.view = view;
    }

    init() {
      this.view.bindSubmit(event => this.handleSubmit(event));
    }

    async handleSubmit(event) {
      event.preventDefault();

      const data = this.view.getCredentials();
      if (!data.name.trim() || !data.email.trim() || !data.password.trim()) {
        this.view.setMessage("error", "Completa todos los campos.");
        return;
      }

      if (data.password !== data.confirmPassword) {
        this.view.setMessage("error", "Las contraseñas no coinciden.");
        return;
      }

      const user = {
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password
      };

      this.view.setSubmitting(true, "Creando cuenta…");
      try {
        await this.model.register(user);
        this.view.setMessage("success", "Cuenta creada correctamente. Ya puedes iniciar sesión.");
        this.view.resetForm();
      } catch (error) {
        this.view.setMessage("error", error.message);
      } finally {
        this.view.setSubmitting(false);
      }
    }
  }

  window.LoginController = LoginController;
  window.RegisterController = RegisterController;
})();
