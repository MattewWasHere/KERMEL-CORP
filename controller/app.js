document.addEventListener("DOMContentLoaded", function () {
  var authModel = new UserModel();

  var loginForm = document.getElementById("loginForm");
  if (loginForm) {
    var userView = new AuthView("loginForm", "message");
    new LoginController(authModel, userView).init();
  }

  var adminForm = document.getElementById("adminLoginForm");
  if (adminForm) {
    var adminView = new AuthView("adminLoginForm", "adminMessage");
    new LoginController(authModel, adminView).init();
    adminView.setMessage("success", "Acceso exclusivo para administradores.");
  }

  var registerForm = document.getElementById("registerForm");
  if (registerForm) {
    var registerView = new AuthView("registerForm", "registerMessage");
    new RegisterController(authModel, registerView).init();
  }
});
