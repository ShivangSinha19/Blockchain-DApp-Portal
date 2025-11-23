const Product = artifacts.require("product");

module.exports = function(deployer) {
  deployer.deploy(Product);
};