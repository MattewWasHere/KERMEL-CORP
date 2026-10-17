const CONFIG = {
  ordersUrl: "/api/pedidos",
  historyUrl: "/api/pedidos/recientes",
  refreshInterval: 5000,
  visibleOrders: 12,
  chartBlockSeconds: 5,
  chartBlocks: 24
};

const orders = [];
const salesSeries = Array(CONFIG.chartBlocks).fill(0);
const timeLabels = Array(CONFIG.chartBlocks).fill("");
const categoryColors = ["#0f9d8a", "#e8a33d", "#4a7bd0", "#d8504d", "#8a6fc9"];

let paused = false;
let latestOrderId = 0;
let lineChart;
let categoryChart;
let polling = false;

const formatCurrency = value =>
  value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  });

const formatTime = date =>
  date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

const escapeHtml = value =>
  String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

async function requestJson(url, options, fallbackMessage) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error("No se pudo conectar con la API. Verifica que FastAPI esté iniciado.");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("La API devolvió una respuesta no válida.");
  }

  if (!response.ok) {
    const detail = Array.isArray(result.detail)
      ? result.detail.map(error => error.msg).join(" ")
      : result.detail;
    throw new Error(
      detail || (response.status === 401 ? "La sesión expiró." : fallbackMessage)
    );
  }
  return result;
}

function setConnectionState(state, message) {
  document.getElementById("estadoConexion").className = "vivo " + state;
  document.getElementById("textoConexion").textContent = message;
}

function addOrder(order, isNew = true) {
  if (orders.some(item => item.id === order.id)) return;

  const item = {
    ...order,
    fecha: new Date(order.fecha),
    nuevo: isNew
  };
  orders.push(item);
  orders.sort((left, right) => right.fecha - left.fecha);
  if (orders.length > 500) orders.length = 500;

  if (isNew && item.estado !== "Cancelado") {
    salesSeries[salesSeries.length - 1] += item.total;
  }
  refreshDashboard();
}

function renderSummary() {
  const validOrders = orders.filter(order => order.estado !== "Cancelado");
  const totalSales = validOrders.reduce((sum, order) => sum + order.total, 0);
  const uniqueCustomers = new Set(validOrders.map(order => order.cliente)).size;
  const averageOrder = validOrders.length ? totalSales / validOrders.length : 0;
  const oneMinuteAgo = Date.now() - 60_000;
  const recentOrders = orders.filter(order => order.fecha.getTime() >= oneMinuteAgo).length;
  const cards = [
    ["Ventas acumuladas", formatCurrency(totalSales)],
    ["Pedidos válidos", validOrders.length],
    ["Clientes distintos", uniqueCustomers],
    ["Ticket promedio", formatCurrency(averageOrder)],
    ["Pedidos último minuto", recentOrders]
  ];

  document.getElementById("resumen").innerHTML = cards
    .map(([title, value]) => `<div class="tarjeta"><span>${title}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderOrders() {
  const tableBody = document.getElementById("cuerpoTabla");
  const visibleOrders = orders.slice(0, CONFIG.visibleOrders);
  if (!visibleOrders.length) {
    tableBody.innerHTML = '<tr><td colspan="6" class="vacio">Aún no hay pedidos registrados.</td></tr>';
    return;
  }

  tableBody.innerHTML = visibleOrders.map(order => {
    const rowClass = order.nuevo ? ' class="nuevo"' : "";
    order.nuevo = false;
    return `<tr${rowClass}>
      <td>${formatTime(order.fecha)}</td>
      <td>${escapeHtml(order.cliente)}</td>
      <td>${escapeHtml(order.producto)}</td>
      <td>${escapeHtml(order.categoria)}</td>
      <td>${formatCurrency(order.total)}</td>
      <td><span class="estado e-${escapeHtml(order.estado.toLowerCase())}">${escapeHtml(order.estado)}</span></td>
    </tr>`;
  }).join("");
}

function updateCharts() {
  if (!lineChart || !categoryChart) return;
  lineChart.update();

  const salesByCategory = new Map();
  orders
    .filter(order => order.estado !== "Cancelado")
    .forEach(order => {
      salesByCategory.set(
        order.categoria,
        (salesByCategory.get(order.categoria) || 0) + order.total
      );
    });

  categoryChart.data.labels = [...salesByCategory.keys()];
  categoryChart.data.datasets[0].data = [...salesByCategory.values()];
  categoryChart.update();
}

function createCharts() {
  const isDarkMode = document.body.classList.contains("oscuro");
  Chart.defaults.color = isDarkMode ? "#93a6b2" : "#6b7a89";
  Chart.defaults.borderColor = isDarkMode ? "#264049" : "#e1e6eb";
  lineChart?.destroy();
  categoryChart?.destroy();

  lineChart = new Chart(document.getElementById("grafLinea"), {
    type: "line",
    data: {
      labels: timeLabels,
      datasets: [{
        label: "Ventas",
        data: salesSeries,
        borderColor: "#0f9d8a",
        backgroundColor: "rgba(15,157,138,.15)",
        fill: true,
        tension: 0.3,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: context => formatCurrency(context.parsed.y) } }
      },
      scales: {
        y: { beginAtZero: true },
        x: { ticks: { maxTicksLimit: 6 } }
      }
    }
  });

  categoryChart = new Chart(document.getElementById("grafDona"), {
    type: "doughnut",
    data: {
      labels: [],
      datasets: [{ data: [], backgroundColor: categoryColors, borderWidth: 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: { legend: { position: "bottom" } }
    }
  });
  updateCharts();
}

function refreshDashboard() {
  renderSummary();
  renderOrders();
  updateCharts();
}

async function loadHistory() {
  const history = await requestJson(
    CONFIG.historyUrl,
    {},
    "No se pudo cargar el historial."
  );
  history.forEach(order => addOrder(order, false));
  latestOrderId = history.reduce((latest, order) => Math.max(latest, order.id), 0);
}

async function pollOrders() {
  if (paused || polling) return;

  polling = true;
  try {
    const newOrders = await requestJson(
      `${CONFIG.ordersUrl}?desde=${latestOrderId}`,
      {},
      "No se pudo actualizar."
    );
    newOrders.forEach(order => {
      addOrder(order);
      latestOrderId = Math.max(latestOrderId, order.id);
    });
    setConnectionState("activo", "En vivo");
  } catch (error) {
    setConnectionState("error", errorMessage(error, "No se pudo actualizar."));
  } finally {
    polling = false;
  }
}

async function submitOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.getElementById("mensajePedido");
  const values = new FormData(form);
  const order = {
    cliente: values.get("cliente").trim(),
    producto: values.get("producto").trim(),
    categoria: values.get("categoria").trim(),
    total: Number(values.get("total")),
    estado: values.get("estado")
  };

  message.className = "mensaje-pedido";
  message.textContent = "Guardando pedido…";

  try {
    const result = await requestJson(CONFIG.ordersUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order)
    }, "No se pudo guardar el pedido.");

    addOrder(result);
    latestOrderId = Math.max(latestOrderId, result.id);
    form.reset();
    message.className = "mensaje-pedido success";
    message.textContent = "Pedido guardado correctamente.";
  } catch (error) {
    message.className = "mensaje-pedido error";
    message.textContent = errorMessage(error, "No se pudo guardar el pedido.");
  }
}

async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.assign("index.html");
  }
}

async function initializeDashboard() {
  try {
    const sessionResponse = await fetch("/api/auth/me");
    if (!sessionResponse.ok) {
      window.location.replace("index.html");
      return;
    }

    timeLabels[timeLabels.length - 1] = formatTime(new Date());
    createCharts();
    refreshDashboard();
    await loadHistory();
    setConnectionState("activo", "En vivo");
    await pollOrders();
    window.setInterval(pollOrders, CONFIG.refreshInterval);
    window.setInterval(() => {
      if (paused) return;
      salesSeries.shift();
      salesSeries.push(0);
      timeLabels.shift();
      timeLabels.push(formatTime(new Date()));
      refreshDashboard();
    }, CONFIG.chartBlockSeconds * 1000);
  } catch (error) {
    setConnectionState("error", errorMessage(error, "No se pudo inicializar el panel."));
  }
}

document.getElementById("pedidoForm").addEventListener("submit", submitOrder);
document.getElementById("btnCerrarSesion").addEventListener("click", logout);
document.getElementById("btnPausa").addEventListener("click", event => {
  paused = !paused;
  event.currentTarget.textContent = paused ? "Reanudar" : "Pausar";
  setConnectionState(paused ? "" : "activo", paused ? "En pausa" : "En vivo");
});
document.getElementById("btnOscuro").addEventListener("click", event => {
  document.body.classList.toggle("oscuro");
  event.currentTarget.textContent = document.body.classList.contains("oscuro")
    ? "Modo claro"
    : "Modo oscuro";
  createCharts();
});
document.querySelectorAll("aside a").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll("aside a").forEach(item => item.classList.remove("activo"));
    link.classList.add("activo");
  });
});

initializeDashboard();
