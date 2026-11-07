(() => {
  const api = window.KERMEL_API;
  const byId = id => document.getElementById(id);
  const currency = amount => Number(amount || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  });
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const safeImageUrl = value => {
    if (!value) return null;
    try {
      const url = new URL(value, window.location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  };
  let categories = [];
  let brands = [];
  let selectedCategoryId = "";
  let cart = { items: [], total: 0 };

  function setMessage(id, text, type = "") {
    const element = byId(id);
    element.textContent = text;
    element.className = `store-message ${type}`.trim();
  }

  async function loadIdentity() {
    try {
      const user = await api.request("/auth/me");
      if (user.role === "admin") {
        window.location.replace("Dashboard.html");
        return false;
      }
      byId("welcome").textContent = `Hola, ${user.username}`;
      return true;
    } catch (error) {
      if (error.status === 401) window.location.replace("index.html");
      else setMessage("storeMessage", error.message, "error");
      return false;
    }
  }

  async function loadCategories() {
    categories = await api.request("/categories");
    byId("categoryMenu").innerHTML = [
      `<button type="button" role="menuitem" data-category="" class="${selectedCategoryId === "" ? "selected" : ""}">Todas las categorías</button>`,
      ...categories.map(category => `<button type="button" role="menuitem" data-category="${category.id}" class="${String(selectedCategoryId) === String(category.id) ? "selected" : ""}">${escapeHtml(category.name)}</button>`)
    ].join("");
  }

  async function loadProducts() {
    const params = new URLSearchParams();
    const search = byId("search").value.trim();
    const brand = byId("brandFilter").value;
    const minPrice = byId("minPrice").value;
    const maxPrice = byId("maxPrice").value;
    if (search) params.set("search", search);
    if (selectedCategoryId) params.set("category_id", selectedCategoryId);
    if (brand) params.set("brand", brand);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    const query = params.toString();
    try {
      const products = await api.request(`/products${query ? `?${query}` : ""}`);
      byId("resultsCount").textContent = `${products.length} ${products.length === 1 ? "producto" : "productos"}`;
      byId("products").innerHTML = products.length ? products.map(product => `
        <article class="product-card">
          <div class="product-icon">${safeImageUrl(product.image)
            ? `<img src="${escapeHtml(safeImageUrl(product.image))}" alt="${escapeHtml(product.name)}" loading="lazy" />`
            : escapeHtml(product.icon || "📦")}</div>
          <p class="product-meta">${escapeHtml(product.category)} · ${escapeHtml(product.brand)}</p>
          <h3>${escapeHtml(product.name)}</h3>
          <ul class="product-specs">${(product.specs || []).map(spec => `<li>${escapeHtml(spec)}</li>`).join("")}</ul>
          <p class="product-meta">${product.socket ? `Socket ${escapeHtml(product.socket)} · ` : ""}<span class="${product.stock ? "" : "stock-unavailable"}">${product.stock ? `${product.stock} disponibles` : "Agotado"}</span></p>
          <p class="product-price">${currency(product.price)}</p>
          <button type="button" data-add="${product.id}" ${product.stock <= 0 ? "disabled" : ""}>Agregar al carrito</button>
        </article>`).join("") : '<p class="empty-state">No se encontraron productos.</p>';
      setMessage("storeMessage", `${products.length} producto(s) encontrado(s).`);
    } catch (error) {
      setMessage("storeMessage", error.message, "error");
    }
  }

  async function loadCart() {
    try {
      cart = await api.request("/cart");
      byId("cartContents").innerHTML = cart.items.length ? cart.items.map(item => `
        <div class="cart-item">
          <div class="cart-item-info"><strong>${escapeHtml(item.name)}</strong><span>${currency(item.price)} c/u · Subtotal ${currency(item.subtotal)}</span><span>${item.available_stock} disponibles</span></div>
          <div class="cart-actions">
            <input type="number" min="1" max="${item.available_stock}" value="${item.quantity}" aria-label="Cantidad de ${escapeHtml(item.name)}" data-quantity="${item.product_id}" />
            <button type="button" data-update="${item.product_id}">Guardar</button>
            <button type="button" class="secondary-button" data-remove="${item.product_id}">Quitar</button>
          </div>
        </div>`).join("") : '<p class="empty-state">Tu carrito está vacío.</p>';
      byId("cartTotal").textContent = currency(cart.total);
      byId("cartCount").textContent = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      byId("checkoutButton").disabled = cart.items.length === 0;
    } catch (error) {
      setMessage("cartMessage", error.message, "error");
    }
  }

  async function loadOrders() {
    try {
      const orders = await api.request("/pedidos/mis-pedidos");
      byId("ordersContents").innerHTML = orders.length ? orders.map(order => `
        <div class="order-item">
          <div class="order-item-info">
            <strong>Pedido #${order.id} · ${escapeHtml(order.estado)}</strong>
            <span>${new Date(order.fecha).toLocaleString("es-CO")}</span>
            <span>${escapeHtml(order.producto)} · ${currency(order.total)}</span>
          </div>
          <div>${order.estado === "Pendiente" ? `<button type="button" class="secondary-button" data-cancel="${order.id}">Cancelar</button>` : ""}</div>
        </div>`).join("") : '<p class="empty-state">Aún no tienes pedidos.</p>';
    } catch (error) {
      setMessage("orderMessage", error.message, "error");
    }
  }

  async function loadNotifications() {
    try {
      const notifications = await api.request("/pedidos/notificaciones");
      byId("notifications").innerHTML = notifications.length ? notifications.map(notification => `
        <li><strong>${notification.is_read ? "" : "Nueva · "}${escapeHtml(notification.message)}</strong><br><small>${new Date(notification.created_at).toLocaleString("es-CO")}</small></li>`).join("") : '<li class="empty-state">No tienes notificaciones.</li>';
    } catch (error) {
      setMessage("orderMessage", error.message, "error");
    }
  }

  async function addToCart(productId) {
    try {
      await api.request("/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: Number(productId), quantity: 1 })
      });
      setMessage("cartMessage", "Producto agregado al carrito.", "success");
      await loadCart();
    } catch (error) {
      setMessage("cartMessage", error.message, "error");
    }
  }

  async function changeCartItem(productId, quantity) {
    try {
      await api.request(`/cart/items/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: Number(quantity) })
      });
      setMessage("cartMessage", "Cantidad actualizada.", "success");
      await loadCart();
    } catch (error) {
      setMessage("cartMessage", error.message, "error");
    }
  }

  async function removeCartItem(productId) {
    try {
      await api.request(`/cart/items/${productId}`, { method: "DELETE" });
      setMessage("cartMessage", "Producto retirado del carrito.", "success");
      await loadCart();
    } catch (error) {
      setMessage("cartMessage", error.message, "error");
    }
  }

  async function checkout() {
    byId("checkoutButton").disabled = true;
    try {
      const order = await api.request("/pedidos", { method: "POST" }, "No se pudo confirmar el pedido.");
      setMessage("cartMessage", `Pedido #${order.id} creado con estado ${order.estado}.`, "success");
      await Promise.all([loadCart(), loadOrders(), loadNotifications(), loadProducts()]);
      setShoppingTab("orders");
    } catch (error) {
      setMessage("cartMessage", error.message, "error");
    } finally {
      byId("checkoutButton").disabled = cart.items.length === 0;
    }
  }

  async function cancelOrder(orderId) {
    try {
      await api.request(`/pedidos/${orderId}/cancelar`, { method: "POST" });
      setMessage("orderMessage", `Pedido #${orderId} cancelado.`, "success");
      await Promise.all([loadOrders(), loadNotifications(), loadProducts()]);
    } catch (error) {
      setMessage("orderMessage", error.message, "error");
    }
  }

  async function logout() {
    try {
      await api.request("/auth/logout", { method: "POST" });
      window.location.assign("index.html");
    } catch (error) {
      setMessage("storeMessage", error.message, "error");
    }
  }

  function setShoppingTab(tab) {
    const showCart = tab === "cart";
    byId("cartPanel").hidden = !showCart;
    byId("ordersPanel").hidden = showCart;
    byId("cartTab").classList.toggle("active", showCart);
    byId("ordersTab").classList.toggle("active", !showCart);
    byId("cartTab").setAttribute("aria-selected", String(showCart));
    byId("ordersTab").setAttribute("aria-selected", String(!showCart));
  }

  byId("filters").addEventListener("submit", event => {
    event.preventDefault();
    loadProducts();
  });
  byId("refreshButton").addEventListener("click", () => loadProducts());
  byId("clearFilters").addEventListener("click", () => {
    byId("search").value = "";
    byId("brandFilter").value = "";
    byId("minPrice").value = "";
    byId("maxPrice").value = "";
    selectedCategoryId = "";
    byId("categoryLabel").textContent = "Todas las categorías";
    loadCategories();
    byId("filterPanel").hidden = true;
    byId("filterToggle").setAttribute("aria-expanded", "false");
    loadProducts();
  });
  byId("applyFilters").addEventListener("click", () => {
    loadProducts();
    byId("filterPanel").hidden = true;
    byId("filterToggle").setAttribute("aria-expanded", "false");
  });
  byId("brandFilter").addEventListener("change", loadProducts);
  byId("categoryMenu").addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    selectedCategoryId = button.dataset.category;
    byId("categoryLabel").textContent = button.textContent;
    byId("categoryMenu").querySelectorAll("[data-category]").forEach(item => {
      item.classList.toggle("selected", item === button);
    });
    button.closest("details").open = false;
    loadProducts();
  });
  byId("filterToggle").addEventListener("click", () => {
    const panel = byId("filterPanel");
    panel.hidden = !panel.hidden;
    byId("filterToggle").setAttribute("aria-expanded", String(!panel.hidden));
  });
  byId("accountPanelToggle").addEventListener("click", () => {
    const panel = byId("shoppingPanel");
    panel.hidden = !panel.hidden;
    byId("accountPanelToggle").setAttribute("aria-expanded", String(!panel.hidden));
  });
  byId("cartTab").addEventListener("click", () => setShoppingTab("cart"));
  byId("ordersTab").addEventListener("click", () => setShoppingTab("orders"));
  document.addEventListener("click", event => {
    const shopping = document.querySelector(".shopping-menu");
    if (!shopping.contains(event.target)) {
      byId("shoppingPanel").hidden = true;
      byId("accountPanelToggle").setAttribute("aria-expanded", "false");
    }
    const filters = document.querySelector(".filter-dropdown");
    if (!filters.contains(event.target)) {
      byId("filterPanel").hidden = true;
      byId("filterToggle").setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    byId("shoppingPanel").hidden = true;
    byId("accountPanelToggle").setAttribute("aria-expanded", "false");
    byId("filterPanel").hidden = true;
    byId("filterToggle").setAttribute("aria-expanded", "false");
  });
  byId("products").addEventListener("click", event => {
    const button = event.target.closest("[data-add]");
    if (button) addToCart(button.dataset.add);
  });
  byId("cartContents").addEventListener("click", event => {
    const update = event.target.closest("[data-update]");
    const remove = event.target.closest("[data-remove]");
    if (update) changeCartItem(update.dataset.update, byId("cartContents").querySelector(`[data-quantity="${update.dataset.update}"]`).value);
    if (remove) removeCartItem(remove.dataset.remove);
  });
  byId("ordersContents").addEventListener("click", event => {
    const button = event.target.closest("[data-cancel]");
    if (button) cancelOrder(button.dataset.cancel);
  });
  byId("loadNotifications").addEventListener("click", loadNotifications);
  byId("checkoutButton").addEventListener("click", checkout);
  byId("logoutButton").addEventListener("click", logout);

  (async () => {
    if (!await loadIdentity()) return;
    try {
      await loadCategories();
      const allProducts = await api.request("/products");
      brands = [...new Set(allProducts.map(product => product.brand))].sort();
      byId("brandFilter").innerHTML = '<option value="">Todas las marcas</option>' +
        brands.map(brand => `<option value="${escapeHtml(brand)}">${escapeHtml(brand)}</option>`).join("");
      await Promise.all([loadProducts(), loadCart(), loadOrders(), loadNotifications()]);
    } catch (error) {
      setMessage("storeMessage", error.message, "error");
    }
  })();
})();
