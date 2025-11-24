// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

contract product {
    address public owner;
    uint256 public sellerCount;
    uint256 public productCount;
    uint256 public consumerCount;
    uint256 public manufacturerCount;

    constructor() {
        owner = msg.sender;
        // Register contract owner as first manufacturer
        manufacturers[0] = Manufacturer({
            manufacturerId: 0,
            manufacturerName: "System",
            manufacturerCode: bytes32("SYSTEM"),
            manufacturerBrand: bytes32("Default"),
            manufacturerAddr: msg.sender,
            isActive: true,
            registeredAt: block.timestamp
        });
        manufacturerCodeToId[bytes32("SYSTEM")] = 0;
        manufacturerCount = 1;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized: Owner only");
        _;
    }

    modifier onlyManufacturer(bytes32 _code) {
        uint256 mId = manufacturerCodeToId[_code];
        require(manufacturers[mId].manufacturerAddr == msg.sender, "Not authorized: Manufacturer only");
        require(manufacturers[mId].isActive, "Manufacturer inactive");
        _;
    }

    modifier onlySeller(bytes32 _code) {
        uint256 sId = sellerCodeToId[_code];
        require(sellers[sId].sellerAccount == msg.sender, "Not authorized: Seller only");
        require(sellers[sId].isActive, "Seller inactive");
        _;
    }

    enum ProductStatus { Available, Listed, Sold, Recalled }
    enum UserRole { None, Manufacturer, Seller, Consumer }

    struct Manufacturer {
        uint256 manufacturerId;
        bytes32 manufacturerName;
        bytes32 manufacturerCode;
        bytes32 manufacturerBrand;
        address manufacturerAddr;
        bool isActive;
        uint256 registeredAt;
    }

    struct Seller {
        uint256 sellerId;
        bytes32 sellerName;
        bytes32 sellerBrand;
        bytes32 sellerCode;
        uint256 sellerNum;
        bytes32 sellerManager;
        address sellerAccount;
        bytes32 manufacturerCode;
        bool isActive;
        uint256 registeredAt;
    }

    struct Consumer {
        uint256 consumerId;
        bytes32 consumerCode;
        bytes32 consumerName;
        address consumerAddr;
        uint256 registeredAt;
    }
    
    struct ProductItem {
        uint256 productId;
        bytes32 productSN;
        bytes32 productName;
        bytes32 productBrand;
        bytes32 productCategory;
        uint256 productPrice;
        ProductStatus status;
        string ipfsHash;
        address manufacturerAddr;
        bytes32 manufacturerCode;
        uint256 manufacturedDate;
        uint256 expiryDate;
        bool isAuthentic;
    }

    struct ProductHistory {
        bytes32 productSN;
        bytes32 from;
        bytes32 to;
        UserRole fromRole;
        UserRole toRole;
        uint256 timestamp;
        uint256 price;
    }

    // Mappings
    mapping(uint256 => Manufacturer) public manufacturers;
    mapping(bytes32 => uint256) public manufacturerCodeToId;
    
    mapping(uint256 => Seller) public sellers;
    mapping(bytes32 => uint256) public sellerCodeToId;
    
    mapping(uint256 => Consumer) public consumers;
    mapping(bytes32 => uint256) public consumerCodeToId;
    mapping(address => bytes32) public addressToConsumerCode;
    
    mapping(uint256 => ProductItem) public productItems;
    mapping(bytes32 => uint256) public productMap;
    mapping(bytes32 => bool) public productSNUsed;
    
    mapping(bytes32 => bytes32) public productsManufactured;
    mapping(bytes32 => bytes32) public productsForSale;
    mapping(bytes32 => bytes32) public productsSold;
    
    mapping(bytes32 => bytes32[]) public productsWithSeller;
    mapping(bytes32 => bytes32[]) public productsWithConsumer;
    mapping(bytes32 => bytes32[]) public sellersWithManufacturer;
    mapping(bytes32 => bytes32[]) public productsWithManufacturer;
    
    mapping(bytes32 => ProductHistory[]) public productHistoryMap;
    mapping(bytes32 => uint256) public productVerificationCount;

    // Events
    event ManufacturerRegistered(bytes32 indexed manufacturerCode, address indexed manufacturerAddr);
    event SellerAdded(bytes32 indexed sellerCode, bytes32 indexed manufacturerCode, address indexed sellerAddr);
    event ConsumerRegistered(bytes32 indexed consumerCode, address indexed consumerAddr);
    event ProductAdded(bytes32 indexed productSN, string ipfsHash, bytes32 indexed manufacturerCode);
    event ProductListed(bytes32 indexed productSN, bytes32 indexed sellerCode, uint256 price);
    event ProductSold(bytes32 indexed productSN, bytes32 indexed sellerCode, bytes32 indexed consumerCode);
    event ProductStatusChanged(bytes32 indexed productSN, ProductStatus status);
    event ProductVerified(bytes32 indexed productSN, bytes32 indexed consumerCode, bool isAuthentic);
    event ProductRecalled(bytes32 indexed productSN, string reason);

    // Register Manufacturer
    function registerManufacturer(
        bytes32 _manufacturerName,
        bytes32 _manufacturerCode,
        bytes32 _manufacturerBrand,
        address _manufacturerAddr
    ) public onlyOwner {
        require(_manufacturerAddr != address(0), "Invalid address");
        require(_manufacturerCode != bytes32(0), "Invalid code");
        require(manufacturerCodeToId[_manufacturerCode] == 0 || !manufacturers[manufacturerCodeToId[_manufacturerCode]].isActive, "Manufacturer exists");

        manufacturers[manufacturerCount] = Manufacturer({
            manufacturerId: manufacturerCount,
            manufacturerName: _manufacturerName,
            manufacturerCode: _manufacturerCode,
            manufacturerBrand: _manufacturerBrand,
            manufacturerAddr: _manufacturerAddr,
            isActive: true,
            registeredAt: block.timestamp
        });

        manufacturerCodeToId[_manufacturerCode] = manufacturerCount;
        manufacturerCount++;

        emit ManufacturerRegistered(_manufacturerCode, _manufacturerAddr);
    }

    // Add Seller
    function addSeller(
        bytes32 _manufacturerCode,
        bytes32 _sellerName,
        bytes32 _sellerBrand,
        bytes32 _sellerCode,
        uint256 _sellerNum,
        bytes32 _sellerManager,
        address _sellerAccount
    ) public {
        require(msg.sender == owner || manufacturers[manufacturerCodeToId[_manufacturerCode]].manufacturerAddr == msg.sender, "Not authorized");
        require(_sellerAccount != address(0), "Invalid seller account");
        require(_sellerCode != bytes32(0), "Invalid seller code");
        require(sellerCodeToId[_sellerCode] == 0 || !sellers[sellerCodeToId[_sellerCode]].isActive, "Seller code exists");

        sellers[sellerCount] = Seller({
            sellerId: sellerCount,
            sellerName: _sellerName,
            sellerBrand: _sellerBrand,
            sellerCode: _sellerCode,
            sellerNum: _sellerNum,
            sellerManager: _sellerManager,
            sellerAccount: _sellerAccount,
            manufacturerCode: _manufacturerCode,
            isActive: true,
            registeredAt: block.timestamp
        });

        sellerCodeToId[_sellerCode] = sellerCount;
        sellersWithManufacturer[_manufacturerCode].push(_sellerCode);
        sellerCount++;

        emit SellerAdded(_sellerCode, _manufacturerCode, _sellerAccount);
    }

    // Register Consumer
    function registerConsumer(
        bytes32 _consumerCode,
        bytes32 _consumerName
    ) public {
        require(_consumerCode != bytes32(0), "Invalid consumer code");
        require(consumerCodeToId[_consumerCode] == 0, "Consumer already registered");
        require(addressToConsumerCode[msg.sender] == bytes32(0), "Address already registered");

        consumers[consumerCount] = Consumer({
            consumerId: consumerCount,
            consumerCode: _consumerCode,
            consumerName: _consumerName,
            consumerAddr: msg.sender,
            registeredAt: block.timestamp
        });

        consumerCodeToId[_consumerCode] = consumerCount;
        addressToConsumerCode[msg.sender] = _consumerCode;
        consumerCount++;

        emit ConsumerRegistered(_consumerCode, msg.sender);
    }

    // Add Product with enhanced details
    function addProduct(
        bytes32 _manufacturerCode,
        bytes32 _productName,
        bytes32 _productSN,
        bytes32 _productBrand,
        bytes32 _productCategory,
        uint256 _productPrice,
        string memory _ipfsHash,
        uint256 _expiryDate
    ) public onlyManufacturer(_manufacturerCode) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(!productSNUsed[_productSN], "Product SN already exists");
        require(_productPrice > 0, "Invalid price");
        require(_productSN != bytes32(0), "Invalid serial number");

        productItems[productCount] = ProductItem({
            productId: productCount,
            productSN: _productSN,
            productName: _productName,
            productBrand: _productBrand,
            productCategory: _productCategory,
            productPrice: _productPrice,
            status: ProductStatus.Available,
            ipfsHash: _ipfsHash,
            manufacturerAddr: msg.sender,
            manufacturerCode: _manufacturerCode,
            manufacturedDate: block.timestamp,
            expiryDate: _expiryDate,
            isAuthentic: true
        });

        productMap[_productSN] = productCount;
        productSNUsed[_productSN] = true;
        productsManufactured[_productSN] = _manufacturerCode;
        productsWithManufacturer[_manufacturerCode].push(_productSN);

        // Record history
        productHistoryMap[_productSN].push(ProductHistory({
            productSN: _productSN,
            from: bytes32(0),
            to: _manufacturerCode,
            fromRole: UserRole.None,
            toRole: UserRole.Manufacturer,
            timestamp: block.timestamp,
            price: 0
        }));

        productCount++;
        emit ProductAdded(_productSN, _ipfsHash, _manufacturerCode);
    }

    // Manufacturer sells to Seller
    function manufacturerSellProduct(
        bytes32 _productSN, 
        bytes32 _sellerCode,
        bytes32 _manufacturerCode
    ) public onlyManufacturer(_manufacturerCode) {
        _requireProductExists(_productSN);
        require(sellerCount > 0 && sellers[sellerCodeToId[_sellerCode]].isActive, "Seller not found");
        
        uint256 idx = productMap[_productSN];
        ProductItem storage p = productItems[idx];
        require(p.status == ProductStatus.Available, "Product not available");
        require(p.manufacturerCode == _manufacturerCode, "Not your product");

        p.status = ProductStatus.Listed;
        productsForSale[_productSN] = _sellerCode;
        
        bool exists;
        bytes32[] storage list = productsWithSeller[_sellerCode];
        for (uint256 i; i < list.length; i++) {
            if (list[i] == _productSN) { exists = true; break; }
        }
        if (!exists) list.push(_productSN);

        // Record history
        productHistoryMap[_productSN].push(ProductHistory({
            productSN: _productSN,
            from: _manufacturerCode,
            to: _sellerCode,
            fromRole: UserRole.Manufacturer,
            toRole: UserRole.Seller,
            timestamp: block.timestamp,
            price: p.productPrice
        }));

        emit ProductListed(_productSN, _sellerCode, p.productPrice);
        emit ProductStatusChanged(_productSN, ProductStatus.Listed);
    }

    // Seller sells to Consumer
    function sellerSellProduct(
        bytes32 _productSN, 
        bytes32 _consumerCode,
        bytes32 _sellerCode
    ) public onlySeller(_sellerCode) {
        _requireProductExists(_productSN);
        require(consumerCodeToId[_consumerCode] != 0, "Consumer not registered");
        
        bytes32 listed = productsForSale[_productSN];
        require(listed == _sellerCode, "Not your product");
        
        uint256 idx = productMap[_productSN];
        ProductItem storage p = productItems[idx];
        require(p.status == ProductStatus.Listed, "Product not listed");
        
        p.status = ProductStatus.Sold;
        productsSold[_productSN] = _consumerCode;
        
        bytes32[] storage clist = productsWithConsumer[_consumerCode];
        bool added;
        for (uint256 i; i < clist.length; i++) {
            if (clist[i] == _productSN) { added = true; break; }
        }
        if (!added) clist.push(_productSN);

        // Record history
        productHistoryMap[_productSN].push(ProductHistory({
            productSN: _productSN,
            from: _sellerCode,
            to: _consumerCode,
            fromRole: UserRole.Seller,
            toRole: UserRole.Consumer,
            timestamp: block.timestamp,
            price: p.productPrice
        }));

        emit ProductSold(_productSN, _sellerCode, _consumerCode);
        emit ProductStatusChanged(_productSN, ProductStatus.Sold);
    }

    // Verify Product Authenticity
    function verifyProduct(bytes32 _productSN) public returns (bool) {
        _requireProductExists(_productSN);
        
        uint256 idx = productMap[_productSN];
        ProductItem memory p = productItems[idx];
        
        productVerificationCount[_productSN]++;
        
        bytes32 consumerCode = addressToConsumerCode[msg.sender];
        emit ProductVerified(_productSN, consumerCode, p.isAuthentic);
        
        return p.isAuthentic && p.status != ProductStatus.Recalled;
    }

    // Recall Product
    function recallProduct(bytes32 _productSN, string memory _reason) public onlyOwner {
        _requireProductExists(_productSN);
        uint256 idx = productMap[_productSN];
        productItems[idx].status = ProductStatus.Recalled;
        productItems[idx].isAuthentic = false;
        
        emit ProductRecalled(_productSN, _reason);
        emit ProductStatusChanged(_productSN, ProductStatus.Recalled);
    }

    // Get Product Full Details
    function getProductDetails(bytes32 _productSN) public view returns (
        ProductItem memory product,
        bytes32 currentOwner,
        UserRole ownerRole,
        uint256 verificationCount
    ) {
        _requireProductExists(_productSN);
        uint256 idx = productMap[_productSN];
        product = productItems[idx];
        verificationCount = productVerificationCount[_productSN];
        
        if (product.status == ProductStatus.Sold) {
            currentOwner = productsSold[_productSN];
            ownerRole = UserRole.Consumer;
        } else if (product.status == ProductStatus.Listed) {
            currentOwner = productsForSale[_productSN];
            ownerRole = UserRole.Seller;
        } else {
            currentOwner = product.manufacturerCode;
            ownerRole = UserRole.Manufacturer;
        }
        
        return (product, currentOwner, ownerRole, verificationCount);
    }

    // Get Product History
    function getProductHistory(bytes32 _productSN) public view returns (ProductHistory[] memory) {
        _requireProductExists(_productSN);
        return productHistoryMap[_productSN];
    }

    // Get Consumer Products
    function getConsumerProducts(bytes32 _consumerCode) public view returns (bytes32[] memory) {
        return productsWithConsumer[_consumerCode];
    }

    // Get Seller Products
    function getSellerProducts(bytes32 _sellerCode) public view returns (bytes32[] memory) {
        return productsWithSeller[_sellerCode];
    }

    // Get Manufacturer Products
    function getManufacturerProducts(bytes32 _manufacturerCode) public view returns (bytes32[] memory) {
        return productsWithManufacturer[_manufacturerCode];
    }

    // View All Products
    function viewProductItems() public view returns (
        uint256[] memory ids,
        bytes32[] memory sns,
        bytes32[] memory names,
        bytes32[] memory brands,
        uint256[] memory prices,
        ProductStatus[] memory statuses,
        string[] memory ipfsHashes
    ) {
        ids = new uint256[](productCount);
        sns = new bytes32[](productCount);
        names = new bytes32[](productCount);
        brands = new bytes32[](productCount);
        prices = new uint256[](productCount);
        statuses = new ProductStatus[](productCount);
        ipfsHashes = new string[](productCount);

        for (uint256 i = 0; i < productCount; i++) {
            ProductItem memory p = productItems[i];
            ids[i] = p.productId;
            sns[i] = p.productSN;
            names[i] = p.productName;
            brands[i] = p.productBrand;
            prices[i] = p.productPrice;
            statuses[i] = p.status;
            ipfsHashes[i] = p.ipfsHash;
        }
        
        return (ids, sns, names, brands, prices, statuses, ipfsHashes);
    }

    // View All Sellers
    function viewSellers() public view returns (
        uint256[] memory ids,
        bytes32[] memory names,
        bytes32[] memory brands,
        bytes32[] memory codes,
        address[] memory accounts,
        bool[] memory activeStatuses
    ) {
        ids = new uint256[](sellerCount);
        names = new bytes32[](sellerCount);
        brands = new bytes32[](sellerCount);
        codes = new bytes32[](sellerCount);
        accounts = new address[](sellerCount);
        activeStatuses = new bool[](sellerCount);

        for (uint256 i = 0; i < sellerCount; i++) {
            Seller memory s = sellers[i];
            ids[i] = s.sellerId;
            names[i] = s.sellerName;
            brands[i] = s.sellerBrand;
            codes[i] = s.sellerCode;
            accounts[i] = s.sellerAccount;
            activeStatuses[i] = s.isActive;
        }
        
        return (ids, names, brands, codes, accounts, activeStatuses);
    }

    // Get IPFS Hash
    function getProductIPFS(bytes32 _productSN) public view returns (string memory) {
        _requireProductExists(_productSN);
        return productItems[productMap[_productSN]].ipfsHash;
    }

    // Internal helper
    function _requireProductExists(bytes32 _productSN) internal view {
        require(productSNUsed[_productSN], "Product not found");
    }

    // Deactivate Seller
    function deactivateSeller(bytes32 _sellerCode) public onlyOwner {
        uint256 sid = sellerCodeToId[_sellerCode];
        require(sellers[sid].isActive, "Already inactive");
        sellers[sid].isActive = false;
    }

    // Reactivate Seller
    function reactivateSeller(bytes32 _sellerCode) public onlyOwner {
        uint256 sid = sellerCodeToId[_sellerCode];
        require(!sellers[sid].isActive, "Already active");
        sellers[sid].isActive = true;
    }
}