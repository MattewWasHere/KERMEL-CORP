class UserModel {
  constructor() {
    this.users = [
      { username: "admin", email: "admin@kermelcorp.com", password: "kermel123" },
      { username: "operador", email: "ops@kermelcorp.com", password: "corp2025" },
      { username: "ventas", email: "ventas@kermelcorp.com", password: "ventas2025" }
    ];

    const storedUsers = JSON.parse(localStorage.getItem("kermelUsers") || "[]");
    this.users = [...this.users, ...storedUsers];
  }

  findUser(identifier, password) {
    const normalizedIdentifier = identifier.trim().toLowerCase();

    return this.users.find((user) => {
      const sameUsername = user.username.toLowerCase() === normalizedIdentifier;
      const sameEmail = user.email.toLowerCase() === normalizedIdentifier;
      const samePassword = user.password === password;

      return (sameUsername || sameEmail) && samePassword;
    });
  }

  saveUser(user) {
    const existing = JSON.parse(localStorage.getItem("kermelUsers") || "[]");
    existing.push(user);
    localStorage.setItem("kermelUsers", JSON.stringify(existing));
  }
}

class AuthView {
  constructor(formId, messageId) {
    this.form = document.getElementById(formId);
    this.message = document.getElementById(messageId);
    this.usernameInput = document.getElementById("username");
    this.passwordInput = document.getElementById("password");
    this.nameInput = document.getElementById("name");
    this.emailInput = document.getElementById("email");
    this.confirmPasswordInput = document.getElementById("confirmPassword");
  }

  bindSubmit(handler) {
    if (this.form) {
      this.form.addEventListener("submit", handler);
    }
  }

  getCredentials() {
    return {
      username: this.usernameInput ? this.usernameInput.value : "",
      password: this.passwordInput ? this.passwordInput.value : "",
      name: this.nameInput ? this.nameInput.value : "",
      email: this.emailInput ? this.emailInput.value : "",
      confirmPassword: this.confirmPasswordInput ? this.confirmPasswordInput.value : ""
    };
  }

  setMessage(type, text) {
    if (!this.message) return;
    this.message.className = `message ${type}`;
    this.message.textContent = text;
  }

  resetForm() {
    if (this.form) this.form.reset();
  }
}

class LoginController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  init() {
    this.view.bindSubmit(this.handleSubmit.bind(this));
  }

  handleSubmit(event) {
    event.preventDefault();
    const { username, password } = this.view.getCredentials();

    if (!username.trim() || !password.trim()) {
      this.view.setMessage("error", "Completa todos los campos para continuar.");
      return;
    }

    const user = this.model.findUser(username, password);

    if (user) {
      this.view.setMessage("success", `Bienvenido ${user.username}. Acceso autorizado.`);
      this.view.resetForm();
      return;
    }

    this.view.setMessage("error", "Credenciales incorrectas. Intenta nuevamente.");
  }
}

class RegisterController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  init() {
    this.view.bindSubmit(this.handleSubmit.bind(this));
  }

  handleSubmit(event) {
    event.preventDefault();
    const { name, email, password, confirmPassword } = this.view.getCredentials();

    if (!name.trim() || !email.trim() || !password.trim()) {
      this.view.setMessage("error", "Completa todos los campos.");
      return;
    }

    if (password !== confirmPassword) {
      this.view.setMessage("error", "Las contraseñas no coinciden.");
      return;
    }

    const user = {
      username: name.trim(),
      email: email.trim(),
      password: password.trim()
    };

    this.model.saveUser(user);
    this.view.setMessage("success", "Cuenta creada correctamente. Ya puedes iniciar sesión.");
    this.view.resetForm();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const authModel = new UserModel();

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    const userView = new AuthView("loginForm", "message");
    new LoginController(authModel, userView).init();
  }

  const adminForm = document.getElementById("adminLoginForm");
  if (adminForm) {
    const adminView = new AuthView("adminLoginForm", "adminMessage");
    const adminController = new LoginController(
      new UserModel(),
      adminView
    );
    adminController.init();
    adminView.setMessage("success", "Acceso exclusivo para administradores.");
  }

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    const registerView = new AuthView("registerForm", "registerMessage");
    new RegisterController(authModel, registerView).init();
  }
});
