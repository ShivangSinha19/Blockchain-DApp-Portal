pragma solidity ^0.8.12;

contract product {
    address public owner;
    uint256 public sellerCount;
    uint256 public productCount;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    enum ProductStatus { Available, Sold }

    struct seller {
        uint256 sellerId;
        bytes32 sellerName;
        bytes32 sellerBrand;
        bytes32 sellerCode;
        uint256 sellerNum;
        bytes32 sellerManager;
        address sellerAccount; // changed from bytes32
    }
    
    mapping(uint256 => seller) public sellers;

    struct productItem {
        uint256 productId;
        bytes32 productSN;
        bytes32 productName;
        bytes32 productBrand;
        uint256 productPrice;
        ProductStatus status;
        string ipfsHash;
        address manufacturerAddr;
        bytes32 manufacturerCode;
    }

    mapping(uint256 => productItem) public productItems;
    mapping(bytes32 => uint256) public productMap;
    mapping(bytes32 => bool) public productSNUsed;
    mapping(bytes32 => bytes32) public productsManufactured;
    mapping(bytes32 => bytes32) public productsForSale;
    mapping(bytes32 => bytes32) public productsSold;
    mapping(bytes32 => bytes32[]) public productsWithSeller;
    mapping(bytes32 => bytes32[]) public productsWithConsumer;
    mapping(bytes32 => bytes32[]) public sellersWithManufacturer;
    mapping(bytes32 => uint256) public sellerCodeToId;

    event ProductAdded(bytes32 indexed productSN, string ipfsHash, address indexed manufacturer);
    event ProductSold(bytes32 indexed productSN, bytes32 indexed consumerCode);
    event SellerAdded(bytes32 indexed sellerCode, bytes32 indexed manufacturerId);
    event ProductListed(bytes32 indexed productSN, bytes32 indexed sellerCode);
    event ProductStatusChanged(bytes32 indexed productSN, ProductStatus status);

    function addSeller(
        bytes32 _manufacturerId,
        bytes32 _sellerName,
        bytes32 _sellerBrand,
        bytes32 _sellerCode,
        uint256 _sellerNum,
        bytes32 _sellerManager,
        address _sellerAccount
    ) public onlyOwner {
        require(_sellerAccount != address(0), "Invalid seller account");
        require(_sellerCode != bytes32(0), "Invalid seller code");
        require(sellerCodeToId[_sellerCode] == 0 && (sellerCount == 0 || sellers[sellerCodeToId[_sellerCode]].sellerCode != _sellerCode), "Seller code exists");
        sellers[sellerCount] = seller(
            sellerCount,
            _sellerName,
            _sellerBrand,
            _sellerCode,
            _sellerNum,
            _sellerManager,
            _sellerAccount
        );
        sellerCodeToId[_sellerCode] = sellerCount;
        sellersWithManufacturer[_manufacturerId].push(_sellerCode);
        sellerCount++;
        emit SellerAdded(_sellerCode, _manufacturerId);
    }

    function viewSellers()
        public
        view
        returns (
            uint256[] memory,
            bytes32[] memory,
            bytes32[] memory,
            bytes32[] memory,
            uint256[] memory,
            bytes32[] memory,
            address[] memory  // Changed from bytes32[]
        )
    {
        uint256[] memory ids = new uint256[](sellerCount);
        bytes32[] memory snames = new bytes32[](sellerCount);
        bytes32[] memory sbrands = new bytes32[](sellerCount);
        bytes32[] memory scodes = new bytes32[](sellerCount);
        uint256[] memory snums = new uint256[](sellerCount);
        bytes32[] memory smanagers = new bytes32[](sellerCount);
        address[] memory saccounts = new address[](sellerCount);  // Changed

        for (uint256 i = 0; i < sellerCount; i++) {
            seller memory s = sellers[i];
            ids[i] = s.sellerId;
            snames[i] = s.sellerName;
            sbrands[i] = s.sellerBrand;
            scodes[i] = s.sellerCode;
            snums[i] = s.sellerNum;
            smanagers[i] = s.sellerManager;
            saccounts[i] = s.sellerAccount;  // Changed
        }
        
        return (ids, snames, sbrands, scodes, snums, smanagers, saccounts);
    }

    function addProduct(
        bytes32 _manufacturerCode,
        bytes32 _productName,
        bytes32 _productSN,
        bytes32 _productBrand,
        uint256 _productPrice,
        string memory _ipfsHash
    ) public onlyOwner {
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(!productSNUsed[_productSN], "Product serial number already exists");
        require(_productPrice > 0, "Invalid price");
        require(_productSN != bytes32(0), "Invalid serial number");

        productItems[productCount] = productItem(
            productCount,
            _productSN,
            _productName,
            _productBrand,
            _productPrice,
            ProductStatus.Available,
            _ipfsHash,
            msg.sender,
            _manufacturerCode
        );

        productMap[_productSN] = productCount;
        productSNUsed[_productSN] = true;
        productsManufactured[_productSN] = _manufacturerCode;
        productCount++;

        emit ProductAdded(_productSN, _ipfsHash, msg.sender);
    }

    function viewProductItems()
        public
        view
        returns (
            uint256[] memory,
            bytes32[] memory,
            bytes32[] memory,
            bytes32[] memory,
            uint256[] memory,
            bytes32[] memory,
            string[] memory
        )
    {
        uint256[] memory ids = new uint256[](productCount);
        bytes32[] memory sns = new bytes32[](productCount);
        bytes32[] memory names = new bytes32[](productCount);
        bytes32[] memory brands = new bytes32[](productCount);
        uint256[] memory prices = new uint256[](productCount);
        bytes32[] memory statuses = new bytes32[](productCount);
        string[] memory ipfsHashes = new string[](productCount);

        for (uint256 i = 0; i < productCount; i++) {
            productItem memory p = productItems[i];
            ids[i] = p.productId;
            sns[i] = p.productSN;
            names[i] = p.productName;
            brands[i] = p.productBrand;
            prices[i] = p.productPrice;
            statuses[i] = (p.status == ProductStatus.Available) ? bytes32("Available") : bytes32("Sold");
            ipfsHashes[i] = p.ipfsHash;
        }
        
        return (ids, sns, names, brands, prices, statuses, ipfsHashes);
    }

    function getProductIPFS(bytes32 _productSN) public view returns (string memory) {
        require(productSNUsed[_productSN], "Product not found");
        return productItems[productMap[_productSN]].ipfsHash;
    }

    function _requireProductExists(bytes32 _productSN) internal view {
        require(productSNUsed[_productSN], "Product not found");
    }

    function manufacturerSellProduct(bytes32 _productSN, bytes32 _sellerCode) public onlyOwner {
        _requireProductExists(_productSN);
        require(_sellerCode != bytes32(0), "Invalid seller code");
        require(sellerCount > 0 && sellers[sellerCodeToId[_sellerCode]].sellerCode == _sellerCode, "Seller not found");
        uint256 idx = productMap[_productSN];
        productItem storage p = productItems[idx];
        require(p.status == ProductStatus.Available, "Product not available");
        bytes32 current = productsForSale[_productSN];
        if (current == bytes32(0)) {
            productsForSale[_productSN] = _sellerCode;
            bytes32[] storage list = productsWithSeller[_sellerCode];
            bool exists;
            for (uint256 i; i < list.length; i++) {
                if (list[i] == _productSN) { exists = true; break; }
            }
            if (!exists) list.push(_productSN);
            emit ProductListed(_productSN, _sellerCode);
        } else {
            require(current == _sellerCode, "Already listed with different seller");
        }
    }

    // Restrict sale authority (owner-only as interim; replace with seller address check when you store addresses)
    function sellerSellProduct(bytes32 _productSN, bytes32 _consumerCode) public {
        _requireProductExists(_productSN);
        bytes32 listed = productsForSale[_productSN];
        require(listed != bytes32(0), "Not listed");
        uint256 sid = sellerCodeToId[listed];
        require(sellers[sid].sellerAccount == msg.sender || msg.sender == owner, "Not authorized seller");
        uint256 idx = productMap[_productSN];
        productItem storage p = productItems[idx];
        require(p.status == ProductStatus.Available, "Product not available");
        p.status = ProductStatus.Sold;
        require(productsSold[_productSN] == bytes32(0), "Already sold");
        productsSold[_productSN] = _consumerCode;
        bytes32[] storage clist = productsWithConsumer[_consumerCode];
        bool added;
        for (uint256 i; i < clist.length; i++) {
            if (clist[i] == _productSN) { added = true; break; }
        }
        if (!added) clist.push(_productSN);
        emit ProductSold(_productSN, _consumerCode);
        emit ProductStatusChanged(_productSN, ProductStatus.Sold);
    }

    function queryProductsList(bytes32 _sellerCode)
        public
        view
        returns (
            uint256[] memory,
            bytes32[] memory,
            bytes32[] memory,
            bytes32[] memory,
            uint256[] memory,
            bytes32[] memory,
            string[] memory
        )
    {
        bytes32[] memory productSNs = productsWithSeller[_sellerCode];
        uint256 count = productSNs.length;

        uint256[] memory ids = new uint256[](count);
        bytes32[] memory sns = new bytes32[](count);
        bytes32[] memory names = new bytes32[](count);
        bytes32[] memory brands = new bytes32[](count);
        uint256[] memory prices = new uint256[](count);
        bytes32[] memory statuses = new bytes32[](count);
        string[] memory ipfsHashes = new string[](count);

        for (uint256 i = 0; i < count; i++) {
            uint256 idx = productMap[productSNs[i]];
            productItem memory p = productItems[idx];
            
            ids[i] = p.productId;
            sns[i] = p.productSN;
            names[i] = p.productName;
            brands[i] = p.productBrand;
            prices[i] = p.productPrice;
            statuses[i] = (p.status == ProductStatus.Available) ? bytes32("Available") : bytes32("Sold");
            ipfsHashes[i] = p.ipfsHash;
        }
        
        return (ids, sns, names, brands, prices, statuses, ipfsHashes);
    }

    // More efficient seller query
    function querySellersList(bytes32 _manufacturerCode)
        public
        view
        returns (
            uint256[] memory,
            bytes32[] memory,
            bytes32[] memory,
            bytes32[] memory,
            uint256[] memory,
            bytes32[] memory,
            address[] memory  // Changed from bytes32[]
        )
    {
        bytes32[] memory sellerCodes = sellersWithManufacturer[_manufacturerCode];
        uint256 count = sellerCodes.length;
        uint256[] memory ids = new uint256[](count);
        bytes32[] memory snames = new bytes32[](count);
        bytes32[] memory sbrands = new bytes32[](count);
        bytes32[] memory scodes = new bytes32[](count);
        uint256[] memory snums = new uint256[](count);
        bytes32[] memory smanagers = new bytes32[](count);
        address[] memory saccounts = new address[](count);  // Changed
        for (uint256 i; i < count; i++) {
            uint256 sid = sellerCodeToId[sellerCodes[i]];
            seller memory s = sellers[sid];
            ids[i] = s.sellerId;
            snames[i] = s.sellerName;
            sbrands[i] = s.sellerBrand;
            scodes[i] = s.sellerCode;
            snums[i] = s.sellerNum;
            smanagers[i] = s.sellerManager;
            saccounts[i] = s.sellerAccount;  // Changed
        }
        return (ids, snames, sbrands, scodes, snums, smanagers, saccounts);
    }

    function getPurchaseHistory(bytes32 _consumerCode)
        public
        view
        returns (bytes32[] memory, bytes32[] memory, bytes32[] memory)
    {
        bytes32[] memory productSNs = productsWithConsumer[_consumerCode];
        bytes32[] memory sellerCodes = new bytes32[](productSNs.length);
        bytes32[] memory manufacturerCodes = new bytes32[](productSNs.length);
        
        for (uint256 i = 0; i < productSNs.length; i++) {
            sellerCodes[i] = productsForSale[productSNs[i]];
            manufacturerCodes[i] = productsManufactured[productSNs[i]];
        }
        
        return (productSNs, sellerCodes, manufacturerCodes);
    }

    function getProduct(bytes32 _productSN) external view returns (
        uint256 productId,
        bytes32 productSN,
        bytes32 productName,
        bytes32 productBrand,
        uint256 productPrice,
        ProductStatus status,
        string memory ipfsHash,
        address manufacturerAddr,
        bytes32 manufacturerCode
    ) {
        _requireProductExists(_productSN);
        productItem storage p = productItems[productMap[_productSN]];
        return (
            p.productId,
            p.productSN,
            p.productName,
            p.productBrand,
            p.productPrice,
            p.status,
            p.ipfsHash,
            p.manufacturerAddr,
            p.manufacturerCode
        );
    }

    function verifyProduct(bytes32 _productSN, bytes32 _consumerCode) public view returns (bool) {
        _requireProductExists(_productSN);
        return productsSold[_productSN] == _consumerCode;
    }
}