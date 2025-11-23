const MetaMaskHandler = {
  account: null,
  isConnected: false,
  expectedChains: ['0x539', '0x1337'],
  autoConnectAttempted: false,
  userSession: null,
  
  init: function() {
    $(this.setup.bind(this));
  },
  
  setup: function() {
    this.checkLoginSession();
    this.bind();
    this.autoConnectOnLoad();
  },
  
  checkLoginSession: function() {
    // Get user session from localStorage
    const sessionData = localStorage.getItem('userSession');
    
    if (!sessionData) {
      // No login session, redirect to login
      console.warn('No active session found');
      this.showNotification('Please login first', 'warning');
      setTimeout(() => {
        window.location.href = 'index.html'; // Redirect to login
      }, 2000);
      return false;
    }
    
    try {
      this.userSession = JSON.parse(sessionData);
      
      // Verify session is valid
      if (!this.userSession.isLoggedIn) {
        throw new Error('Invalid session');
      }
      
      // Check if on correct portal
      const currentPage = window.location.pathname.split('/').pop();
      const expectedPage = this.userSession.userType + '.html';
      
      if (currentPage !== expectedPage) {
        console.warn('Wrong portal for user type');
        window.location.href = expectedPage;
        return false;
      }
      
      console.log('Session valid:', this.userSession);
      return true;
      
    } catch (error) {
      console.error('Session error:', error);
      localStorage.removeItem('userSession');
      window.location.href = 'index.html';
      return false;
    }
  },
  
  bind: function() {
    $(document).on('click', '#connectWallet', this.connect.bind(this));
    $(document).on('click', '#disconnectWallet', this.disconnect.bind(this));
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length) {
          this.account = accounts[0];
          this.isConnected = true;
          this.linkAccountToSession();
          this.persist();
          this.ui();
          this.balance();
        } else {
          this.handleDisconnect();
        }
      });
      
      window.ethereum.on('chainChanged', () => location.reload());
    }
  },
  
  // Auto-connect on page load
  autoConnectOnLoad: async function() {
    if (this.autoConnectAttempted) return;
    this.autoConnectAttempted = true;
    
    if (!window.ethereum) {
      this.ui();
      this.showNotification('MetaMask not installed. Please install it.', 'error');
      return;
    }
    
    // Check if auto-connect was requested from login
    const shouldAutoConnect = localStorage.getItem('requireMetaMaskConnect') === 'true';
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length > 0) {
        // Already connected
        this.account = accounts[0];
        this.isConnected = true;
        this.linkAccountToSession();
        this.ui();
        await this.checkNetwork();
        this.balance();
        this.showNotification('MetaMask auto-connected!', 'success');
        localStorage.removeItem('requireMetaMaskConnect');
      } else if (shouldAutoConnect) {
        // Trigger connection popup automatically after login
        await this.connect(true);
        localStorage.removeItem('requireMetaMaskConnect');
      } else {
        // Show connect button
        this.ui();
      }
    } catch (e) {
      console.error('Auto-connect failed:', e);
      this.ui();
    }
  },
  
  linkAccountToSession: function() {
    if (!this.userSession || !this.account) return;
    
    // Link MetaMask account to user session
    this.userSession.metamaskAccount = this.account;
    localStorage.setItem('userSession', JSON.stringify(this.userSession));
    
    console.log(`Linked ${this.account} to ${this.userSession.userType} session`);
  },
  
  connect: async function(isAutoTrigger = false) {
    if (!window.ethereum) {
      alert('Install MetaMask extension');
      window.open('https://metamask.io', '_blank');
      return;
    }
    
    const btn = $('#connectWallet');
    if (!isAutoTrigger) {
      btn.prop('disabled', true).text('Connecting...');
    }
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.account = accounts[0];
      this.isConnected = true;
      this.linkAccountToSession();
      this.persist();
      await this.checkNetwork();
      this.ui();
      this.balance();
      
      if (!isAutoTrigger) {
        this.showNotification('MetaMask connected!', 'success');
      }
    } catch (e) {
      console.error('Connection error:', e);
      this.handleDisconnect();
      
      if (e.code === 4001) {
        this.showNotification('Connection rejected', 'warning');
      } else {
        this.showNotification('Connection failed', 'error');
      }
    } finally {
      if (!isAutoTrigger) {
        btn.prop('disabled', false).text(this.isConnected ? 'Connected' : 'Connect MetaMask');
      }
    }
  },
  
  checkNetwork: async function() {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (!this.expectedChains.includes(chainId)) {
        const switched = await this.switchNetwork();
        if (!switched) {
          this.showNotification('Please switch to Ganache network', 'warning');
        }
      }
    } catch (e) {
      console.error('Network check failed:', e);
    }
  },
  
  switchNetwork: async function() {
    for (const cid of this.expectedChains) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: cid }]
        });
        return true;
      } catch (e) {
        if (e.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: cid,
                chainName: 'Ganache Local',
                nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['http://localhost:7545']
              }]
            });
            return true;
          } catch (inner) {
            console.error('Add network failed:', inner);
          }
        }
      }
    }
    return false;
  },
  
  balance: async function() {
    if (!this.account || typeof web3 === 'undefined') return;
    try {
      const b = await web3.eth.getBalance(this.account);
      const ethBal = web3.utils.fromWei(b, 'ether');
      $('#walletBalance').html('<strong>Balance:</strong> ' + parseFloat(ethBal).toFixed(4) + ' ETH');
    } catch (e) {
      console.error('Balance fetch failed:', e);
    }
  },
  
  ui: function() {
    const statusEl = $('#walletStatus');
    const detailsEl = $('#walletDetails');
    const addressEl = $('#walletAddress');
    const balanceEl = $('#walletBalance');
    const connectBtn = $('#connectWallet');
    const disconnectBtn = $('#disconnectWallet');
    
    if (this.isConnected && this.account) {
      statusEl.removeClass('disconnected').addClass('connected');
      statusEl.find('.status-text').text('Connected');
      
      addressEl.text(this.account.slice(0, 6) + '...' + this.account.slice(-4));
      if (detailsEl.length) detailsEl.show();
      
      connectBtn.hide();
      disconnectBtn.show();
    } else {
      statusEl.removeClass('connected').addClass('disconnected');
      statusEl.find('.status-text').text('Not Connected');
      
      if (detailsEl.length) detailsEl.hide();
      addressEl.text('-');
      balanceEl.text('-');
      
      connectBtn.show().text('Connect MetaMask');
      disconnectBtn.hide();
    }
  },
  
  disconnect: function() {
    if (confirm('Disconnect MetaMask and logout?')) {
      this.handleDisconnect();
      this.logout();
    }
  },
  
  handleDisconnect: function() {
    this.account = null;
    this.isConnected = false;
    localStorage.removeItem('metamaskConnected');
    this.ui();
  },
  
  logout: function() {
    localStorage.removeItem('userSession');
    localStorage.removeItem('metamaskConnected');
    localStorage.removeItem('requireMetaMaskConnect');
    this.showNotification('Logged out', 'info');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  },
  
  persist: function() {
    localStorage.setItem('metamaskConnected', 'true');
  },
  
  showNotification: function(message, type) {
    const colors = { success: '#4ade80', error: '#f87171', warning: '#fbbf24', info: '#60a5fa' };
    const notification = $('<div>')
      .css({
        position: 'fixed', top: '80px', right: '20px', padding: '12px 20px',
        backgroundColor: colors[type] || colors.info, color: 'white',
        borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 9999, maxWidth: '300px', fontSize: '14px', fontWeight: '500'
      })
      .text(message)
      .appendTo('body');
    
    setTimeout(() => notification.fadeOut(() => notification.remove()), 4000);
  },
  
  isWalletConnected: function() { return this.isConnected; },
  getAccount: function() { return this.account; },
  getUserSession: function() { return this.userSession; }
};

MetaMaskHandler.init();