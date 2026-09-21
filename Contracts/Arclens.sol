// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ArcLensHub
/// @notice Unified unlock, synthetic swap-credit, and recurring-buy hub for Arc (native USDC, 18 decimals).
/// @dev v1: unlock/swap value accrues in the contract. Plan balances are tracked via totalLockedInPlans.
///      Owner may withdraw only surplus (balance - totalLockedInPlans). Pause stops new risk; cancel remains available.
contract ArcLensHub {
    // =============================================================
    //                            ERRORS
    // =============================================================

    error InsufficientPayment(uint256 sent, uint256 required);
    error ZeroValue();
    error ZeroAmount();
    error ZeroAddress();
    error IntervalTooShort();
    error InsufficientDeposit(uint256 provided, uint256 required);
    error PlanNotActive(uint256 planId);
    error TooEarly(uint256 planId, uint256 current, uint256 nextPull);
    error InsufficientBalance(uint256 planId, uint256 balance, uint256 required);
    error NotOwner(uint256 planId, address caller, address owner);
    error TransferFailed(uint256 planId, address recipient, uint256 amount);
    error AlreadyUnlocked();
    error Paused();
    error NotPaused();
    error Unauthorized();
    error NotPendingOwner();
    error InsufficientSurplus(uint256 available, uint256 requested);
    error Reentrancy();
    error InsufficientCredit(address user, uint256 balance, uint256 requested);

    // =============================================================
    //                            EVENTS
    // =============================================================

    event Unlocked(address indexed user, uint256 amount);
    event Swapped(address indexed user, uint256 amount);
    event Redeemed(address indexed user, uint256 amount);
    event PlanCreated(
        uint256 indexed planId,
        address indexed owner,
        address indexed recipient,
        uint256 amountPerPull,
        uint256 interval,
        uint256 balance
    );
    event Deposited(uint256 indexed planId, uint256 amount, uint256 newBalance);
    event Pulled(uint256 indexed planId, address indexed recipient, uint256 amount, uint256 newBalance);
    event PullAccrued(uint256 indexed planId, address indexed recipient, uint256 amount, uint256 newBalance);
    event OwedWithdrawn(address indexed recipient, uint256 amount);
    event Cancelled(uint256 indexed planId, address indexed owner, uint256 refunded);
    event RecipientUpdated(uint256 indexed planId, address indexed newRecipient);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event PausedSet(bool paused);
    event SurplusWithdrawn(address indexed to, uint256 amount);

    // =============================================================
    //                            STATE
    // =============================================================

    uint256 public constant UNLOCK_PRICE = 0.01 ether;

    address public owner;
    address public pendingOwner;
    bool public paused;

    /// @notice Sum of balances reserved for active recurring plans.
    uint256 public totalLockedInPlans;
    uint256 public totalEurcCredit;
    uint256 public totalOwedAmounts;
    mapping(address => uint256) public owedAmounts;

    mapping(address => bool) public unlocked;
    mapping(address => uint256) public eurcCredit;

    uint256 private _status;

    struct Plan {
        address owner;
        address recipient;
        uint256 amountPerPull;
        uint256 interval;
        uint256 nextPull;
        uint256 balance;
        bool active;
    }

    mapping(uint256 => Plan) public plans;
    uint256 public nextPlanId;

    // =============================================================
    //                         MODIFIERS
    // =============================================================

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    modifier nonReentrant() {
        if (_status == 2) revert Reentrancy();
        _status = 2;
        _;
        _status = 1;
    }

    // =============================================================
    //                        CONSTRUCTOR
    // =============================================================

    constructor() {
        owner = msg.sender;
        _status = 1;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // =============================================================
    //                      ADMIN / LIFECYCLE
    // =============================================================

    function version() external pure returns (string memory) {
        return "1.1";
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    function pause() external onlyOwner {
        paused = true;
        emit PausedSet(true);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit PausedSet(false);
    }

    /// @notice Withdraw USDC that is not locked in recurring plans (unlock/swap surplus).
    function withdrawSurplus(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        uint256 surplus = address(this).balance - totalLockedInPlans - totalEurcCredit - totalOwedAmounts;
        if (amount > surplus) revert InsufficientSurplus(surplus, amount);

        emit SurplusWithdrawn(to, amount);

        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed(0, to, amount);
    }

    // =============================================================
    //                          UNLOCK / SWAP
    // =============================================================

    function unlock() external payable whenNotPaused nonReentrant {
        if (unlocked[msg.sender]) revert AlreadyUnlocked();
        if (msg.value < UNLOCK_PRICE) revert InsufficientPayment(msg.value, UNLOCK_PRICE);
        unlocked[msg.sender] = true;
        emit Unlocked(msg.sender, msg.value);
    }

    function swap() external payable whenNotPaused nonReentrant {
        if (msg.value == 0) revert ZeroValue();
        eurcCredit[msg.sender] += msg.value;
        totalEurcCredit += msg.value;
        emit Swapped(msg.sender, msg.value);
    }

    function creditOf(address user) external view returns (uint256) {
        return eurcCredit[user];
    }

    function redeem(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (eurcCredit[msg.sender] < amount) revert InsufficientCredit(msg.sender, eurcCredit[msg.sender], amount);
        eurcCredit[msg.sender] -= amount;
        totalEurcCredit -= amount;
        emit Redeemed(msg.sender, amount);
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed(0, msg.sender, amount);
    }

    // =============================================================
    //                        RECURRING BUY
    // =============================================================

    function createPlan(address recipient, uint256 amountPerPull, uint256 intervalSeconds)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        if (recipient == address(0)) revert ZeroAddress();
        if (uint160(recipient) <= 0xFF) revert ZeroAddress();
        if (amountPerPull == 0) revert ZeroAmount();
        if (intervalSeconds < 60) revert IntervalTooShort();
        if (msg.value < amountPerPull) revert InsufficientDeposit(msg.value, amountPerPull);

        uint256 planId = nextPlanId++;
        plans[planId] = Plan({
            owner: msg.sender,
            recipient: recipient,
            amountPerPull: amountPerPull,
            interval: intervalSeconds,
            nextPull: block.timestamp,
            balance: msg.value,
            active: true
        });

        totalLockedInPlans += msg.value;

        emit PlanCreated(planId, msg.sender, recipient, amountPerPull, intervalSeconds, msg.value);
    }

    function deposit(uint256 planId) external payable whenNotPaused nonReentrant {
        Plan storage plan = plans[planId];
        if (!plan.active) revert PlanNotActive(planId);
        if (msg.value == 0) revert ZeroAmount();

        plan.balance += msg.value;
        totalLockedInPlans += msg.value;

        emit Deposited(planId, msg.value, plan.balance);
    }

    function pull(uint256 planId) external whenNotPaused nonReentrant {
        Plan storage plan = plans[planId];
        if (!plan.active) revert PlanNotActive(planId);
        if (block.timestamp < plan.nextPull) revert TooEarly(planId, block.timestamp, plan.nextPull);
        if (plan.balance < plan.amountPerPull) {
            revert InsufficientBalance(planId, plan.balance, plan.amountPerPull);
        }

        plan.balance -= plan.amountPerPull;
        totalLockedInPlans -= plan.amountPerPull;
        plan.nextPull = block.timestamp + plan.interval;
        owedAmounts[plan.recipient] += plan.amountPerPull;
        totalOwedAmounts += plan.amountPerPull;

        emit PullAccrued(planId, plan.recipient, plan.amountPerPull, plan.balance);
    }

    function withdrawOwed() external nonReentrant whenNotPaused {
        uint256 amount = owedAmounts[msg.sender];
        if (amount == 0) revert ZeroAmount();
        owedAmounts[msg.sender] = 0;
        totalOwedAmounts -= amount;
        emit OwedWithdrawn(msg.sender, amount);
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed(0, msg.sender, amount);
    }

    /// @notice Cancel remains available while paused so users can refund.
    function cancel(uint256 planId) external nonReentrant {
        Plan storage plan = plans[planId];
        if (msg.sender != plan.owner) revert NotOwner(planId, msg.sender, plan.owner);
        if (!plan.active) revert PlanNotActive(planId);

        plan.active = false;
        uint256 refund = plan.balance;
        plan.balance = 0;
        totalLockedInPlans -= refund;

        emit Cancelled(planId, plan.owner, refund);

        (bool ok,) = plan.owner.call{value: refund}("");
        if (!ok) revert TransferFailed(planId, plan.owner, refund);
    }

    function updateRecipient(uint256 planId, address newRecipient) external {
        Plan storage plan = plans[planId];
        if (msg.sender != plan.owner) revert NotOwner(planId, msg.sender, plan.owner);
        if (!plan.active) revert PlanNotActive(planId);
        if (newRecipient == address(0)) revert ZeroAddress();
        if (uint160(newRecipient) <= 0xFF) revert ZeroAddress();

        plan.recipient = newRecipient;
        emit RecipientUpdated(planId, newRecipient);
    }
}
