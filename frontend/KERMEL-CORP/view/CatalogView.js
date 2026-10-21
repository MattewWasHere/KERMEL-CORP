const CatalogView = {
  formatPrice: function (valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(valor);
  },

  fillSelect: function (select, textoInicial, valorInicial, valores) {
    select.innerHTML = "";
    const opcionInicial = document.createElement("option");
    opcionInicial.value = valorInicial;
    opcionInicial.textContent = textoInicial;
    select.appendChild(opcionInicial);

    valores.forEach(function (valor) {
      const op = document.createElement("option");
      op.value = valor;
      op.textContent = valor;
      select.appendChild(op);
    });
  },

  renderFilters: function (categorias, marcas, sockets) {
    this.fillSelect(document.getElementById("filterCategory"), "Todas las categorías", "todas", categorias);
    this.fillSelect(document.getElementById("filterBrand"), "Todas las marcas", "todas", marcas);
    this.fillSelect(document.getElementById("filterSocket"), "Todos los sockets", "todos", sockets);
  },

  readFilters: function () {
    const min = document.getElementById("filterMinPrice").value;
    const max = document.getElementById("filterMaxPrice").value;

    return {
      category: document.getElementById("filterCategory").value,
      brand: document.getElementById("filterBrand").value,
      socket: document.getElementById("filterSocket").value,
      minPrice: min === "" ? null : Number(min),
      maxPrice: max === "" ? null : Number(max)
    };
  },

  clearFilters: function () {
    document.getElementById("filterCategory").value = "todas";
    document.getElementById("filterBrand").value = "todas";
    document.getElementById("filterSocket").value = "todos";
    document.getElementById("filterMinPrice").value = "";
    document.getElementById("filterMaxPrice").value = "";
  },

  renderProducts: function (productos) {
    const grid = document.getElementById("productGrid");
    const vacio = document.getElementById("emptyState");
    const contador = document.getElementById("resultsCount");
    const self = this;

    grid.innerHTML = "";

    // Caso: Sin resultados
    if (productos.length === 0) {
      vacio.hidden = false;
      contador.textContent = "0 productos";
      return;
    }

    vacio.hidden = true;
    contador.textContent = productos.length + (productos.length === 1 ? " producto" : " productos");

    productos.forEach(function (p) {
      const agotado = p.stock === 0;
      const pocoStock = p.stock > 0 && p.stock <= 3;

      const specs = p.specs.map(function (s) { return "<li>" + s + "</li>"; }).join("");
      const socket = p.socket ? '<span class="chip">Socket ' + p.socket + "</span>" : "";
      const aviso = pocoStock ? '<p class="low-stock">¡Quedan solo ' + p.stock + "!</p>" : "";

      const card = document.createElement("article");
      card.className = "product-card" + (agotado ? " is-soldout" : "");

      card.innerHTML =
        (agotado ? '<span class="soldout-badge">Agotado</span>' : "") +
        '<div class="product-thumb">' + p.icon + "</div>" +
        '<div class="product-info">' +
          '<p class="product-category">' + p.category + "</p>" +
          "<h3>" + p.name + "</h3>" +
          '<p class="product-brand">Marca: ' + p.brand + "</p>" +
          '<ul class="product-specs">' + specs + "</ul>" +
          socket +
          aviso +
          '<div class="product-bottom">' +
            '<strong class="product-price">' + self.formatPrice(p.price) + "</strong>" +
            '<button type="button" class="primary-btn small-btn"' + (agotado ? " disabled" : "") + ">" +
              (agotado ? "Agotado" : "Agregar") +
            "</button>" +
          "</div>" +
        "</div>";

      grid.appendChild(card);
    });
  }
};