const ProductApp = {
  contract: null,
  account: null,
  manufacturerId: null,
  
  init: function() {
    $(this.setup.bind(this));
  },
  
  setup: async function() {
    await this.loadBlockchain();
    await this.loadManufacturerData();
    this.bind();
  },
  
  loadBlockchain: async function() {
    if (typeof web3 === 'undefined') {
      alert('Please install MetaMask');
      return;
    }
    
    try {
      // Load contract
      const productJson = await $.getJSON('product.json');
      this.contract = TruffleContract(productJson);
      this.contract.setProvider(web3.currentProvider);
      
      // Get account
      this.account = MetaMaskHandler.getAccount();
      if (!this.account) {
        alert('Please connect MetaMask');
        return;
      }
      
      console.log('✅ Blockchain loaded. Account:', this.account);
    } catch (error) {
      console.error('❌ Blockchain load error:', error);
    }
  },
  
  loadManufacturerData: async function() {
    const session = MetaMaskHandler.getUserSession();
    if (session && session.userType === 'manufacturer') {
      // In production, fetch from database
      this.manufacturerId = web3.utils.fromAscii('MANU001');
      console.log('Manufacturer ID:', this.manufacturerId);
    }
  },
  
  bind: function() {
    $('#addProductForm').on('submit', this.handleAddProduct.bind(this));
    $('#productImage').on('change', this.handleImagePreview.bind(this));
    this.loadProducts();
  },
  
  handleImagePreview: function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        $('#imagePreview').html(`
          <img src="${e.target.result}" alt="Preview" 
               style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 10px;">
        `);
      };
      reader.readAsDataURL(file);
    }
  },
  
  handleAddProduct: async function(event) {
    event.preventDefault();
    
    // Get form data
    const productName = $('#productName').val().trim();
    const productSN = $('#productSN').val().trim();
    const productBrand = $('#productBrand').val().trim();
    const productPrice = $('#productPrice').val();
    const description = $('#description').val().trim();
    const imageFile = $('#productImage')[0].files[0];
    
    if (!productName || !productSN || !productBrand) {
      alert('Please fill required fields');
      return;
    }
    
    const submitBtn = $('#addProductForm button[type="submit"]');
    const originalText = submitBtn.html();
    submitBtn.html('<i class="fas fa-spinner fa-spin"></i> Processing...').prop('disabled', true);
    
    try {
      // Step 1: Upload image to IPFS
      let imageHash = '';
      if (imageFile) {
        this.showNotification('📤 Uploading image to IPFS...', 'info');
        imageHash = await IPFSService.uploadFile(imageFile);
        console.log('Image Hash:', imageHash);
      }
      
      // Step 2: Create metadata
      const metadata = {
        productName: productName,
        productSN: productSN,
        productBrand: productBrand,
        productPrice: productPrice,
        description: description,
        imageHash: imageHash,
        imageUrl: imageHash ? IPFSService.getIPFSUrl(imageHash) : '',
        manufacturerId: web3.utils.hexToUtf8(this.manufacturerId),
        timestamp: new Date().toISOString(),
        manufacturer: this.account
      };
      
      // Step 3: Upload metadata to IPFS
      this.showNotification('📤 Uploading metadata to IPFS...', 'info');
      const metadataHash = await IPFSService.uploadJSON(metadata);
      console.log('Metadata Hash:', metadataHash);
      
      // Step 4: Add to blockchain
      this.showNotification('⛓️ Adding to blockchain...', 'info');
      await this.addToBlockchain(productName, productSN, productBrand, productPrice, metadataHash);
      
      // Success
      this.showNotification('✅ Product added successfully!', 'success');
      this.resetForm();
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error:', error);
      this.showNotification('❌ Failed: ' + error.message, 'error');
    } finally {
      submitBtn.html(originalText).prop('disabled', false);
    }
  },
  
  addToBlockchain: async function(name, sn, brand, price, ipfsHash) {
    try {
      const instance = await this.contract.deployed();
      
      const tx = await instance.addProduct(
        this.manufacturerId,
        web3.utils.fromAscii(name),
        web3.utils.fromAscii(sn),
        web3.utils.fromAscii(brand),
        web3.utils.toWei(price, 'ether'),
        ipfsHash,
        { from: this.account, gas: 3000000 }
      );
      
      console.log('Transaction:', tx);
      return tx;
    } catch (error) {
      throw new Error('Blockchain transaction failed: ' + error.message);
    }
  },
  
  loadProducts: async function() {
    try {
      const instance = await this.contract.deployed();
      const result = await instance.viewProductItems();
      
      const [ids, sns, names, brands, prices, statuses, ipfsHashes] = result;
      
      let html = '';
      for (let i = 0; i < ids.length; i++) {
        const metadata = ipfsHashes[i] ? await IPFSService.fetchFromIPFS(ipfsHashes[i]) : null;
        
        html += `
          <div class="product-card">
            ${metadata && metadata.imageUrl ? 
              `<img src="${metadata.imageUrl}" alt="${web3.utils.hexToUtf8(names[i])}" class="product-image">` 
              : '<div class="no-image">No Image</div>'}
            <h3>${web3.utils.hexToUtf8(names[i])}</h3>
            <p><strong>SN:</strong> ${web3.utils.hexToUtf8(sns[i])}</p>
            <p><strong>Brand:</strong> ${web3.utils.hexToUtf8(brands[i])}</p>
            <p><strong>Price:</strong> ${web3.utils.fromWei(prices[i].toString(), 'ether')} ETH</p>
            <p><strong>Status:</strong> ${web3.utils.hexToUtf8(statuses[i])}</p>
            ${metadata ? `<p><strong>Description:</strong> ${metadata.description}</p>` : ''}
            <a href="${IPFSService.getIPFSUrl(ipfsHashes[i])}" target="_blank" class="btn-view-ipfs">
              <i class="fas fa-external-link-alt"></i> View on IPFS
            </a>
          </div>
        `;
      }
      
      $('#productsList').html(html || '<p>No products found</p>');
      
    } catch (error) {
      console.error('Load products error:', error);
    }
  },
  
  resetForm: function() {
    $('#addProductForm')[0].reset();
    $('#imagePreview').empty();
  },
  
  showNotification: function(message, type) {
    const colors = { success: '#4ade80', error: '#f87171', info: '#60a5fa', warning: '#fbbf24' };
    const notification = $('<div>')
      .css({
        position: 'fixed', top: '80px', right: '20px', padding: '12px 20px',
        backgroundColor: colors[type], color: 'white', borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 9999,
        maxWidth: '300px', fontSize: '14px', fontWeight: '500'
      })
      .text(message)
      .appendTo('body');
    
    setTimeout(() => notification.fadeOut(() => notification.remove()), 4000);
  }
};

ProductApp.init();

