// Authentication related functions
export function logout() {
    localStorage.removeItem('jwt');
    window.location.href = 'index.html';
}

export function checkAuth() {
    const jwtToken = localStorage.getItem('jwt');
    if (!jwtToken) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
} 