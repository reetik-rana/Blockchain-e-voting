const TestSimple = artifacts.require("TestSimple");

module.exports = function(deployer) {
  deployer.deploy(TestSimple);
};
