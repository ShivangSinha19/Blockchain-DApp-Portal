$(document).ready(function() {
  // Handle all three login forms
  $('#manufacturerLoginForm, #sellerLoginForm, #consumerLoginForm').on('submit', function(event) {
    event.preventDefault();
    
    const username = $('#username').val().trim();
    const password = $('#password').val().trim();
    const userType = $('#userType').val(); // manufacturer, seller, or consumer
    
    if (!username || !password) {
      showMessage('Please fill all fields', 'error');
      return;
    }
    
    // Validate credentials
    if (validateLogin(username, password, userType)) {
      // Store session
      const loginSession = {
        username: username,
        userType: userType,
        loginTime: new Date().toISOString(),
        isLoggedIn: true
      };
      
      localStorage.setItem('userSession', JSON.stringify(loginSession));
      localStorage.setItem('requireMetaMaskConnect', 'true'); // Auto-trigger MetaMask
      
      showMessage('Login successful! Redirecting...', 'success');
      
      // Redirect after 1 second
      setTimeout(() => {
        redirectToPortal(userType);
      }, 1000);
      
    } else {
      showMessage('Invalid credentials', 'error');
    }
  });
  
  function validateLogin(username, password, userType) {
    // Demo credentials (replace with your actual authentication)
    const validUsers = {
      manufacturer: [
        { username: 'manu1', password: 'pass123' },
        { username: 'manufacturer', password: 'manu@123' }
      ],
      seller: [
        { username: 'seller1', password: 'pass123' },
        { username: 'seller', password: 'sell@123' }
      ],
      consumer: [
        { username: 'consumer1', password: 'pass123' },
        { username: 'consumer', password: 'cons@123' }
      ]
    };
    
    const users = validUsers[userType] || [];
    return users.some(user => user.username === username && user.password === password);
  }
  
  function redirectToPortal(userType) {
    const portals = {
      manufacturer: 'manufacturer.html',
      seller: 'seller.html',
      consumer: 'consumer.html'
    };
    
    window.location.href = portals[userType] || 'index.html';
  }
  
  function showMessage(message, type) {
    const colors = { success: '#4ade80', error: '#f87171', info: '#60a5fa' };
    const msgDiv = $('<div>')
      .css({
        position: 'fixed', top: '20px', right: '20px', padding: '15px 25px',
        backgroundColor: colors[type] || colors.info, color: 'white',
        borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 9999, fontSize: '14px', fontWeight: '600',
        animation: 'slideIn 0.3s ease'
      })
      .text(message)
      .appendTo('body');
    
    setTimeout(() => msgDiv.fadeOut(() => msgDiv.remove()), 3000);
  }
});

// Add slide-in animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);