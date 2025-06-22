const API_BASE = "https://bookstore-managment-system-production.up.railway.app";
let jwtToken = localStorage.getItem("jwt");
let bookToDelete = null;

// ==================== Κεντρική διαχείριση ====================
async function showSection(section) {
    let html = '';
    try {
        switch(section) {
            case 'books': html = await loadBooks(); break;
            case 'favorites': html = await loadFavorites(); break;
            case 'orders': html = await loadOrders(); break;
            case 'reviews': html = await loadReviews(); break;
        }
        document.getElementById('content').innerHTML = html;
        if (section === 'books') {
            setupStarRatings();
            setupSearch();
        }
        if (section === 'reviews') setupReviewActions();
    } catch (error) {
        document.getElementById('content').innerHTML = `<p class="error">${error.message}</p>`;
    }
}

// ==================== Βιβλία με αναζήτηση και αξιολόγηση ====================
async function loadBooks() {
    const books = await fetch(`${API_BASE}/api/v1/books`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
    }).then(res => res.json());

    return `
        <div class="search-section">
            <div class="search-container">
                <input type="text" id="searchInput" placeholder="Αναζήτηση βιβλίου...">
                <button type="button" class="search-button" onclick="handleSearch()">Αναζήτηση</button>
            </div>
        </div>
        <div class="book-grid">
            ${books.map(book => `
                <div class="book-card" data-title="${book.title.toLowerCase()}">
                    <h3>${book.title}</h3>
                    <p>Συγγραφέας: ${book.author}</p>
                    <p>Τιμή: €${book.price}</p>
                    <p class="average-rating">Μέσος Όρος: ${book.averageRating?.toFixed(2) || "-"}</p>
                    <div class="star-rating" data-bookid="${book.id}">
                        ${[1,2,3,4,5].map(i => `
                            <span class="star" data-rating="${i}">★</span>
                        `).join('')}
                    </div>
                    <div class="book-actions">
                        <button onclick="addToFavorites(${book.id})">❤️ Αγαπημένα</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function viewBookDetails(bookId) {
    window.location.href = `book-details.html?id=${bookId}`;
}

function setupSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    input.addEventListener('input', function() {
        const term = this.value.toLowerCase();
        document.querySelectorAll('.book-card').forEach(card => {
            card.style.display = card.dataset.title.includes(term) ? 'block' : 'none';
        });
    });
}

function handleSearch() {
    const input = document.getElementById('searchInput');
    const term = input.value.toLowerCase();
    document.querySelectorAll('.book-card').forEach(card => {
        card.style.display = card.dataset.title.includes(term) ? 'block' : 'none';
    });
}

function setupStarRatings() {
    document.querySelectorAll('.star').forEach(star => {
        star.onclick = async function() {
            const bookId = this.parentElement.getAttribute('data-bookid');
            const rating = this.getAttribute('data-rating');
            await rateBook(bookId, rating);
        };
    });
}

async function rateBook(bookId, rating) {
    try {
        const response = await fetch(`${API_BASE}/api/v1/books/${bookId}/rate?rating=${rating}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${jwtToken}` },
        });
        if (response.ok) {
            updateStarRatings(bookId, rating);
            await updateAverageRating(bookId); 
            showModalMessage("Η αξιολόγηση καταχωρήθηκε!");
        } else {
            showModalMessage("Σφάλμα: " + (await response.text()));
        }
    } catch (error) {
        showModalMessage("Σφάλμα δικτύου");
    }
}

async function updateAverageRating(bookId) {
    const response = await fetch(`${API_BASE}/api/v1/books/${bookId}`, {
        headers: { Authorization: `Bearer ${jwtToken}` }
    });
    if (!response.ok) return;
    const book = await response.json();
    const card = document.querySelector(`.star-rating[data-bookid="${bookId}"]`).parentElement;
    const avgElem = card.querySelector('.average-rating');
    avgElem.textContent = `Βαθμολογία: ${book.averageRating?.toFixed(2) || "-"}`;
}

function updateStarRatings(bookId, newRating) {
    const starContainer = document.querySelector(`.star-rating[data-bookid="${bookId}"]`);
    
    starContainer.querySelectorAll('.star').forEach(star => {
        const starRating = parseInt(star.getAttribute('data-rating'));
        star.classList.toggle('active', starRating <= newRating);
    });
}

// ==================== Αγαπημένα (CRUD) ====================
async function loadFavorites() {
    const response = await fetch(`${API_BASE}/api/v1/favorites`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
    });
    const favorites = await response.json();

    return `
        <h2 class="section-title">Αγαπημένα</h2>
        <div class="book-grid">
            ${favorites.map(fav => `
                <div class="book-card">
                    <h3>${fav.title}</h3>
                    <p>Συγγραφέας: ${fav.author}</p>
                    <button onclick="removeFromFavorites(${fav.id})">❌ Αφαίρεση</button>
                </div>
            `).join('')}
        </div>
    `;
}

async function addToFavorites(bookId) {
    try {
        const response = await fetch(`${API_BASE}/api/v1/favorites`, {
            method: "POST",
            headers: { 
                Authorization: `Bearer ${jwtToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ bookId })
        });
        
        if (response.ok) {
            showModalMessage("Προστέθηκε στα αγαπημένα! ❤️");
        } else {
            throw new Error("Αποτυχία προσθήκης");
        }
    } catch (error) {
        showModalMessage(error.message);
    }
}

async function removeFromFavorites(favoriteId) {
    try {
        await fetch(`${API_BASE}/api/v1/favorites/${favoriteId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${jwtToken}` },
        });
        showSection("favorites");
    } catch (error) {
        alert("Σφάλμα αφαίρεσης");
    }
}

// ==================== Παραγγελίες ====================
async function loadOrders() {
    const response = await fetch(`${API_BASE}/api/v1/purchases`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
    });
    const purchases = await response.json();

    return `
        <h2 class="section-title">Παραγγελίες</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Βιβλίο</th>
                        <th>Ποσότητα</th>
                        <th>Συνολική Τιμή</th>
                        <th>Ημερομηνία</th>
                    </tr>
                </thead>
                <tbody>
                    ${purchases.map(purchase => `
                        <tr>
                            <td>${purchase.bookTitle}</td>
                            <td>${purchase.quantity}</td>
                            <td>€${purchase.totalPrice.toFixed(2)}</td>
                            <td>${new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Δημιουργία modal για μηνύματα
function createMessageModal() {
    const modal = document.createElement('div');
    modal.id = 'messageModal';
    modal.style.cssText = `
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 2em;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: fadeIn 0.3s ease-in-out;
    `;
    
    const message = document.createElement('p');
    message.id = 'modalMessage';
    message.style.cssText = `
        margin: 0;
        font-size: 1.1em;
        color: #333;
    `;
    
    modal.appendChild(message);
    document.body.appendChild(modal);
}

// Δημιουργία modal για ποσότητα
function createQuantityModal() {
    const modal = document.createElement('div');
    modal.id = 'quantityModal';
    modal.style.cssText = `
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 2em;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: fadeIn 0.3s ease-in-out;
        text-align: center;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Επιλέξτε Ποσότητα';
    title.style.cssText = `
        margin: 0 0 1em 0;
        color: #333;
    `;
    
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.value = '1';
    input.style.cssText = `
        width: 100px;
        padding: 0.5em;
        margin: 0 0 1em 0;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1.1em;
        text-align: center;
    `;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 1em;
        justify-content: center;
    `;
    
    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Επιβεβαίωση';
    confirmButton.style.cssText = `
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 0.8em 1.5em;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1em;
    `;
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Ακύρωση';
    cancelButton.style.cssText = `
        background: #e0e0e0;
        color: #333;
        border: none;
        padding: 0.8em 1.5em;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1em;
    `;
    
    buttonContainer.appendChild(confirmButton);
    buttonContainer.appendChild(cancelButton);
    
    modal.appendChild(title);
    modal.appendChild(input);
    modal.appendChild(buttonContainer);
    document.body.appendChild(modal);
    
    return { modal, input, confirmButton, cancelButton };
}

document.addEventListener('DOMContentLoaded', () => {
    createMessageModal();
    createQuantityModal();
});

// Ενημερωμένη συνάρτηση αγοράς
async function purchaseBook(bookId) {
    const { modal, input, confirmButton, cancelButton } = {
        modal: document.getElementById('quantityModal'),
        input: document.querySelector('#quantityModal input'),
        confirmButton: document.querySelector('#quantityModal button:first-child'),
        cancelButton: document.querySelector('#quantityModal button:last-child')
    };
    
    // Reset input value
    input.value = '1';
    
    // Show modal
    modal.style.display = 'block';
    
    // Handle confirm
    const handleConfirm = async () => {
        const quantity = parseInt(input.value);
        if (isNaN(quantity) || quantity < 1) {
            showModalMessage("Παρακαλώ εισάγετε έγκυρη ποσότητα");
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/api/v1/purchases`, {
                method: "POST",
                headers: { 
                    Authorization: `Bearer ${jwtToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ bookId, quantity })
            });
            
            if (response.ok) {
                showModalMessage("Η αγορά ολοκληρώθηκε! 🛒");
                modal.style.display = 'none';
            } else {
                throw new Error("Αποτυχία αγοράς");
            }
        } catch (error) {
            showModalMessage(error.message);
        }
        
        // Remove event listeners
        confirmButton.removeEventListener('click', handleConfirm);
        cancelButton.removeEventListener('click', handleCancel);
    };
    
    // Handle cancel
    const handleCancel = () => {
        modal.style.display = 'none';
        // Remove event listeners
        confirmButton.removeEventListener('click', handleConfirm);
        cancelButton.removeEventListener('click', handleCancel);
    };
    
    // Add event listeners
    confirmButton.addEventListener('click', handleConfirm);
    cancelButton.addEventListener('click', handleCancel);
    
    // Handle Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleConfirm();
        }
    });
}

// ==================== Αξιολογήσεις/Κριτικές (CRUD) ====================
async function loadReviews() {
    const response = await fetch(`${API_BASE}/api/v1/reviews`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
    });
    const reviews = await response.json();

    return `
        <div class="reviews-list">
            ${reviews.map(review => `
                <div class="review-card">
                    <h4>${review.bookTitle}</h4>
                    <p>${review.comment}</p>
                    <button onclick="openEditReviewModal(${review.id}, '${review.comment.replace(/'/g, "\\'")}')">✏️ Επεξεργασία</button>
                    <button onclick="deleteReview(${review.id})">🗑️ Διαγραφή</button>
                </div>
            `).join('')}
            <button onclick="openAddReviewModal()">➕ Νέα Κριτική</button>
        </div>
    `;
}

function setupReviewActions() {
    
}

function openAddReviewModal(bookId = null) {
    document.getElementById('reviewModal').style.display = 'block';
    document.getElementById('reviewBookId').value = bookId || '';
    document.getElementById('reviewText').value = '';
    document.getElementById('modalTitle').textContent = 'Νέα Αξιολόγηση';
}

function openEditReviewModal(reviewId, comment) {
    document.getElementById('reviewModal').style.display = 'block';
    document.getElementById('reviewBookId').value = reviewId;
    document.getElementById('reviewText').value = comment;
    document.getElementById('modalTitle').textContent = 'Επεξεργασία Αξιολόγησης';
}

function closeModal() {
    document.getElementById('reviewModal').style.display = 'none';
}

async function handleReviewSubmit(e) {
    e.preventDefault();
    const reviewId = document.getElementById('reviewBookId').value;
    const comment = document.getElementById('reviewText').value;
    const method = reviewId ? 'PUT' : 'POST';
    const url = reviewId ? `${API_BASE}/api/v1/reviews/${reviewId}` : `${API_BASE}/api/v1/reviews`;

    try {
        const response = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${jwtToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ comment }),
        });
        if (response.ok) {
            closeModal();
            showSection('reviews');
        } else {
            throw new Error('Αποτυχία αποθήκευσης');
        }
    } catch (error) {
        alert(error.message);
    }
}

async function deleteReview(reviewId) {
    if (!confirm('Σίγουρα διαγραφή;')) return;
    try {
        await fetch(`${API_BASE}/api/v1/reviews/${reviewId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${jwtToken}` },
        });
        showSection('reviews');
    } catch (error) {
        alert("Σφάλμα διαγραφής");
    }
}

// ==================== Βοηθητικά ====================
function logout() {
    localStorage.removeItem("jwt");
    window.location.href = "/index.html";
}

// ==================== Εμφάνιση Σελίδας ====================
async function showBooksSection() {
    document.getElementById('content').innerHTML = await loadBooks();
    setupStarRatings();
    setupSearch();
}

async function showSection(section) {
    let html = '';
    switch(section) {
        case 'favorites': html = await loadFavorites(); break;
        case 'orders': html = await loadOrders(); break;
        case 'reviews': html = await loadReviews(); setupReviewActions(); break;
    }
    document.getElementById('content').innerHTML = html;
}

// ==================== Navigation Helpers ====================
function navigateTo(page) {
    window.location.href = `${page}.html`;
}

// Εμφάνιση μηνύματος
function showModalMessage(text) {
    const modal = document.getElementById('messageModal');
    document.getElementById('modalMessage').textContent = text;
    modal.style.display = 'block';
    
    // Auto close after 1 second
    setTimeout(() => {
        modal.style.animation = 'fadeOut 0.3s ease-in-out';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.animation = 'fadeIn 0.3s ease-in-out';
        }, 300);
    }, 1000);
}

// Add keyframes for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -60%); }
        to { opacity: 1; transform: translate(-50%, -50%); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, -50%); }
        to { opacity: 0; transform: translate(-50%, -60%); }
    }
`;
document.head.appendChild(style);

// Δημιούργησε το modal κατά τη φόρτωση
document.addEventListener('DOMContentLoaded', createMessageModal);

function displayBooks(books) {
    document.getElementById('content').innerHTML = `
        <div class="book-grid">
            ${books.map(book => `
                <div class="book-card">
                    <h3 class="book-title-link" onclick="viewBookDetails(${book.id})">${book.title}</h3>
                    <p>Συγγραφέας: ${book.author}</p>
                    <p>Τιμή: €${book.price}</p>
                    <p class="average-rating">Βαθμολογία: ${book.averageRating?.toFixed(2) || "-"}</p>
                    <div class="star-rating" data-bookid="${book.id}">
                        ${[1,2,3,4,5].map(i => `
                            <span class="star" data-rating="${i}">★</span>
                        `).join('')}
                    </div>
                    <div class="book-actions">
                        <button onclick="addToFavorites(${book.id})">❤️ Αγαπημένα</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    setupStarRatings();
}

async function renderBooks() {
        allBooks = await fetchBooks();
        displayBooks(allBooks);
}

async function fetchBooks() {
    const response = await fetch(`${API_BASE}/api/v1/books`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
    });
return await response.json();
}

// ==================== Πελάτες (CRUD) ====================
async function loadCustomers() {
    const customers = await fetch(`${API_BASE}/api/v1/users`).then(res => res.json());
    displayCustomers(customers);
}

function displayCustomers(customers) {
    const table = document.getElementById('customersTable');
    if (!table) return;

    const tbody = table.querySelector('tbody');
    tbody.innerHTML = customers.map(customer => `
        <tr>
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td>
                <button onclick="window.location.href='customer-details.html?id=${customer.id}'">Λεπτομέρειες</button>
            </td>
        </tr>
    `).join('');
}

// ==================== Λειτουργίες Modal ====================
function openAddBookModal() {
    document.getElementById('bookModal').style.display = 'block';
}

async function handleBookSubmit(e) {
    e.preventDefault();
    
    const bookData = {
        title: document.getElementById('bookTitle').value,
        author: document.getElementById('bookAuthor').value,
        isbn: document.getElementById('bookIsbn').value,
        price: parseFloat(document.getElementById('bookPrice').value),
        stock: parseInt(document.getElementById('bookStock').value),
        release_date: document.getElementById('bookReleaseDate').value
    };

    const bookId = document.getElementById('bookId').value;
    const method = bookId ? 'PUT' : 'POST';
    const url = bookId ? `${API_BASE}/api/v1/books/${bookId}` : `${API_BASE}/api/v1/books`;

    try {
        const response = await fetch(url, {
            method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify(bookData)
        });

        if (response.ok) {
            closeModal();
            loadBooks();
        }
    } catch (error) {
        showModalMessage("Σφάλμα: " + error.message);
    }
}

async function updateStock(bookId) {
    try {
        
        const input = prompt("Εισάγετε τη νέα ποσότητα:");
        if (input === null) return; 
        
        const newStock = parseInt(input);
        if (isNaN(newStock)) {
            showModalMessage("Μη έγκυρη τιμή! Εισάγετε αριθμό.");
            return;
        }

        const response = await fetch(`${API_BASE}/api/v1/books/${bookId}`, {
            method: "PUT",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwtToken}`
            },
            body: JSON.stringify({ stock: newStock })
        });

        if (response.ok) {
            showModalMessage("Το stock ενημερώθηκε!");
            loadBooks();
        } else {
            const error = await response.text();
            showModalMessage(`Σφάλμα: ${error}`);
        }
    } catch (error) {
        showModalMessage("Σφάλμα δικτύου: " + error.message);
    }
}

function closeModal() {
    document.getElementById('bookModal').style.display = 'none';
}

function displayBooksEmployee(books) {
    document.getElementById('content').innerHTML = `
        <table class="employee-books-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Τίτλος</th>
                    <th>Συγγραφέας</th>
                    <th>ISBN</th>
                    <th>Τιμή</th>
                    <th>Ποσότητα</th>
                    <th>Ημ/νία Κυκλοφορίας</th>
                    <th>Ενέργειες</th>
                </tr>
            </thead>
            <tbody>
                ${books.map(book => `
                    <tr>
                        <td>${book.id}</td>
                        <td>${book.title}</td>
                        <td>${book.author}</td>
                        <td>${book.isbn}</td>
                        <td>€${book.price.toFixed(2)}</td>
                        <td>${book.stock}</td>
                        <td>${new Date(book.releaseDate).toLocaleDateString('el-GR')}</td>
                        <td class="action-buttons">
                            <button onclick="updateStock(${book.id})">✏️ Επεξεργασία</button>
                            <button onclick="deleteBook(${book.id})">🗑️ Διαγραφή</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function deleteBook(bookId) {
    showConfirmModal(bookId);
}

async function confirmDelete() {
    if (!bookToDelete) return;
    try {
        const response = await fetch(`${API_BASE}/api/v1/books/${bookToDelete}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${jwtToken}` }
        });
        if (response.ok) {
            closeConfirmModal();
            loadBooksEmployee();
            showModalMessage("Το βιβλίο διαγράφηκε επιτυχώς!");
        } else {
            showModalMessage("Σφάλμα διαγραφής: " + (await response.text()));
        }
    } catch (error) {
        showModalMessage("Σφάλμα διαγραφής: " + error.message);
    }
}

function showConfirmModal(bookId) {
    bookToDelete = bookId;
    document.getElementById("confirmModal").style.display = "block";
}

function closeConfirmModal() {
    document.getElementById("confirmModal").style.display = "none";
    bookToDelete = null;
}

async function loadBooksEmployee() {
    try {
        const response = await fetch(`${API_BASE}/api/v1/books`, {
            headers: { Authorization: `Bearer ${jwtToken}` }
        });
        const books = await response.json();
        displayBooksEmployee(books); 
    } catch (error) {
        showModalMessage("Σφάλμα φόρτωσης βιβλίων: " + error.message);
    }
}

function newBook() {
    // Καθαρίζει όλα τα πεδία της φόρμας
    document.getElementById('bookId').value = "";
    document.getElementById('bookTitle').value = "";
    document.getElementById('bookAuthor').value = "";
    document.getElementById('bookIsbn').value = "";
    document.getElementById('bookPrice').value = "";
    document.getElementById('bookStock').value = "";
    document.getElementById('bookReleaseDate').value = "";

    // Αλλάζει τον τίτλο του modal
    document.getElementById('modalTitle').textContent = "Νέο Βιβλίο";

    // Εμφανίζει το modal
    document.getElementById('bookModal').style.display = 'block';
}
