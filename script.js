/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

const selectedProducts = [];
let currentProducts = [];
let allProducts = [];
const routineSystemPromptParam =
  "You are a helpful beauty advisor. Create a clear personalized routine using only the selected products. You only answer questions about input products, routines, and recommendations.";

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

function getSelectedProductDetails() {
  return allProducts.filter((product) => selectedProducts.includes(product.id));
}

function buildSelectedProductsText(selectedItems) {
  return selectedItems
    .map(
      (product) =>
        `- ${product.brand} | ${product.name} | ${product.category} | ${product.description}`,
    )
    .join("\n");
}

function showNoSelectedProductsMessage() {
  chatWindow.innerHTML =
    "Please select at least one product before generating a routine.";
}

async function requestRoutine(messages) {
  if (typeof OPENAI_API_KEY === "undefined") {
    throw new Error("Missing OPENAI_API_KEY in secret.js");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
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

generateRoutineBtn.addEventListener("click", async () => {
  const selectedItems = allProducts.filter((product) =>
    selectedProducts.includes(product.id),
  );

  if (selectedItems.length === 0) {
    chatWindow.innerHTML =
      "Please select at least one product to generate routines.";
    return;
  }

  generateRoutineBtn.disabled = true;
  chatWindow.innerHTML = "Generating your personalized routine now...";

  try {
    const messages = [
      {
        role: "system",
        content: routineSystemPromptParam,
      },
      {
        role: "user",
        content: `Create a personalized routine using only these selected products. Use the JSON data below and do not recommend products outside of it:\n${JSON.stringify(
          selectedItems.map((product) => ({
            name: product.name,
            brand: product.brand,
            category: product.category,
            description: product.description,
          })),
          null,
          2,
        )}`,
      },
    ];

    const routine = await requestRoutine(messages);
    chatWindow.innerHTML = "";

    const routineMessage = document.createElement("div");
    routineMessage.style.whiteSpace = "pre-wrap";
    routineMessage.textContent = routine;
    chatWindow.appendChild(routineMessage);
  } catch (error) {
    chatWindow.innerHTML =
      "Sorry, I could not generate a routine for those products right now. Please try again later.";
    console.error(error);
  } finally {
    generateRoutineBtn.disabled = false;
  }
});

