document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("registerForm");
  const nombre = document.getElementById("name");
  const correo = document.getElementById("email");
  const clave = document.getElementById("password");
  const confirmar = document.getElementById("confirmPassword");
  const mensaje = document.getElementById("registerMessage");

  const campos = [nombre, correo, clave, confirmar];

  function mostrarError(campo, texto) {
    campo.classList.add("input-error");
    campo.focus();
    mensaje.textContent = texto;
    mensaje.classList.add("message-error");
  }

  function limpiar() {
    campos.forEach(function (c) {
      c.classList.remove("input-error");
    });
    mensaje.textContent = "";
    mensaje.classList.remove("message-error");
  }

  function validar() {
    limpiar();

    const valorNombre = nombre.value.trim();
    const valorCorreo = correo.value.trim();
    const valorClave = clave.value;
    const valorConfirmar = confirmar.value;

    // 1. Campos obligatorios
    if (valorNombre === "") {
      mostrarError(nombre, "El nombre completo es obligatorio.");
      return false;
    }

    if (valorCorreo === "") {
      mostrarError(correo, "El correo electrónico es obligatorio.");
      return false;
    }

    // 2. Validar la arroba y el formato del correo
    if (!valorCorreo.includes("@")) {
      mostrarError(correo, "El correo debe contener el símbolo @.");
      return false;
    }

    const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formatoCorreo.test(valorCorreo)) {
      mostrarError(correo, "El correo no es válido (ej. nombre@correo.com).");
      return false;
    }

    if (valorClave === "") {
      mostrarError(clave, "La contraseña es obligatoria.");
      return false;
    }

    if (valorClave.length < 8) {
      mostrarError(clave, "La contraseña debe tener mínimo 8 caracteres.");
      return false;
    }

    if (valorConfirmar === "") {
      mostrarError(confirmar, "Debes confirmar la contraseña.");
      return false;
    }

    // 3. Contraseñas iguales
    if (valorClave !== valorConfirmar) {
      mostrarError(confirmar, "Las contraseñas no coinciden.");
      return false;
    }

    return true;
  }

  // Quita el rojo apenas la persona empieza a corregir
  campos.forEach(function (c) {
    c.addEventListener("input", function () {
      c.classList.remove("input-error");
    });
  });

  // Corre ANTES que tu AuthController (fase de captura)
  form.addEventListener(
    "submit",
    function (evento) {
      if (!validar()) {
        evento.preventDefault();
        evento.stopImmediatePropagation();
      }
    },
    true
  );
});