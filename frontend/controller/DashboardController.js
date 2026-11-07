(() => {
  const api = window.KERMEL_API;
  const byId = id => document.getElementById(id);
  const productForm = byId("productForm");
  const categoryForm = byId("categoryForm");
  const currency = amount => Number(amount || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  });
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const nextStatus = {
    Pendiente: "Confirmado",
    Confirmado: "Enviado",
    Enviado: "Entregado"
  };
  let products = [];
  let categories = [];
  let orders = [];
  let latestOrderId = 0;
  let polling = false;

  function feedback(id, message, type = "") {
    const element = byId(id);
    element.textContent = message;
    element.className = `feedback ${type}`.trim();
  }

  function connection(state, message) {
    byId("estadoConexion").className = `vivo ${state}`.trim();
    byId("textoConexion").textContent = message;
  }

  function validateForm(form, messageId) {
    const fields = [...form.querySelectorAll("input, select, textarea")]
      .filter(field => field.type !== "hidden");
    fields.forEach(field => field.setCustomValidity(""));

    fields.forEach(field => {
      const label = field.labels?.[0]?.textContent.trim() || "Este campo";
      const value = field.value;
      let message = "";

      if (field.required && !value.trim()) {
        message = `${label} es obligatorio.`;
      } else if (field.validity.valid) {
        return;
      } else if (field.validity.typeMismatch) {
        message = field.type === "url"
          ? "Ingresa una dirección URL válida."
          : `${label}: el formato ingresado no es válido.`;
      } else if (field.validity.tooShort) {
        message = `${label} debe tener al menos ${field.minLength} caracteres.`;
      } else if (field.validity.tooLong) {
        message = `${label} no puede superar ${field.maxLength} caracteres.`;
      } else if (field.validity.rangeUnderflow) {
        message = `${label} debe ser igual o mayor que ${field.min}.`;
      } else if (field.validity.rangeOverflow) {
        message = `${label} debe ser igual o menor que ${field.max}.`;
      } else if (field.validity.stepMismatch) {
        message = `${label} debe tener un valor válido.`;
      } else if (field.validity.badInput) {
        message = `${label}: ingresa un valor válido.`;
      }

      if (message) field.setCustomValidity(message);
    });

    const invalidField = fields.find(field => !field.validity.valid);
    if (!invalidField) return true;

    invalidField.reportValidity();
    feedback(messageId, invalidField.validationMessage, "error");
    return false;
  }

  [productForm, categoryForm].forEach(form => {
    form.querySelectorAll("input, select, textarea").forEach(field => {
      field.addEventListener("input", () => field.setCustomValidity(""));
      field.addEventListener("change", () => field.setCustomValidity(""));
    });
  });

  function renderInventory(summary) {
    const cards = [
      ["Productos activos", summary.total_productos],
      ["Categorías", summary.total_categorias],
      ["Unidades en inventario", summary.unidades_totales],
      ["Unidades disponibles", summary.unidades_disponibles],
      ["Valor del inventario", currency(summary.valor_inventario)],
      ["Productos agotados", summary.productos_agotados]
    ];
    byId("resumen").innerHTML = cards.map(([title, value]) =>
      `<article class="tarjeta"><span>${title}</span><strong>${value}</strong></article>`
    ).join("");
    byId("categorySummary").innerHTML = summary.stock_por_categoria.length
      ? summary.stock_por_categoria.map(category =>
        `<div class="category-stock"><span>${escapeHtml(category.categoria)}</span><strong>${category.unidades}</strong></div>`
      ).join("")
      : '<p class="empty-state">No hay existencias registradas.</p>';
  }

  function renderProducts() {
    const search = byId("productSearch").value.trim().toLocaleLowerCase("es");
    const filteredProducts = products.filter(product =>
      [product.name, product.brand, product.category]
        .some(value => String(value ?? "").toLocaleLowerCase("es").includes(search))
    );
    byId("productResultsCount").textContent =
      `${filteredProducts.length} de ${products.length} ${products.length === 1 ? "producto" : "productos"}`;
    byId("productsTable").innerHTML = filteredProducts.length ? filteredProducts.map(product => `
      <tr>
        <td>${escapeHtml(product.name)}</td><td>${escapeHtml(product.category)}</td>
        <td>${escapeHtml(product.brand)}</td><td>${currency(product.price)}</td>
        <td>${product.stock_total}</td><td>${product.reserved_stock}</td><td>${product.stock}</td>
        <td class="action-cell"><button type="button" data-edit-product="${product.id}">Editar</button><button type="button" class="danger-button" data-delete-product="${product.id}">Desactivar</button></td>
      </tr>`).join("") : `<tr><td colspan="8" class="empty-state">${products.length ? "No hay productos que coincidan con la búsqueda." : "No hay productos activos."}</td></tr>`;
  }

  function renderCategories() {
    const options = '<option value="">Selecciona una categoría</option>' +
      categories.map(category => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join("");
    productForm.elements.category_id.innerHTML = options;
    byId("categoriesList").innerHTML = categories.length ? categories.map(category => `
      <div class="category-row"><div><strong>${escapeHtml(category.name)}</strong><p>${escapeHtml(category.description || "Sin descripción")}</p></div><button type="button" data-edit-category="${category.id}">Editar</button></div>
    `).join("") : '<p class="empty-state">No hay categorías.</p>';
  }

  function renderOrders() {
    byId("ordersTable").innerHTML = orders.length ? orders.map(order => {
      const advance = nextStatus[order.estado];
      return `<tr>
        <td>${new Date(order.fecha).toLocaleString("es-CO")}</td>
        <td>${escapeHtml(order.cliente)}</td><td>${escapeHtml(order.producto)}</td>
        <td>${escapeHtml(order.categoria)}</td><td>${currency(order.total)}</td>
        <td><span class="order-state">${escapeHtml(order.estado)}</span><div class="action-cell">
          <button type="button" data-order-details="${order.id}">Detalle</button>
          ${advance ? `<button type="button" data-advance-order="${order.id}" data-next-status="${advance}">Marcar ${advance}</button>` : ""}
          ${order.estado === "Pendiente" ? `<button type="button" class="danger-button" data-cancel-order="${order.id}">Cancelar</button>` : ""}
        </div></td>
      </tr>`;
    }).join("") : '<tr><td colspan="6" class="empty-state">Aún no hay pedidos.</td></tr>';
  }

  async function loadProducts() {
    products = await api.request("/products/admin");
    renderProducts();
  }

  async function loadCategories() {
    categories = await api.request("/categories");
    renderCategories();
  }

  async function loadInventory() {
    renderInventory(await api.request("/admin/dashboard/inventory"));
  }

  async function loadRecentOrders() {
    orders = await api.request("/pedidos/recientes?limit=100");
    latestOrderId = orders.reduce((latest, order) => Math.max(latest, order.id), 0);
    renderOrders();
  }

  async function showOrderDetails(orderId) {
    try {
      const order = await api.request(`/pedidos/${orderId}`);
      byId("orderDialogTitle").textContent = `Pedido #${order.id}`;
      byId("orderDetails").innerHTML = `
        <dl class="order-summary">
          <div><dt>Cliente</dt><dd>${escapeHtml(order.cliente)}</dd></div>
          <div><dt>Fecha</dt><dd>${new Date(order.fecha).toLocaleString("es-CO")}</dd></div>
          <div><dt>Estado</dt><dd>${escapeHtml(order.estado)}</dd></div>
          <div><dt>Total</dt><dd>${currency(order.total)}</dd></div>
        </dl>
        <div class="tabla-wrap"><table>
          <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal</th></tr></thead>
          <tbody>${order.items.map(item => `
            <tr><td>${escapeHtml(item.product_name)}</td><td>${item.quantity}</td>
            <td>${currency(item.unit_price)}</td><td>${currency(item.subtotal)}</td></tr>
          `).join("")}</tbody>
        </table></div>`;
      byId("orderDialog").showModal();
    } catch (error) {
      feedback("orderMessage", error.message, "error");
    }
  }

  async function refreshAll() {
    await Promise.all([loadInventory(), loadProducts(), loadCategories(), loadRecentOrders()]);
    connection("activo", "Conectado");
  }

  async function pollOrders() {
    if (polling) return;
    polling = true;
    try {
      const newOrders = await api.request(`/pedidos?since=${latestOrderId}&limit=100`);
      if (newOrders.length) {
        for (const order of newOrders) {
          if (!orders.some(existing => existing.id === order.id)) orders.unshift(order);
          latestOrderId = Math.max(latestOrderId, order.id);
        }
        orders = orders.slice(0, 100);
        renderOrders();
      }
      connection("activo", "Conectado");
    } catch (error) {
      connection("error", error.message);
    } finally {
      polling = false;
    }
  }

  function resetProductForm() {
    productForm.reset();
    productForm.elements.product_id.value = "";
    productForm.elements.icon.value = "📦";
    byId("saveProductButton").textContent = "Crear producto";
    byId("cancelProductEdit").hidden = true;
  }

  function editProduct(product) {
    productForm.elements.product_id.value = product.id;
    productForm.elements.name.value = product.name;
    productForm.elements.brand.value = product.brand;
    productForm.elements.category_id.value = product.category_id;
    productForm.elements.price.value = product.price;
    productForm.elements.stock.value = product.stock_total;
    productForm.elements.socket.value = product.socket || "";
    productForm.elements.icon.value = product.icon || "📦";
    productForm.elements.image.value = product.image || "";
    productForm.elements.specs.value = (product.specs || []).join("\n");
    byId("saveProductButton").textContent = "Guardar cambios";
    byId("cancelProductEdit").hidden = false;
    productForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function saveProduct(event) {
    event.preventDefault();
    if (!validateForm(productForm, "productMessage")) return;
    const values = new FormData(productForm);
    const productId = values.get("product_id");
    const payload = {
      name: values.get("name").trim(),
      brand: values.get("brand").trim(),
      category_id: Number(values.get("category_id")),
      price: Number(values.get("price")),
      stock: Number(values.get("stock")),
      socket: values.get("socket").trim() || null,
      icon: values.get("icon").trim() || "📦",
      specs: values.get("specs").split("\n").map(spec => spec.trim()).filter(Boolean),
      image: values.get("image").trim() || null
    };
    try {
      await api.request(productId ? `/products/${productId}` : "/products", {
        method: productId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      resetProductForm();
      feedback("productMessage", "Producto guardado correctamente.", "success");
      await Promise.all([loadProducts(), loadInventory()]);
    } catch (error) {
      feedback("productMessage", error.message, "error");
    }
  }

  async function deleteProduct(productId) {
    if (!window.confirm("¿Deseas desactivar este producto?")) return;
    try {
      await api.request(`/products/${productId}`, { method: "DELETE" });
      feedback("productMessage", "Producto desactivado.", "success");
      await Promise.all([loadProducts(), loadInventory()]);
    } catch (error) {
      feedback("productMessage", error.message, "error");
    }
  }

  function resetCategoryForm() {
    categoryForm.reset();
    categoryForm.elements.category_id.value = "";
    byId("saveCategoryButton").textContent = "Crear categoría";
    byId("cancelCategoryEdit").hidden = true;
  }

  async function saveCategory(event) {
    event.preventDefault();
    if (!validateForm(categoryForm, "categoryMessage")) return;
    const values = new FormData(categoryForm);
    const id = values.get("category_id");
    const payload = { name: values.get("name").trim(), description: values.get("description").trim() || null };
    try {
      await api.request(id ? `/categories/${id}` : "/categories", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      resetCategoryForm();
      feedback("categoryMessage", "Categoría guardada correctamente.", "success");
      await Promise.all([loadCategories(), loadProducts()]);
    } catch (error) {
      feedback("categoryMessage", error.message, "error");
    }
  }

  async function changeOrderStatus(orderId, status) {
    try {
      const updated = await api.request(`/pedidos/${orderId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: status })
      });
      orders = orders.map(order => order.id === updated.id ? updated : order);
      renderOrders();
      feedback("orderMessage", `Pedido #${orderId}: estado actualizado a ${status}.`, "success");
      await loadInventory();
    } catch (error) {
      feedback("orderMessage", error.message, "error");
    }
  }

  async function cancelOrder(orderId) {
    try {
      const updated = await api.request(`/pedidos/${orderId}/cancelar`, { method: "POST" });
      orders = orders.map(order => order.id === updated.id ? updated : order);
      renderOrders();
      feedback("orderMessage", `Pedido #${orderId} cancelado.`, "success");
      await loadInventory();
    } catch (error) {
      feedback("orderMessage", error.message, "error");
    }
  }

  async function logout() {
    try {
      await api.request("/auth/logout", { method: "POST" });
      window.location.assign("index.html");
    } catch (error) {
      connection("error", error.message);
    }
  }

  productForm.addEventListener("submit", saveProduct);
  categoryForm.addEventListener("submit", saveCategory);
  byId("productSearch").addEventListener("input", renderProducts);
  byId("closeOrderDialog").addEventListener("click", () => byId("orderDialog").close());
  byId("cancelProductEdit").addEventListener("click", resetProductForm);
  byId("cancelCategoryEdit").addEventListener("click", resetCategoryForm);
  byId("refreshButton").addEventListener("click", () => refreshAll().catch(error => connection("error", error.message)));
  byId("btnCerrarSesion").addEventListener("click", logout);
  byId("productsTable").addEventListener("click", event => {
    const edit = event.target.closest("[data-edit-product]");
    const remove = event.target.closest("[data-delete-product]");
    if (edit) {
      const product = products.find(item => item.id === Number(edit.dataset.editProduct));
      if (product) editProduct(product);
    }
    if (remove) deleteProduct(remove.dataset.deleteProduct);
  });
  byId("categoriesList").addEventListener("click", event => {
    const button = event.target.closest("[data-edit-category]");
    if (!button) return;
    const category = categories.find(item => item.id === Number(button.dataset.editCategory));
    if (!category) return;
    categoryForm.elements.category_id.value = category.id;
    categoryForm.elements.name.value = category.name;
    categoryForm.elements.description.value = category.description || "";
    byId("saveCategoryButton").textContent = "Guardar cambios";
    byId("cancelCategoryEdit").hidden = false;
  });
  byId("ordersTable").addEventListener("click", event => {
    const details = event.target.closest("[data-order-details]");
    const advance = event.target.closest("[data-advance-order]");
    const cancel = event.target.closest("[data-cancel-order]");
    if (details) showOrderDetails(details.dataset.orderDetails);
    if (advance) changeOrderStatus(advance.dataset.advanceOrder, advance.dataset.nextStatus);
    if (cancel) cancelOrder(cancel.dataset.cancelOrder);
  });
  document.querySelectorAll("aside a").forEach(link => link.addEventListener("click", () => {
    document.querySelectorAll("aside a").forEach(item => item.classList.remove("activo"));
    link.classList.add("activo");
  }));

  (async () => {
    try {
      const user = await api.request("/auth/me", {}, "No se pudo validar la sesión.");
      if (user.role !== "admin") {
        window.location.replace("store.html");
        return;
      }
      await refreshAll();
      window.setInterval(pollOrders, 5000);
    } catch (error) {
      if (error.status === 401) window.location.replace("index.html");
      else connection("error", error.message);
    }
  })();
})();
