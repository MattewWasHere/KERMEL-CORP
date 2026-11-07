class AuthView {
  constructor(formId, messageId) {
    this.form = document.getElementById(formId);
    this.message = document.getElementById(messageId);
    if (this.form) this.form.noValidate = true;
    this.usernameInput = document.getElementById("username");
    this.passwordInput = document.getElementById("password");
    this.nameInput = document.getElementById("name");
    this.emailInput = document.getElementById("email");
    this.confirmPasswordInput = document.getElementById("confirmPassword");

    this.form?.querySelectorAll("input, select, textarea").forEach(field => {
      field.addEventListener("input", () => this.clearValidation());
      field.addEventListener("change", () => this.clearValidation());
    });
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

  validate({ confirmPassword = false } = {}) {
    if (!this.form) return false;

    const fields = [...this.form.querySelectorAll("input, select, textarea")];
    fields.forEach(field => field.setCustomValidity(""));

    if (confirmPassword && this.passwordInput?.value !== this.confirmPasswordInput?.value) {
      this.confirmPasswordInput?.setCustomValidity("Las contraseñas no coinciden.");
    }

    fields.forEach(field => {
      const label = field.labels?.[0]?.textContent.trim() || "Este campo";
      const value = field.value;
      let error = "";

      if (field.validity.valueMissing || (field.required && !value.trim())) {
        error = `${label} es obligatorio.`;
      } else if (field.validity.valid) {
        return;
      } else if (field.validity.typeMismatch) {
        error = field.type === "email"
          ? "Ingresa un correo electrónico válido."
          : `${label}: el formato ingresado no es válido.`;
      } else if (field.validity.tooShort) {
        error = `${label} debe tener al menos ${field.minLength} caracteres.`;
      } else if (field.validity.tooLong) {
        error = `${label} no puede superar ${field.maxLength} caracteres.`;
      } else if (field.validity.rangeUnderflow) {
        error = `${label} debe ser igual o mayor que ${field.min}.`;
      } else if (field.validity.rangeOverflow) {
        error = `${label} debe ser igual o menor que ${field.max}.`;
      } else if (field.validity.stepMismatch) {
        error = `${label} debe tener un valor válido.`;
      } else if (field.validity.badInput) {
        error = `${label}: ingresa un valor válido.`;
      } else if (field.validity.customError) {
        error = field.validationMessage;
      }

      if (error && !field.validity.customError) field.setCustomValidity(error);
    });

    const invalidField = fields.find(field => !field.validity.valid);
    if (!invalidField) return true;

    invalidField.reportValidity();
    this.setMessage("error", invalidField.validationMessage);
    return false;
  }

  clearValidation() {
    this.form?.querySelectorAll("input, select, textarea").forEach(field => {
      field.setCustomValidity("");
    });
    if (this.message?.classList.contains("error")) {
      this.setMessage("", "");
    }
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
