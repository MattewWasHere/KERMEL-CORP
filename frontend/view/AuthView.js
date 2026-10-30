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
    this.form?.addEventListener("submit", handler);
  }

  getCredentials() {
    return {
      username: this.usernameInput?.value ?? "",
      password: this.passwordInput?.value ?? "",
      name: this.nameInput?.value ?? "",
      email: this.emailInput?.value ?? "",
      confirmPassword: this.confirmPasswordInput?.value ?? ""
    };
  }

  setMessage(type, text) {
    if (!this.message) return;
    this.message.className = "message " + type;
    this.message.textContent = text;
  }

  resetForm() {
    this.form?.reset();
  }

  setSubmitting(isSubmitting, pendingText) {
    if (!this.form) return;

    var button = this.form.querySelector('button[type="submit"]');
    if (!button) return;

    if (!button.dataset.idleLabel) {
      button.dataset.idleLabel = button.textContent.trim();
    }
    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? pendingText : button.dataset.idleLabel;
  }
}

window.AuthView = AuthView;
