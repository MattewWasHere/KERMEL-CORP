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
      if (!this.view.validate()) return;

      this.view.setSubmitting(true, "Ingresando…");
      try {
        const user = await this.model.login(username, password);
        let session;
        try {
          session = await this.model.getCurrentUser();
        } catch (error) {
          if (error.status === 401) {
            throw new Error(
              "La API aceptó las credenciales, pero no reconoció la sesión. " +
              `Origen del frontend: ${window.location.origin}. API: ${window.KERMEL_API_BASE_URL}. ` +
              "En desarrollo HTTP, confirma que KERMEL_COOKIE_SECURE=false y que " +
              `KERMEL_ALLOWED_ORIGINS incluya ${window.location.origin}; después reinicia FastAPI. ` +
              "Abre el frontend por HTTP y usa el mismo host (localhost o 127.0.0.1) en ambos servicios."
            );
          }
          throw error;
        }

        if (String(session.id) !== String(user.id)) {
          throw new Error("No se pudo validar la sesión iniciada. Vuelve a intentarlo.");
        }

        const isAdminLogin = this.view.form?.id === "adminLoginForm";
        if (isAdminLogin && session.role !== "admin") {
          await this.model.logout();
          throw new Error("Esta cuenta no tiene permisos de administrador.");
        }
        this.view.setMessage("success", `Bienvenido ${session.username}. Acceso autorizado.`);
        this.view.resetForm();
        window.location.assign(session.role === "admin" ? "Dashboard.html" : "store.html");
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
      if (!this.view.validate({ confirmPassword: true })) return;

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
