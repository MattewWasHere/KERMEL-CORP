(function () {
  function AuthView(formId, messageId) {
    this.form = document.getElementById(formId);
    this.message = document.getElementById(messageId);
    this.usernameInput = document.getElementById("username");
    this.passwordInput = document.getElementById("password");
    this.nameInput = document.getElementById("name");
    this.emailInput = document.getElementById("email");
    this.confirmPasswordInput = document.getElementById("confirmPassword");
  }

  AuthView.prototype.bindSubmit = function (handler) {
    if (this.form) {
      this.form.addEventListener("submit", handler);
    }
  };

  AuthView.prototype.getCredentials = function () {
    return {
      username: this.usernameInput ? this.usernameInput.value : "",
      password: this.passwordInput ? this.passwordInput.value : "",
      name: this.nameInput ? this.nameInput.value : "",
      email: this.emailInput ? this.emailInput.value : "",
      confirmPassword: this.confirmPasswordInput ? this.confirmPasswordInput.value : ""
    };
  };

  AuthView.prototype.setMessage = function (type, text) {
    if (!this.message) return;
    this.message.className = "message " + type;
    this.message.textContent = text;
  };

  AuthView.prototype.resetForm = function () {
    if (this.form) this.form.reset();
  };

  window.AuthView = AuthView;
})();
