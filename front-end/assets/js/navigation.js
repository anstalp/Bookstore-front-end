// Navigation related functions
export async function showSection(section) {
    let html = '';
    switch(section) {
        case 'books':
            html = await loadBooksSection();
            break;
        case 'users':
            html = await loadUsersSection();
            break;
    }
    document.getElementById('content').innerHTML = html;
}

export function navigateTo(page) {
    window.location.href = page;
} 