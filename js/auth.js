// Firebase Authentication Management (Zero Passwords in Code)
// Passwords are encrypted & handled securely by Google Firebase Auth servers.

const Auth = {
  // Get active session user
  getCurrentUser() {
    const raw = localStorage.getItem('eh_current_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch(e) {
      return null;
    }
  },

  // Helper to format email if user enters just "user01"
  formatEmail(input) {
    input = input.trim();
    if (input.includes('@')) return input;
    return `${input}@englishhub.com`;
  },

  // Login via Firebase Auth
  async login(emailOrUser, password) {
    const email = this.formatEmail(emailOrUser);
    
    if (window.isFirebaseActive && typeof firebase !== 'undefined' && firebase.auth) {
      try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const fbUser = userCredential.user;
        
        const username = email.split('@')[0];
        const userObj = {
          uid: fbUser.uid,
          email: fbUser.email,
          username: username,
          displayName: fbUser.displayName || `Học Viên (${username})`,
          avatar: username.substring(0, 2).toUpperCase()
        };

        localStorage.setItem('eh_current_user', JSON.stringify(userObj));
        
        if (window.DB) {
          DB.initUser(userObj.username);
        }
        return { success: true, user: userObj };
      } catch (error) {
        let msg = "Đăng nhập thất bại: ";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          msg = "Sai tài khoản hoặc mật khẩu!";
        } else if (error.code === 'auth/invalid-email') {
          msg = "Định dạng email không hợp lệ!";
        } else {
          msg += error.message;
        }
        return { success: false, message: msg };
      }
    } else {
      // Fallback offline session mode
      const username = email.split('@')[0];
      const userObj = {
        uid: 'local_' + username,
        email: email,
        username: username,
        displayName: `Học Viên (${username})`,
        avatar: username.substring(0, 2).toUpperCase()
      };
      localStorage.setItem('eh_current_user', JSON.stringify(userObj));
      if (window.DB) DB.initUser(userObj.username);
      return { success: true, user: userObj };
    }
  },

  // Logout
  async logout() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        await firebase.auth().signOut();
      } catch(e) {}
    }
    localStorage.removeItem('eh_current_user');
    const isSub = (window.location.pathname.includes('/vocabulary/') || window.location.pathname.includes('/grammar/') || window.location.pathname.includes('/stats/'));
    window.location.href = isSub ? '../index.html' : 'index.html';
  },

  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      const isSub = (window.location.pathname.includes('/vocabulary/') || window.location.pathname.includes('/grammar/') || window.location.pathname.includes('/stats/'));
      window.location.href = isSub ? '../index.html' : 'index.html';
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
