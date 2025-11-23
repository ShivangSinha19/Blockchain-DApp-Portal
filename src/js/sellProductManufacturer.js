App = {
    web3Provider: null,
    contracts: {},
    initialized: false,

    init: async function() {
        console.log('Initializing App...');
        try {
            await App.initWeb3();
            console.log('Web3 initialized successfully');
            App.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize App:', error);
            return false;
        }
    },

    initWeb3: function() {
        if(window.web3) {
            App.web3Provider=window.web3.currentProvider;
        } else {
            App.web3Provider=new Web3.providers.HttpProvider('http://localhost:7545');
        }

        web3 = new Web3(App.web3Provider);
        return App.initContract();
    },

    initContract: function() {

        $.getJSON('product.json',function(data){
            var productArtifact=data;
            App.contracts.product=TruffleContract(productArtifact);
            App.contracts.product.setProvider(App.web3Provider);
        });

        return App.bindEvents();
    },

    bindEvents: function() {
        $(document).on('click', '.btn-sell', App.sellProduct);
        $(document).on('submit', '#sellProductForm', App.sellProduct);
    },

    sellProduct: async function(event) {
        event.preventDefault();

        try {
            // Show loading state
            const submitBtn = document.querySelector('.btn-sell');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Processing...';
            submitBtn.disabled = true;

            // Get form values
            const productId = document.getElementById('productId').value;
            const sellerCode = document.getElementById('sellerCode').value;

            if (!productId || !sellerCode) {
                throw new Error('Please fill in all fields');
            }

            // Request account access if needed
            if (window.ethereum) {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
            }

            const accounts = await web3.eth.getAccounts();
            const account = accounts[0];

            const productInstance = await App.contracts.product.deployed();
            
            // Call the smart contract function to sell product
            await productInstance.sellProduct(
                productId,
                sellerCode,
                { from: account }
            );

            // Show success message
            const resultDiv = document.getElementById('transactionResult');
            resultDiv.textContent = `Success! Product ${productId} sold to seller ${sellerCode}`;
            resultDiv.className = 'alert alert-success';
            resultDiv.style.display = 'block';

            // Reset form
            document.getElementById('sellProductForm').reset();

        } catch (error) {
            console.error('Error:', error);
            
            // Show error message
            const resultDiv = document.getElementById('transactionResult');
            resultDiv.textContent = `Error: ${error.message || 'Transaction failed'}`;
            resultDiv.className = 'alert alert-danger';
            resultDiv.style.display = 'block';
            
        } finally {
            // Reset button state
            const submitBtn = document.querySelector('.btn-sell');
            submitBtn.textContent = 'Sell Product';
            submitBtn.disabled = false;
        }
    },

    init: async function() {
        // Check if MetaMask is installed
        if (window.ethereum) {
            try {
                // Request account access
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                App.web3Provider = window.ethereum;
                web3 = new Web3(window.ethereum);
            } catch (error) {
                console.error("User denied account access");
            }
        }
        // Legacy dapp browsers
        else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
            web3 = new Web3(App.web3Provider);
        }
        // If no injected web3 instance is detected, fall back to Ganache
        else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
            web3 = new Web3(App.web3Provider);
        }
        
        return App.initContract();
    }
};

            if(error) {
                console.log(error);
            }

            console.log(accounts);
            var account=accounts[0];
            // console.log(account);

            App.contracts.product.deployed().then(function(instance){
                productInstance=instance;
                return productInstance.manufacturerSellProduct(web3.fromAscii(productSN),web3.fromAscii(sellerCode), {from:account});
             }).then(function(result){
                // console.log(result);
                window.location.reload();
                document.getElementById('sellerName').innerHTML='';
                document.getElementById('sellerBrand').innerHTML='';

            }).catch(function(err){
                console.log(err.message);
            });

$(function() {

    $(window).load(function() {
        App.init();
    })
})