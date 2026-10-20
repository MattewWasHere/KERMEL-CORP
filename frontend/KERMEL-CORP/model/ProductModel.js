const ProductModel = {
  products: [
    // ===== Procesadores =====
    { id: 1, name: "Ryzen 5 5600", category: "Procesador", brand: "AMD", price: 520000, socket: "AM4", stock: 12, icon: "🧠", specs: ["6 núcleos / 12 hilos", "Hasta 4.4 GHz"] },
    { id: 2, name: "Ryzen 7 7700X", category: "Procesador", brand: "AMD", price: 1350000, socket: "AM5", stock: 5, icon: "🧠", specs: ["8 núcleos / 16 hilos", "Hasta 5.4 GHz"] },
    { id: 3, name: "Core i5-12400F", category: "Procesador", brand: "Intel", price: 620000, socket: "LGA1700", stock: 8, icon: "🧠", specs: ["6 núcleos / 12 hilos", "Hasta 4.4 GHz"] },
    { id: 4, name: "Core i7-14700K", category: "Procesador", brand: "Intel", price: 1900000, socket: "LGA1700", stock: 0, icon: "🧠", specs: ["20 núcleos / 28 hilos", "Hasta 5.6 GHz"] },

    // ===== Tarjetas madre =====
    { id: 5, name: "TUF Gaming B550-PLUS", category: "Tarjeta madre", brand: "ASUS", price: 780000, socket: "AM4", stock: 6, icon: "🔌", specs: ["ATX", "DDR4 / PCIe 4.0"] },
    { id: 6, name: "MAG B650 Tomahawk", category: "Tarjeta madre", brand: "MSI", price: 1100000, socket: "AM5", stock: 3, icon: "🔌", specs: ["ATX", "DDR5 / PCIe 5.0"] },
    { id: 7, name: "B760M Aorus Elite", category: "Tarjeta madre", brand: "Gigabyte", price: 680000, socket: "LGA1700", stock: 0, icon: "🔌", specs: ["Micro-ATX", "DDR5 / PCIe 4.0"] },

    // ===== Tarjetas de video =====
    { id: 8, name: "GeForce RTX 4060 Ventus", category: "Tarjeta de video", brand: "MSI", price: 1650000, socket: null, stock: 7, icon: "🎮", specs: ["8 GB GDDR6", "Ray Tracing / DLSS 3"] },
    { id: 9, name: "GeForce RTX 4070 Dual", category: "Tarjeta de video", brand: "ASUS", price: 2900000, socket: null, stock: 0, icon: "🎮", specs: ["12 GB GDDR6X", "Ray Tracing / DLSS 3"] },
    { id: 10, name: "Radeon RX 7600 Gaming OC", category: "Tarjeta de video", brand: "Gigabyte", price: 1300000, socket: null, stock: 4, icon: "🎮", specs: ["8 GB GDDR6", "FSR 3 / PCIe 4.0"] },

    // ===== Memoria RAM =====
    { id: 11, name: "Vengeance DDR5 32GB (2x16)", category: "Memoria RAM", brand: "Corsair", price: 480000, socket: null, stock: 15, icon: "💾", specs: ["DDR5 6000 MHz", "CL36"] },
    { id: 12, name: "Fury Beast DDR4 16GB (2x8)", category: "Memoria RAM", brand: "Kingston", price: 190000, socket: null, stock: 2, icon: "💾", specs: ["DDR4 3200 MHz", "CL16"] },

    // ===== Almacenamiento =====
    { id: 13, name: "980 NVMe 1TB", category: "Almacenamiento", brand: "Samsung", price: 320000, socket: null, stock: 20, icon: "💽", specs: ["M.2 PCIe 3.0", "Hasta 3500 MB/s"] },
    { id: 14, name: "Blue SN580 500GB", category: "Almacenamiento", brand: "Western Digital", price: 190000, socket: null, stock: 0, icon: "💽", specs: ["M.2 PCIe 4.0", "Hasta 4000 MB/s"] },

    // ===== Fuentes de poder =====
    { id: 15, name: "CV650 650W", category: "Fuente de poder", brand: "Corsair", price: 290000, socket: null, stock: 9, icon: "⚡", specs: ["80 Plus Bronze", "No modular"] },

    // ===== Refrigeración =====
    { id: 16, name: "Hyper 212 Black", category: "Refrigeración", brand: "Cooler Master", price: 130000, socket: null, stock: 14, icon: "❄️", specs: ["Disipador por aire", "Ventilador 120 mm"] },

    // ===== Gabinetes =====
    { id: 17, name: "H510 Mid Tower", category: "Gabinete", brand: "NZXT", price: 380000, socket: null, stock: 3, icon: "🖥️", specs: ["ATX", "Panel de vidrio templado"] },
    { id: 18, name: "Pure Base 500", category: "Gabinete", brand: "be quiet!", price: 450000, socket: null, stock: 6, icon: "🖥️", specs: ["ATX", "Flujo de aire optimizado"] }
  ],

  getAll: function () {
    return this.products;
  },

  getCategories: function () {
    const lista = this.products.map(function (p) { return p.category; });
    return Array.from(new Set(lista)).sort();
  },

  getBrands: function () {
    const lista = this.products.map(function (p) { return p.brand; });
    return Array.from(new Set(lista)).sort();
  },

  getSockets: function () {
    const lista = this.products
      .filter(function (p) { return p.socket !== null; })
      .map(function (p) { return p.socket; });
    return Array.from(new Set(lista)).sort();
  },

  // Recibe los filtros y devuelve solo los productos que los cumplen todos
  filter: function (f) {
    return this.products.filter(function (p) {
      if (f.category !== "todas" && p.category !== f.category) return false;
      if (f.brand !== "todas" && p.brand !== f.brand) return false;
      if (f.socket !== "todos" && p.socket !== f.socket) return false;
      if (f.minPrice !== null && p.price < f.minPrice) return false;
      if (f.maxPrice !== null && p.price > f.maxPrice) return false;
      return true;
    });
  }
};