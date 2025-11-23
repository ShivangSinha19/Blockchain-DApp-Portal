App = {
    web3Provider: null,
    contracts: {},
    ipfsService: new IPFSService(),

    init: async function() {
        return await App.initWeb3();
    },

    initWeb3: function() {
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                window.ethereum.enable();
            } catch (error) {
                console.error("User denied account access");
            }
        } else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
        } else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }
        web3 = new Web3(App.web3Provider);
        return App.initContract();
    },

    initContract: function() {
        $.getJSON('product.json', function(data) {
            var productArtifact = data;
            App.contracts.product = TruffleContract(productArtifact);
            App.contracts.product.setProvider(App.web3Provider);
        });
        return App.bindEvents();
    },

    bindEvents: function() {
        $(document).on('click', '.btn-register', App.registerProductWithImage);
    },

    registerProductWithImage: async function(event) {
        event.preventDefault();

        const productImage = document.getElementById('productImage').files[0];
        const productSN = document.getElementById('productSN').value;
        const productName = document.getElementById('productName').value;
        const productDescription = document.getElementById('productDescription').value;
        const manufacturerId = document.getElementById('manufacturerId').value;

        if (!productImage) {
            alert('Please upload a product image');
            return;
        }

        try {
            // Show loading state
            const btn = event.target;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading to IPFS...';
            btn.disabled = true;

            // Upload image to IPFS
            const imageHash = await App.ipfsService.uploadFile(productImage);

            // Create metadata
            const metadata = {
                name: productName,
                description: productDescription,
                image: App.ipfsService.getFileUrl(imageHash),
                attributes: [
                    { trait_type: "Serial Number", value: productSN },
                    { trait_type: "Manufacturer ID", value: manufacturerId }
                ]
            };

            // Upload metadata to IPFS
            const metadataHash = await App.ipfsService.uploadMetadata(metadata);

            // Update UI
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering on Blockchain...';

            // Register on blockchain with IPFS hash
            web3.eth.getAccounts(async function(error, accounts) {
                if (error) {
                    console.error(error);
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    return;
                }

                const account = accounts[0];
                try {
                    const productInstance = await App.contracts.product.deployed();
                    await productInstance.addProduct(
                        web3.utils.fromAscii(productSN),
                        web3.utils.fromAscii(productName),
                        metadataHash, // IPFS hash stored in contract
                        { from: account }
                    );

                    alert('Product registered successfully! IPFS Hash: ' + metadataHash);
                    window.location.reload();
                } catch (err) {
                    console.error(err);
                    alert('Error registering product: ' + err.message);
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            });
        } catch (error) {
            console.error('Registration error:', error);
            alert('Error: ' + error.message);
            event.target.innerHTML = originalText;
            event.target.disabled = false;
        }
    }
};

const ProductManager = (() => {
  let contract;
  let account;
  let ipfsService;

  async function init() {
    try {
      ipfsService = new IPFSService({ useProxy: true });
      await loadBlockchain();
      bindEvents();
      console.log('✅ Product Manager initialized');
    } catch (error) {
      console.error('Initialization failed:', error);
      showNotification('Failed to initialize: ' + error.message, 'error');
    }
  }

  async function loadBlockchain() {
    if (typeof web3 === 'undefined') {
      throw new Error('MetaMask not detected. Please install MetaMask.');
    }

    try {
      // Request account access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      account = accounts[0];

      // Load contract
      const productJson = await $.getJSON('product.json');
      contract = TruffleContract(productJson);
      contract.setProvider(web3.currentProvider);

      console.log('Blockchain loaded. Account:', account);
    } catch (error) {
      throw new Error('Failed to load blockchain: ' + error.message);
    }
  }

  function bindEvents() {
    $('#addProductForm').on('submit', handleSubmit);
    $('#productImage').on('change', handleImagePreview);
  }

  function handleImagePreview(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      $('#imagePreview').html(`
        <img src="${e.target.result}" alt="Preview" 
             style="max-width: 200px; max-height: 200px; border-radius: 8px; margin-top: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      `);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const formData = {
      productName: $('#productName').val().trim(),
      productSN: $('#productSN').val().trim(),
      productBrand: $('#productBrand').val().trim(),
      productPrice: $('#productPrice').val().trim(),
      description: $('#description').val().trim(),
      imageFile: $('#productImage')[0].files[0]
    };

    // Validation
    if (!formData.productName || !formData.productSN || !formData.productBrand || !formData.productPrice) {
      showNotification('Please fill all required fields', 'error');
      return;
    }

    if (parseFloat(formData.productPrice) <= 0) {
      showNotification('Price must be greater than 0', 'error');
      return;
    }

    const submitBtn = $('#addProductForm button[type="submit"]');
    const originalText = submitBtn.html();
    submitBtn.html('<i class="fas fa-spinner fa-spin me-2"></i>Processing...').prop('disabled', true);

    try {
      // Step 1: Upload image to IPFS
      let imageResult = null;
      if (formData.imageFile) {
        showNotification('📤 Uploading image to IPFS...', 'info');
        imageResult = await ipfsService.uploadFile(formData.imageFile);
        console.log('Image uploaded:', imageResult);
      }

      // Step 2: Create and upload metadata
      const metadata = {
        name: formData.productName,
        serialNumber: formData.productSN,
        brand: formData.productBrand,
        price: formData.productPrice,
        description: formData.description,
        imageCid: imageResult ? imageResult.cid : null,
        imageUrl: imageResult ? imageResult.url : null,
        timestamp: new Date().toISOString(),
        manufacturer: account
      };

      showNotification('📤 Uploading metadata to IPFS...', 'info');
      const metadataResult = await ipfsService.uploadMetadata(metadata);
      console.log('Metadata uploaded:', metadataResult);

      // Step 3: Add to blockchain
      showNotification('⛓️ Adding product to blockchain...', 'info');
      const instance = await contract.deployed();

      // Get manufacturer code from session or use default
      const manufacturerCode = sessionStorage.getItem('manufacturerCode') || 'MANU001';

      const tx = await instance.addProduct(
        web3.utils.fromAscii(manufacturerCode),
        web3.utils.fromAscii(formData.productName),
        web3.utils.fromAscii(formData.productSN),
        web3.utils.fromAscii(formData.productBrand),
        web3.utils.toWei(formData.productPrice, 'ether'),
        metadataResult.cid,
        { from: account, gas: 3000000 }
      );

      console.log('Transaction:', tx);
      showNotification('✅ Product added successfully!', 'success');

      // Generate QR Code
      if (typeof generateQR === 'function') {
        generateQR(formData.productSN);
      }

      // Reset form
      $('#addProductForm')[0].reset();
      $('#imagePreview').empty();

      // Redirect after longer delay to allow QR viewing
      setTimeout(() => {
        const userConfirm = confirm('Product added successfully! Do you want to return to dashboard?');
        if (userConfirm) {
          window.location.href = 'manufacturer.html';
        }
      }, 3000);

    } catch (error) {
      console.error('Error adding product:', error);
      let errorMsg = error.message;
      
      // Handle common errors
      if (errorMsg.includes('Product serial number already exists')) {
        errorMsg = 'This serial number already exists. Please use a unique serial number.';
      } else if (errorMsg.includes('Not authorized')) {
        errorMsg = 'You are not authorized to add products.';
      } else if (errorMsg.includes('IPFS upload failed')) {
        errorMsg = 'Failed to upload to IPFS. Please check your internet connection.';
      }
      
      showNotification('❌ Failed to add product: ' + errorMsg, 'error');
    } finally {
      submitBtn.html(originalText).prop('disabled', false);
    }
  }

  function showNotification(message, type) {
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6',
      warning: '#f59e0b'
    };

    const notification = $('<div>')
      .css({
        position: 'fixed',
        top: '80px',
        right: '20px',
        padding: '12px 20px',
        backgroundColor: colors[type] || colors.info,
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 9999,
        maxWidth: '350px',
        fontSize: '14px',
        fontWeight: '500',
        animation: 'slideIn 0.3s ease-out'
      })
      .text(message)
      .appendTo('body');

    setTimeout(() => {
      notification.fadeOut(400, () => notification.remove());
    }, 4000);
  }

  return { init };
})();

$(function() {
    $(window).load(function() {
        App.init();
        ProductManager.init();
    });
});


<form id="addProductForm" class="product-form">
    <div class="form-grid">
        <div class="form-group">
            <label for="productName">
                <i class="fas fa-box me-2"></i>
                Product Name *
            </label>
            <input class="form-control" id="productName" name="productName" type="text" placeholder="Enter product name" required />
        </div>
        
        <div class="form-group">
            <label for="productSN">
                <i class="fas fa-tag me-2"></i>
                Serial Number *
            </label>
            <input class="form-control" id="productSN" name="productSN" type="text" placeholder="Enter unique serial number" required />
        </div>
        
        <div class="form-group">
            <label for="productBrand">
                <i class="fas fa-industry me-2"></i>
                Brand *
            </label>
            <input class="form-control" id="productBrand" name="productBrand" type="text" placeholder="Enter brand name" required />
        </div>
        
        <div class="form-group">
            <label for="manufacturingDate">
                <i class="fas fa-calendar-alt me-2"></i>
                Manufacturing Date
            </label>
            <input class="form-control" id="manufacturingDate" name="manufacturingDate" type="date" />
        </div>
        
        <div class="form-group">
            <label for="expiryDate">
                <i class="fas fa-calendar-times me-2"></i>
                Expiry Date
            </label>
            <input class="form-control" id="expiryDate" name="expiryDate" type="date" />
        </div>
        
        <div class="form-group">
            <label for="category">
                <i class="fas fa-list me-2"></i>
                Category
            </label>
            <select class="form-control" id="category" name="category">
                <option value="">Select Category</option>
                <option value="electronics">Electronics</option>
                <option value="pharmaceutical">Pharmaceutical</option>
                <option value="food">Food & Beverage</option>
                <option value="cosmetics">Cosmetics</option>
                <option value="other">Other</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="productPrice">
                <i class="fas fa-dollar-sign me-2"></i>
                Price (ETH) *
            </label>
            <input class="form-control" id="productPrice" name="productPrice" type="number" step="0.001" min="0.001" placeholder="0.001" required />
        </div>
        
        <div class="form-group">
            <label for="description">
                <i class="fas fa-info-circle me-2"></i>
                Description
            </label>
            <textarea class="form-control" id="description" name="description" rows="4" placeholder="Enter product description"></textarea>
        </div>
        
        <div class="form-group">
            <label for="productImage">
                <i class="fas fa-image me-2"></i>
                Product Image (PNG, JPEG, WEBP - Max 5MB)
            </label>
            <input class="form-control" id="productImage" name="productImage" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" />
            <div id="imagePreview" style="margin-top: 10px;"></div>
        </div>
    </div>
    
    <div class="text-center">
        <button type="submit" class="btn-modern">
            <i class="fas fa-plus"></i>
            Add Product
        </button>
    </div>
</form>