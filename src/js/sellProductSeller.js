App = {

    web3Provider: null,
    contracts: {},

    init: async function() {
        return await App.initWeb3();
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

        $(document).on('click','.btn-register',App.registerProduct);
    },

    registerProduct: function(event) {
        event.preventDefault();
        if(!MetaMaskHandler.isWalletConnected()){ alert('Connect MetaMask first'); return; }
        const productSN = $('#productSN').val().trim();
        const consumerCode = $('#consumerCode').val().trim();
        if(!productSN || !consumerCode){ alert('Fill all fields'); return; }
        const account = MetaMaskHandler.getAccount();
        App.contracts.product.deployed().then(inst=>{
            return inst.sellerSellProduct(web3.fromAscii(productSN), web3.fromAscii(consumerCode), { from: account });
        }).then(()=>alert('Sold')).catch(e=>{ console.error(e); alert('Failed'); });
    }
};

$(function() {

    $(window).load(function() {
        App.init();
    })
})