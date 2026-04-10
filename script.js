/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

const selectedProducts = [];
let currentProducts = [];
let allProducts = [];

selectedProductsList.innerHTML = "No products selected yet";

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  currentProducts = products;

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card ${selectedProducts.includes(product.id) ? "selected" : ""}" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `,
    )
    .join("");
}

function renderSelectedProducts() {
  const selectedItems = allProducts.filter((product) =>
    selectedProducts.includes(product.id),
  );

  if (selectedItems.length === 0) {
    selectedProductsList.innerHTML = "No products selected yet";
    return;
  }

  selectedProductsList.innerHTML = selectedItems
    .map((product) => `<span>${product.brand}: ${product.name}</span>`)
    .join("");
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  allProducts = products;
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
});

productsContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card");

  if (!card) {
    return;
  }

  const productId = Number(card.dataset.id);
  const selectedIndex = selectedProducts.indexOf(productId);

  if (selectedIndex >= 0) {
    selectedProducts.splice(selectedIndex, 1);
    card.classList.remove("selected");
  } else {
    const existsInCurrentView = currentProducts.some(
      (product) => product.id === productId,
    );

    if (!existsInCurrentView) {
      return;
    }

    selectedProducts.push(productId);
    card.classList.add("selected");
  }

  renderSelectedProducts();
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});
