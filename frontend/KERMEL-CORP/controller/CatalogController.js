document.addEventListener("DOMContentLoaded", function () {
  // 1. Llenar los menús de filtros con los datos del modelo
  CatalogView.renderFilters(
    ProductModel.getCategories(),
    ProductModel.getBrands(),
    ProductModel.getSockets()
  );

  // 2. Función que lee filtros, filtra y dibuja
  function actualizar() {
    const filtros = CatalogView.readFilters();
    const resultado = ProductModel.filter(filtros);
    CatalogView.renderProducts(resultado);
  }

  // 3. Cada vez que el usuario cambia un filtro, se actualiza
  ["filterCategory", "filterBrand", "filterSocket"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", actualizar);
  });

  ["filterMinPrice", "filterMaxPrice"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", actualizar);
  });

  // 4. Botón Limpiar
  document.getElementById("clearFilters").addEventListener("click", function () {
    CatalogView.clearFilters();
    actualizar();
  });

  // 5. Mostrar todo al cargar la página
  actualizar();
});