// Book management functions
const API_BASE = "https://bookstore-managment-system-production.up.railway.app/";

export async function loadBooksSection() {
    const jwtToken = localStorage.getItem('jwt');
    const books = await fetch(`${API_BASE}/api/v1/books`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
    }).then(res => res.json());

    return `
        <div class="search-section">
            <button class="add-button" onclick="showBookForm()">➕ Προσθήκη Βιβλίου</button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Τίτλος</th>
                        <th>Συγγραφέας</th>
                        <th>Τιμή</th>
                        <th>Stock</th>
                        <th>Ενέργειες</th>
                    </tr>
                </thead>
                <tbody>
                    ${books.map(book => `
                        <tr>
                            <td>${book.title}</td>
                            <td>${book.author}</td>
                            <td>€${book.price}</td>
                            <td>${book.stock}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="view-btn" onclick="editBook(${book.id})">✏️ Επεξεργασία</button>
                                    <button class="delete-btn" onclick="deleteBook(${book.id})">🗑️ Διαγραφή</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

export async function deleteBook(bookId) {
    const jwtToken = localStorage.getItem('jwt');
    await fetch(`${API_BASE}/api/v1/books/${bookId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${jwtToken}` }
    });
    showSection('books');
}

export function showBookForm(book = null) {
    document.getElementById('bookModal').style.display = 'block';
    if (book) {
        document.getElementById('bookId').value = book.id;
        document.getElementById('bookTitle').value = book.title;
        document.getElementById('bookAuthor').value = book.author;
        document.getElementById('bookPrice').value = book.price;
        document.getElementById('bookStock').value = book.stock;
        document.getElementById('modalTitle').textContent = 'Επεξεργασία Βιβλίου';
    } else {
        document.getElementById('bookModal').reset();
        document.getElementById('modalTitle').textContent = 'Προσθήκη Βιβλίου';
    }
}

export async function handleBookSubmit(e) {
    e.preventDefault();
    const jwtToken = localStorage.getItem('jwt');
    const bookData = {
        title: document.getElementById('bookTitle').value,
        author: document.getElementById('bookAuthor').value,
        price: parseFloat(document.getElementById('bookPrice').value),
        stock: parseInt(document.getElementById('bookStock').value)
    };
    
    const method = document.getElementById('bookId').value ? 'PUT' : 'POST';
    const url = document.getElementById('bookId').value 
        ? `${API_BASE}/api/v1/books/${document.getElementById('bookId').value}`
        : `${API_BASE}/api/v1/books`;

    await fetch(url, {
        method,
        headers: { 
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookData)
    });
    
    closeModal();
    showSection('books');
}

export function closeModal() {
    document.getElementById('bookModal').style.display = 'none';
} 