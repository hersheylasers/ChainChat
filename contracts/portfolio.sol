// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

error Portfolio__ZeroAmount();
error Portfolio__ZeroAddress();
error Portfolio__InsufficientBalance();
error Portfolio__InvalidToken();
error Portfolio__TransferFailed();
error Portfolio__SwapFailed();
error Portfolio__SlippageExceeded();
error Portfolio__StalePriceFeed();
error Portfolio__InvalidPrice();

contract Portfolio is ReentrancyGuard, Ownable {
    ISwapRouter public immutable swapRouter;
    uint24 public constant poolFee = 3000;
    uint256 public constant PRICE_FEED_STALE_THRESHOLD = 1 hours;

    mapping(address => uint256) public ethBalances;
    mapping(address => mapping(address => uint256)) public tokenBalances;
    mapping(address => address) public priceFeeds;
    mapping(address => uint8) private tokenDecimals;
    
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event TokenDeposited(address indexed user, address indexed token, uint256 amount);
    event TokenWithdrawn(address indexed user, address indexed token, uint256 amount);
    event Swapped(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event PriceFeedUpdated(address indexed token, address indexed priceFeed);

    address public constant WETH = 0x4200000000000000000000000000000000000006;
    address public constant USDC = 0x036cBD53842C5426634e7929541eC2018491CF43;
    address public constant cbETH = 0x7c6b91D9Be155A6Db01f749217d76fF02A7227F2;

    constructor(ISwapRouter _swapRouter) Ownable(msg.sender) {
        if(address(_swapRouter) == address(0)) revert Portfolio__ZeroAddress();
        swapRouter = _swapRouter;
        
        _initializePriceFeeds();
        _initializeTokenDecimals();
    }

    function _initializePriceFeeds() private {
        priceFeeds[address(0)] = 0xcD2A119bD1F7DF95d706DE6F2057fDD45A0503E2;
        priceFeeds[WETH] = 0xcD2A119bD1F7DF95d706DE6F2057fDD45A0503E2;
        priceFeeds[USDC] = 0x7e860098F58bBFC8648a4311b374B1D669a2bc6B;
        priceFeeds[cbETH] = 0x036cBD53842C5426634e7929541eC2018491CF43;
    }

    function _initializeTokenDecimals() private {
        tokenDecimals[USDC] = IERC20Metadata(USDC).decimals();
        tokenDecimals[WETH] = IERC20Metadata(WETH).decimals();
        tokenDecimals[cbETH] = IERC20Metadata(cbETH).decimals();
    }

    function updatePriceFeed(address token, address newPriceFeed) external onlyOwner {
        if(token == address(0)) revert Portfolio__ZeroAddress();
        if(newPriceFeed == address(0)) revert Portfolio__ZeroAddress();
        priceFeeds[token] = newPriceFeed;
        emit PriceFeedUpdated(token, newPriceFeed);
    }

    function _depositEth(uint256 amount) internal {
        if(amount == 0) revert Portfolio__ZeroAmount();
        ethBalances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function depositEth() external payable {
        _depositEth(msg.value);
    }

    function withdrawEth(uint256 amount) external nonReentrant {
        if(amount == 0) revert Portfolio__ZeroAmount();
        if(ethBalances[msg.sender] < amount) revert Portfolio__InsufficientBalance();
        
        uint256 balanceBefore = address(this).balance;
        ethBalances[msg.sender] -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if(!success || address(this).balance != balanceBefore - amount) revert Portfolio__TransferFailed();
        
        emit Withdrawn(msg.sender, amount);
    }

    function depositToken(address token, uint256 amount) external nonReentrant {
        if(token == address(0)) revert Portfolio__ZeroAddress();
        if(amount == 0) revert Portfolio__ZeroAmount();
        if(priceFeeds[token] == address(0)) revert Portfolio__InvalidToken();

        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        if(!success || IERC20(token).balanceOf(address(this)) != balanceBefore + amount) {
            revert Portfolio__TransferFailed();
        }
        
        tokenBalances[msg.sender][token] += amount;
        emit TokenDeposited(msg.sender, token, amount);
    }

    function withdrawToken(address token, uint256 amount) external nonReentrant {
        if(token == address(0)) revert Portfolio__ZeroAddress();
        if(amount == 0) revert Portfolio__ZeroAmount();
        if(tokenBalances[msg.sender][token] < amount) revert Portfolio__InsufficientBalance();

        tokenBalances[msg.sender][token] -= amount;
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        
        bool success = IERC20(token).transfer(msg.sender, amount);
        if(!success || IERC20(token).balanceOf(address(this)) != balanceBefore - amount) {
            revert Portfolio__TransferFailed();
        }
        
        emit TokenWithdrawn(msg.sender, token, amount);
    }

    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external nonReentrant returns (uint256 amountOut) {
        if(tokenIn == address(0) || tokenOut == address(0)) revert Portfolio__ZeroAddress();
        if(amountIn == 0) revert Portfolio__ZeroAmount();
        if(tokenBalances[msg.sender][tokenIn] < amountIn) revert Portfolio__InsufficientBalance();
        if(!_isTokenSupported(tokenIn) || !_isTokenSupported(tokenOut)) revert Portfolio__InvalidToken();

        tokenBalances[msg.sender][tokenIn] -= amountIn;
        
        uint256 allowanceBefore = IERC20(tokenIn).allowance(address(this), address(swapRouter));
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: poolFee,
            recipient: address(this),
            deadline: block.timestamp + 15 minutes,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        uint256 balanceBefore = IERC20(tokenOut).balanceOf(address(this));
        amountOut = swapRouter.exactInputSingle(params);
        
        if(IERC20(tokenOut).balanceOf(address(this)) != balanceBefore + amountOut) {
            revert Portfolio__SwapFailed();
        }
        
        if(amountOut < amountOutMinimum) revert Portfolio__SlippageExceeded();
        
        // Reset approval
        if(allowanceBefore == 0) {
            TransferHelper.safeApprove(tokenIn, address(swapRouter), 0);
        }

        tokenBalances[msg.sender][tokenOut] += amountOut;
        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }

    function approveToken(address token, uint256 amount) external onlyOwner {
        if(token == address(0)) revert Portfolio__ZeroAddress();
        if(!_isTokenSupported(token)) revert Portfolio__InvalidToken();
        TransferHelper.safeApprove(token, address(swapRouter), amount);
    }

    function _isTokenSupported(address token) internal view returns (bool) {
        address[] memory supportedTokens = getSupportedTokens();
        for(uint i = 0; i < supportedTokens.length; i++) {
            if(supportedTokens[i] == token) return true;
        }
        return false;
    }

    function getTokenBalance(address user, address token) external view returns (uint256) {
        return tokenBalances[user][token];
    }

    function getLatestPrice(address token) public view returns (int256) {
        address feedAddress = priceFeeds[token];
        if(feedAddress == address(0)) revert Portfolio__InvalidToken();
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feedAddress);
        (uint80 roundId, int256 price, , uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();
        
        if(updatedAt < block.timestamp - PRICE_FEED_STALE_THRESHOLD) revert Portfolio__StalePriceFeed();
        if(price <= 0) revert Portfolio__InvalidPrice();
        if(answeredInRound < roundId) revert Portfolio__StalePriceFeed();
        
        return price;
    }

    function getPortfolioValue(address user) external view returns (uint256 totalValueUsd) {
        int256 ethPrice = getLatestPrice(address(0));
        uint256 ethBalance = ethBalances[user];
        
        if(ethBalance > 0) {
            totalValueUsd = (ethBalance * uint256(ethPrice)) / 1e18;
        }

        address[] memory supportedTokens = getSupportedTokens();
        for(uint i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 balance = tokenBalances[user][token];
            
            if(balance > 0) {
                int256 tokenPrice = getLatestPrice(token);
                uint8 decimals = tokenDecimals[token];
                uint256 tokenValue = (balance * uint256(tokenPrice)) / (10 ** decimals);
                totalValueUsd += tokenValue;
            }
        }
    }

    function getSupportedTokens() public pure returns (address[] memory) {
        address[] memory tokens = new address[](3);
        tokens[0] = WETH;
        tokens[1] = USDC;
        tokens[2] = cbETH;
        return tokens;
    }

    receive() external payable {
        _depositEth(msg.value);
    }
}