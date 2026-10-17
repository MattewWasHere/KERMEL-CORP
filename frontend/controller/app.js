document.addEventListener("DOMContentLoaded", () => {
  const authModel = new UserModel();
  const forms = [
    { id: "loginForm", messageId: "message", Controller: LoginController },
    { id: "adminLoginForm", messageId: "adminMessage", Controller: LoginController },
    { id: "registerForm", messageId: "registerMessage", Controller: RegisterController }
  ];

  forms.forEach(({ id, messageId, Controller }) => {
    if (!document.getElementById(id)) return;
    const view = new AuthView(id, messageId);
    new Controller(authModel, view).init();
  });
});
