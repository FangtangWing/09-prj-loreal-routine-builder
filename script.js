/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const clearSelectedBtn = document.getElementById("clearSelected");

const selectedProducts = [];
let currentProducts = [];
let allProducts = [];
const selectedProductsStorageKey = "selectedProductIds";

let selectedProductContext = [];
let contextHistory = [];
const workerApiUrl = "https://chatbot-worker.3248613716.workers.dev";

const routineSystemPromptParam =
  "You are a helpful beauty advisor. Create a clear personalized routine using only the selected products. You only answer questions about input products, routines, and recommendations.";

const savedSelectedProducts = JSON.parse(
  localStorage.getItem(selectedProductsStorageKey) || "[]",
);

if (Array.isArray(savedSelectedProducts)) {
  selectedProducts.push(
    ...savedSelectedProducts.filter((id) => Number.isInteger(id)),
  );
}

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
    .map(
      (product) =>
        `<span>${product.brand}: ${product.name}<button type="button" class="remove-selected-btn" data-id="${product.id}" aria-label="Remove ${product.name}">x</button></span>`,
    )
    .join("");
}

function saveSelectedProducts() {
  localStorage.setItem(
    selectedProductsStorageKey,
    JSON.stringify(selectedProducts),
  );
}

function showNoSelectedProductsMessage() {
  chatWindow.innerHTML =
    "Please select at least one product before generating a routine.";
}

async function requestRoutine(messages) {
  const response = await fetch(workerApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Worker request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }

  if (data.reply) {
    return data.reply;
  }

  if (data.content) {
    return data.content;
  }

  throw new Error("Unexpected worker response format");
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

  saveSelectedProducts();
  renderSelectedProducts();
});

selectedProductsList.addEventListener("click", (e) => {
  const removeButton = e.target.closest(".remove-selected-btn");

  if (!removeButton) {
    return;
  }

  const productId = Number(removeButton.dataset.id);
  const selectedIndex = selectedProducts.indexOf(productId);

  if (selectedIndex >= 0) {
    selectedProducts.splice(selectedIndex, 1);
    saveSelectedProducts();
    renderSelectedProducts();
    displayProducts(currentProducts);
  }
});
// clear Items
clearSelectedBtn.addEventListener("click", () => {
  selectedProducts.length = 0;
  saveSelectedProducts();
  renderSelectedProducts();
  displayProducts(currentProducts);
});

loadProducts().then((products) => {
  allProducts = products;
  renderSelectedProducts();
});

generateRoutineBtn.addEventListener("click", async () => {
  const selectedItems = allProducts.filter((product) =>
    selectedProducts.includes(product.id),
  );

  /* Save selected product context */
  selectedProductContext = selectedItems.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

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
          selectedProductContext,
          null,
          2,
        )}`,
      },
    ];

    const routine = await requestRoutine(messages);
    contextHistory = [{ role: "assistant", content: routine }];
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

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput");
  const question = userInput.value.trim();

  if (!question) {
    return;
  }
  /* Empty Input Check*/
  if (selectedProductContext.length === 0 || contextHistory.length === 0) {
    chatWindow.innerHTML = "No routine context found. Let's start a new topic!";
    return;
  }

  userInput.value = "";

  const userMessage = document.createElement("div");
  userMessage.textContent = `You: ${question}`;
  chatWindow.appendChild(userMessage);

  const followUpMessages = [
    {
      role: "system",
      content: routineSystemPromptParam,
    },
    {
      role: "user",
      // JSON changer
      content: `Selected products JSON:\n${JSON.stringify(
        selectedProductContext,
        null,
        2,
      )}`,
    },
    ...contextHistory,
    {
      role: "user",
      content: question,
    },
  ];

  const waitingMessage = document.createElement("div");
  waitingMessage.textContent = "waiting...";
  chatWindow.appendChild(waitingMessage);

  try {
    const followUpAnswer = await requestRoutine(followUpMessages);
    waitingMessage.remove();
    contextHistory.push({ role: "user", content: question });
    contextHistory.push({ role: "assistant", content: followUpAnswer });

    const assistantMessage = document.createElement("div");
    assistantMessage.style.whiteSpace = "pre-wrap";
    assistantMessage.textContent = `Adviser: ${followUpAnswer}`;
    chatWindow.appendChild(assistantMessage);
  } catch (error) {
    waitingMessage.remove();
    const errorMessage = document.createElement("div");
    errorMessage.textContent =
      "Sorry, I could not answer that right now. Please try again later.";
    chatWindow.appendChild(errorMessage);
    console.error(error);
  }
});
