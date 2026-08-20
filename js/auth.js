
// 10 Hardcoded pre-configured accounts
const ACCOUNTS = [
  { username: "user01", password: "pass01", displayName: "Học Viên 01 (Nguyễn An)", avatar: "NA" },
  { username: "user02", password: "pass02", displayName: "Học Viên 02 (Trần Bình)", avatar: "TB" },
  { username: "user03", password: "pass03", displayName: "Học Viên 03 (Lê Cường)", avatar: "LC" },
  { username: "user04", password: "pass04", displayName: "Học Viên 04 (Phạm Dung)", avatar: "PD" },
  { username: "user05", password: "pass05", displayName: "Học Viên 05 (Hoàng Em)", avatar: "HE" },
  { username: "user06", password: "pass06", displayName: "Học Viên 06 (Vũ Giang)", avatar: "VG" },
  { username: "user07", password: "pass07", displayName: "Học Viên 07 (Đỗ Hải)", avatar: "DH" },
  { username: "user08", password: "pass08", displayName: "Học Viên 08 (Bùi Khánh)", avatar: "BK" },
  { username: "user09", password: "pass09", displayName: "Học Viên 09 (Ngô Linh)", avatar: "NL" },
  { username: "user10", password: "pass10", displayName: "Học Viên 10 (Trịnh Minh)", avatar: "TM" }
];

const Auth = {
  getCurrentUser() {
    const raw = localStorage.getItem('eh_current_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch(e) {
      return null;
    }
  },

  login(username, password) {
    const user = ACCOUNTS.find(u => u.username === username && u.password === password);
    if (user) {
      localStorage.setItem('eh_current_user', JSON.stringify(user));
      // Trigger initial user record in DB
      if (window.DB) {
        DB.initUser(user.username);
      }
      return { success: true, user };
    }
    return { success: false, message: "Sai tên đăng nhập hoặc mật khẩu!" };
  },

  logout() {
    localStorage.removeItem('eh_current_user');
    window.location.href = (window.location.pathname.includes('/vocabulary/') || window.location.pathname.includes('/grammar/') || window.location.pathname.includes('/stats/')) 
      ? '../index.html' : 'index.html';
  },

  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      const isSubDir = (window.location.pathname.includes('/vocabulary/') || window.location.pathname.includes('/grammar/') || window.location.pathname.includes('/stats/'));
      window.location.href = isSubDir ? '../index.html' : 'index.html';
      return null;
    }
    return user;
  },

  updateNavbar() {
    const user = this.getCurrentUser();
    const badge = document.getElementById('nav-user-badge');
    if (badge && user) {
      badge.innerHTML = `
        <div class="avatar-circle">${user.avatar || 'HV'}</div>
        <span>${user.displayName}</span>
        <button class="btn btn-outline" style="padding:0.2rem 0.5rem;font-size:0.75rem;margin-left:0.4rem;" onclick="Auth.logout()">Đăng xuất</button>
      `;
    }
  }
};

window.Auth = Auth;
window.ACCOUNTS = ACCOUNTS;
