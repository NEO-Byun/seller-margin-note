"use strict";

const STORAGE_KEY = "seller-margin-note-products-v1";
const SETTINGS_KEY = "seller-margin-note-settings-v1";

const CHANNEL_PRESETS = {
  smartstore: {
    label: "스마트스토어",
    platformFeeRate: 3.5,
    paymentFeeRate: 2.2,
  },
  coupang: {
    label: "쿠팡",
    platformFeeRate: 10,
    paymentFeeRate: 0,
  },
  openmarket: {
    label: "오픈마켓",
    platformFeeRate: 12,
    paymentFeeRate: 0,
  },
  sns: {
    label: "SNS·직접판매",
    platformFeeRate: 0,
    paymentFeeRate: 3.3,
  },
  custom: {
    label: "직접 입력",
    platformFeeRate: 0,
    paymentFeeRate: 0,
  },
};

const DEFAULT_PRODUCT = {
  id: "",
  productName: "",
  channel: "smartstore",
  monthlySales: 100,
  salePrice: 24900,
  costPrice: 9800,
  platformFeeRate: 3.5,
  paymentFeeRate: 2.2,
  adCost: 1200,
  shippingIncome: 3000,
  shippingCost: 3300,
  packagingCost: 450,
  returnRate: 3,
  returnLoss: 4500,
  targetMarginRate: 25,
  vatMode: "included",
  monthlyFixedCost: 300000,
  memo: "",
};

const SAMPLE_PRODUCTS = [
  {
    ...DEFAULT_PRODUCT,
    id: "sample-1",
    productName: "생활방수 파우치",
    channel: "smartstore",
    salePrice: 18900,
    costPrice: 7200,
    platformFeeRate: 3.5,
    paymentFeeRate: 2.2,
    adCost: 900,
    shippingIncome: 3000,
    shippingCost: 3300,
    packagingCost: 380,
    returnRate: 2.5,
    returnLoss: 3600,
    monthlySales: 180,
    memo: "검색 광고를 조금 줄여도 마진 유지 가능.",
  },
  {
    ...DEFAULT_PRODUCT,
    id: "sample-2",
    productName: "프리미엄 텀블러",
    channel: "coupang",
    salePrice: 15900,
    costPrice: 8300,
    platformFeeRate: 10,
    paymentFeeRate: 0,
    adCost: 1300,
    shippingIncome: 0,
    shippingCost: 3100,
    packagingCost: 500,
    returnRate: 4,
    returnLoss: 4200,
    monthlySales: 260,
    memo: "무료배송 구조라 판매가 테스트 필요.",
  },
  {
    ...DEFAULT_PRODUCT,
    id: "sample-3",
    productName: "수제 간식 선물세트",
    channel: "openmarket",
    salePrice: 32900,
    costPrice: 14800,
    platformFeeRate: 12,
    paymentFeeRate: 0,
    adCost: 2100,
    shippingIncome: 3500,
    shippingCost: 3900,
    packagingCost: 1200,
    returnRate: 1.2,
    returnLoss: 6500,
    monthlySales: 90,
    memo: "선물 시즌 외에는 광고비 기준을 낮게 잡기.",
  },
];

const state = {
  products: loadProducts(),
  activeId: null,
  sortMode: "marginAsc",
  settings: loadSettings(),
};

const elements = {
  form: document.querySelector("#marginForm"),
  sampleButton: document.querySelector("#sampleButton"),
  exportButton: document.querySelector("#exportButton"),
  printButton: document.querySelector("#printButton"),
  resetButton: document.querySelector("#resetButton"),
  deleteButton: document.querySelector("#deleteButton"),
  sortMode: document.querySelector("#sortMode"),
  productRows: document.querySelector("#productRows"),
  emptyState: document.querySelector("#emptyState"),
  kpiGrid: document.querySelector("#kpiGrid"),
  statusPill: document.querySelector("#statusPill"),
  decisionBox: document.querySelector("#decisionBox"),
  currentPriceText: document.querySelector("#currentPriceText"),
  breakEvenPriceText: document.querySelector("#breakEvenPriceText"),
  targetPriceText: document.querySelector("#targetPriceText"),
  costBars: document.querySelector("#costBars"),
  toast: document.querySelector("#toast"),
};

function loadProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.products));
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `product-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function field(name) {
  return elements.form.elements.namedItem(name);
}

function numberFromForm(name) {
  return Number(field(name).value || 0);
}

function activeProduct() {
  return state.products.find((product) => product.id === state.activeId) || null;
}

function getFormProduct() {
  return {
    id: field("productId").value || "",
    productName: field("productName").value.trim(),
    channel: field("channel").value,
    monthlySales: numberFromForm("monthlySales"),
    salePrice: numberFromForm("salePrice"),
    costPrice: numberFromForm("costPrice"),
    platformFeeRate: numberFromForm("platformFeeRate"),
    paymentFeeRate: numberFromForm("paymentFeeRate"),
    adCost: numberFromForm("adCost"),
    shippingIncome: numberFromForm("shippingIncome"),
    shippingCost: numberFromForm("shippingCost"),
    packagingCost: numberFromForm("packagingCost"),
    returnRate: numberFromForm("returnRate"),
    returnLoss: numberFromForm("returnLoss"),
    targetMarginRate: numberFromForm("targetMarginRate"),
    vatMode: field("vatMode").value,
    monthlyFixedCost: numberFromForm("monthlyFixedCost"),
    memo: field("memo").value.trim(),
  };
}

function calculate(product) {
  const salePrice = clean(product.salePrice);
  const shippingIncome = clean(product.shippingIncome);
  const grossCashIn = salePrice + shippingIncome;
  const vatReserve = product.vatMode === "included" ? grossCashIn / 11 : 0;
  const salesBase = product.vatMode === "included" ? grossCashIn - vatReserve : grossCashIn;
  const platformFee = salePrice * rate(product.platformFeeRate);
  const paymentFee = grossCashIn * rate(product.paymentFeeRate);
  const returnExpectedLoss = clean(product.returnLoss) * rate(product.returnRate);
  const variableCost =
    clean(product.costPrice) +
    platformFee +
    paymentFee +
    clean(product.shippingCost) +
    clean(product.packagingCost) +
    clean(product.adCost) +
    returnExpectedLoss;
  const profit = salesBase - variableCost;
  const marginRate = salesBase > 0 ? (profit / salesBase) * 100 : 0;
  const monthlyProfit = profit * clean(product.monthlySales) - clean(product.monthlyFixedCost);
  const breakEvenQuantity = profit > 0 ? Math.ceil(clean(product.monthlyFixedCost) / profit) : Infinity;
  const breakEvenPrice = findRequiredPrice(product, 0);
  const targetPrice = findRequiredPrice(product, clean(product.targetMarginRate));
  const maxCoupon = Math.max(0, profit - salesBase * 0.05);

  return {
    grossCashIn,
    salesBase,
    vatReserve,
    platformFee,
    paymentFee,
    returnExpectedLoss,
    variableCost,
    profit,
    marginRate,
    monthlyProfit,
    breakEvenQuantity,
    breakEvenPrice,
    targetPrice,
    maxCoupon,
  };
}

function findRequiredPrice(product, targetMarginRate) {
  let low = 0;
  let high = Math.max(clean(product.salePrice) * 3, clean(product.costPrice) * 4, 10000);

  for (let step = 0; step < 80; step += 1) {
    const mid = (low + high) / 2;
    const trial = calculateWithoutPriceSearch({ ...product, salePrice: mid });
    const targetProfit = trial.salesBase * rate(targetMarginRate);
    if (trial.profit >= targetProfit) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return Math.ceil(high / 10) * 10;
}

function calculateWithoutPriceSearch(product) {
  const salePrice = clean(product.salePrice);
  const shippingIncome = clean(product.shippingIncome);
  const grossCashIn = salePrice + shippingIncome;
  const vatReserve = product.vatMode === "included" ? grossCashIn / 11 : 0;
  const salesBase = product.vatMode === "included" ? grossCashIn - vatReserve : grossCashIn;
  const platformFee = salePrice * rate(product.platformFeeRate);
  const paymentFee = grossCashIn * rate(product.paymentFeeRate);
  const returnExpectedLoss = clean(product.returnLoss) * rate(product.returnRate);
  const variableCost =
    clean(product.costPrice) +
    platformFee +
    paymentFee +
    clean(product.shippingCost) +
    clean(product.packagingCost) +
    clean(product.adCost) +
    returnExpectedLoss;

  return {
    salesBase,
    profit: salesBase - variableCost,
  };
}

function clean(value) {
  return Math.max(Number(value) || 0, 0);
}

function rate(value) {
  return clean(value) / 100;
}

function formatWon(value) {
  if (!Number.isFinite(value)) return "계산 불가";
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(1)}%`;
}

function getHealth(result) {
  if (result.profit <= 0 || result.marginRate < 8) {
    return {
      label: "위험",
      className: "bad",
    };
  }

  if (result.marginRate < 20) {
    return {
      label: "주의",
      className: "warning",
    };
  }

  return {
    label: "양호",
    className: "good",
  };
}

function fillForm(product) {
  field("productId").value = product.id || "";
  field("productName").value = product.productName || "";
  field("channel").value = product.channel || "smartstore";
  field("monthlySales").value = product.monthlySales || 0;
  field("salePrice").value = product.salePrice || 0;
  field("costPrice").value = product.costPrice || 0;
  field("platformFeeRate").value = product.platformFeeRate || 0;
  field("paymentFeeRate").value = product.paymentFeeRate || 0;
  field("adCost").value = product.adCost || 0;
  field("shippingIncome").value = product.shippingIncome || 0;
  field("shippingCost").value = product.shippingCost || 0;
  field("packagingCost").value = product.packagingCost || 0;
  field("returnRate").value = product.returnRate || 0;
  field("returnLoss").value = product.returnLoss || 0;
  field("targetMarginRate").value = product.targetMarginRate || 0;
  field("vatMode").value = product.vatMode || "included";
  field("monthlyFixedCost").value = product.monthlyFixedCost || 0;
  field("memo").value = product.memo || "";
}

function resetForm() {
  state.activeId = null;
  fillForm({ ...DEFAULT_PRODUCT, productName: "" });
  render();
}

function render() {
  const product = getFormProduct();
  const result = calculate(product);
  renderResult(product, result);
  renderProductRows();
}

function renderResult(product, result) {
  const health = getHealth(result);
  elements.statusPill.textContent = health.label;
  elements.statusPill.className = `status-pill ${health.className}`;

  const kpis = [
    {
      label: "한 개 순이익",
      value: formatWon(result.profit),
      detail: result.profit > 0 ? "판매 1건에서 남는 돈" : "팔수록 손실",
    },
    {
      label: "순마진",
      value: formatPercent(result.marginRate),
      detail: `목표 ${formatPercent(product.targetMarginRate)}`,
    },
    {
      label: "월 예상 이익",
      value: formatWon(result.monthlyProfit),
      detail: `${clean(product.monthlySales).toLocaleString("ko-KR")}개 판매 기준`,
    },
    {
      label: "쿠폰 여력",
      value: formatWon(result.maxCoupon),
      detail: "5% 최소 이익을 남긴 기준",
    },
  ];

  elements.kpiGrid.innerHTML = kpis
    .map(
      (item) => `
        <article class="kpi">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
          <small>${escapeHtml(item.detail)}</small>
        </article>
      `,
    )
    .join("");

  elements.currentPriceText.textContent = formatWon(product.salePrice);
  elements.breakEvenPriceText.textContent = formatWon(result.breakEvenPrice);
  elements.targetPriceText.textContent = formatWon(result.targetPrice);
  renderDecisions(product, result, health);
  renderCostBars(product, result);
}

function renderDecisions(product, result, health) {
  const items = [];

  if (health.className === "bad") {
    items.push({
      title: "그대로 팔면 위험",
      body: `목표 마진을 맞추려면 판매가를 ${formatWon(result.targetPrice)} 근처에서 다시 봐야 합니다.`,
    });
  } else if (health.className === "warning") {
    items.push({
      title: "광고비와 쿠폰을 먼저 점검",
      body: "마진이 얇습니다. 가격 인상보다 광고비, 무료배송, 쿠폰 조건을 먼저 줄여보는 편이 빠릅니다.",
    });
  } else {
    items.push({
      title: "판매 유지 가능",
      body: "현재 입력값 기준으로는 마진이 남습니다. 다음 비교 대상은 광고비를 올렸을 때의 순이익입니다.",
    });
  }

  if (result.breakEvenQuantity === Infinity) {
    items.push({
      title: "월 고정비 회수 불가",
      body: "한 개를 팔 때 이익이 없어서 판매량을 늘려도 고정비를 회수하기 어렵습니다.",
    });
  } else {
    items.push({
      title: "고정비 회수 기준",
      body: `월 고정비를 회수하려면 약 ${result.breakEvenQuantity.toLocaleString("ko-KR")}개 판매가 필요합니다.`,
    });
  }

  if (result.vatReserve > 0) {
    items.push({
      title: "부가세 보관액",
      body: `건당 ${formatWon(result.vatReserve)} 정도는 내 돈처럼 쓰지 않는 기준으로 계산했습니다.`,
    });
  }

  elements.decisionBox.innerHTML = items
    .map(
      (item) => `
        <article class="decision-item">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `,
    )
    .join("");
}

function renderCostBars(product, result) {
  const costs = [
    { label: "원가", value: clean(product.costPrice), color: "var(--purple)" },
    { label: "수수료", value: result.platformFee + result.paymentFee, color: "var(--blue)" },
    { label: "배송·포장", value: clean(product.shippingCost) + clean(product.packagingCost), color: "var(--amber)" },
    { label: "광고", value: clean(product.adCost), color: "var(--red)" },
    { label: "반품", value: result.returnExpectedLoss, color: "#607467" },
  ];
  const max = Math.max(...costs.map((item) => item.value), 1);

  elements.costBars.innerHTML = costs
    .map((item) => {
      const width = Math.round((item.value / max) * 100);
      return `
        <div class="cost-bar">
          <span>${escapeHtml(item.label)}</span>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="width: ${width}%; background: ${item.color};"></div>
          </div>
          <strong>${escapeHtml(formatWon(item.value))}</strong>
        </div>
      `;
    })
    .join("");
}

function renderProductRows() {
  const products = sortedProducts();
  elements.emptyState.hidden = products.length > 0;
  elements.productRows.innerHTML = products.map(renderProductRow).join("");

  document.querySelectorAll(".product-row").forEach((row) => {
    row.addEventListener("click", () => selectProduct(row.dataset.id));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectProduct(row.dataset.id);
      }
    });
  });
}

function sortedProducts() {
  const products = [...state.products];
  if (state.sortMode === "profitDesc") {
    products.sort((a, b) => calculate(b).profit - calculate(a).profit);
  } else if (state.sortMode === "nameAsc") {
    products.sort((a, b) => a.productName.localeCompare(b.productName, "ko"));
  } else {
    products.sort((a, b) => calculate(a).marginRate - calculate(b).marginRate);
  }
  return products;
}

function renderProductRow(product) {
  const result = calculate(product);
  const health = getHealth(result);
  const activeClass = product.id === state.activeId ? " active" : "";
  return `
    <tr class="product-row${activeClass}" data-id="${escapeAttribute(product.id)}" tabindex="0">
      <td class="product-cell">
        <strong>${escapeHtml(product.productName)}</strong>
        <small>${escapeHtml(CHANNEL_PRESETS[product.channel]?.label || "직접 입력")}</small>
      </td>
      <td>${escapeHtml(formatWon(product.salePrice))}</td>
      <td>${escapeHtml(formatWon(result.profit))}</td>
      <td><span class="margin-badge ${escapeAttribute(health.className)}">${escapeHtml(formatPercent(result.marginRate))}</span></td>
      <td>${escapeHtml(formatWon(result.monthlyProfit))}</td>
    </tr>
  `;
}

function selectProduct(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  state.activeId = id;
  fillForm(product);
  render();
}

function saveProduct(event) {
  event.preventDefault();
  const product = getFormProduct();
  if (!product.productName) {
    showToast("상품명을 입력하세요.");
    return;
  }

  product.id = product.id || createId();
  const index = state.products.findIndex((item) => item.id === product.id);
  if (index >= 0) {
    state.products[index] = product;
    showToast("계산을 수정했습니다.");
  } else {
    state.products.push(product);
    showToast("계산을 저장했습니다.");
  }

  state.activeId = product.id;
  field("productId").value = product.id;
  saveProducts();
  render();
}

function deleteProduct() {
  const product = activeProduct();
  if (!product) {
    showToast("삭제할 상품을 먼저 선택하세요.");
    return;
  }

  const confirmed = window.confirm(`${product.productName} 계산을 삭제할까요?`);
  if (!confirmed) return;

  state.products = state.products.filter((item) => item.id !== product.id);
  state.activeId = null;
  saveProducts();
  resetForm();
  showToast("삭제했습니다.");
}

function applyChannelPreset() {
  const channel = field("channel").value;
  const preset = CHANNEL_PRESETS[channel];
  if (!preset || channel === "custom") return;

  field("platformFeeRate").value = preset.platformFeeRate;
  field("paymentFeeRate").value = preset.paymentFeeRate;
  render();
}

function loadSamples() {
  const hasProducts = state.products.length > 0;
  if (hasProducts && !window.confirm("현재 저장된 상품을 예시로 바꿀까요?")) return;
  state.products = SAMPLE_PRODUCTS.map((product) => ({ ...product }));
  state.activeId = state.products[0].id;
  saveProducts();
  fillForm(state.products[0]);
  render();
  showToast("예시를 불러왔습니다.");
}

function exportCsv() {
  const headers = [
    "productName",
    "channel",
    "salePrice",
    "costPrice",
    "platformFeeRate",
    "paymentFeeRate",
    "adCost",
    "shippingIncome",
    "shippingCost",
    "packagingCost",
    "returnRate",
    "returnLoss",
    "targetMarginRate",
    "vatMode",
    "monthlySales",
    "monthlyFixedCost",
    "profit",
    "marginRate",
    "monthlyProfit",
    "memo",
  ];

  const rows = state.products.map((product) => {
    const result = calculate(product);
    const row = {
      ...product,
      profit: Math.round(result.profit),
      marginRate: result.marginRate.toFixed(1),
      monthlyProfit: Math.round(result.monthlyProfit),
    };
    return headers.map((header) => csvCell(row[header])).join(",");
  });

  const blob = new Blob([headers.join(","), "\n", rows.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `seller-margin-note-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("CSV를 내보냈습니다.");
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2200);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\n", "&#10;");
}

function bindEvents() {
  elements.form.addEventListener("submit", saveProduct);
  elements.form.addEventListener("input", render);
  field("channel").addEventListener("change", applyChannelPreset);
  elements.resetButton.addEventListener("click", resetForm);
  elements.deleteButton.addEventListener("click", deleteProduct);
  elements.sampleButton.addEventListener("click", loadSamples);
  elements.exportButton.addEventListener("click", exportCsv);
  elements.printButton.addEventListener("click", () => window.print());
  elements.sortMode.addEventListener("change", () => {
    state.sortMode = elements.sortMode.value;
    state.settings.sortMode = state.sortMode;
    saveSettings();
    renderProductRows();
  });
}

bindEvents();
state.sortMode = state.settings.sortMode || "marginAsc";
elements.sortMode.value = state.sortMode;

if (state.products[0]) {
  state.activeId = state.products[0].id;
  fillForm(state.products[0]);
} else {
  resetForm();
}

render();
