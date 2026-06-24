// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  SOULGEIST (SG) — TOKEN + TESORERÍA MICTLÁN
//  Red: Polygon Mainnet
//  Supply: 200,000,000,000 SG
//  Quema inicial: 5% al desplegar
//  Quema por transacción: 2% automática
//  Sitio: https://caminoamictlan.com
// ============================================================

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SoulgeistMictlan is ERC20, ERC20Burnable, Ownable, ReentrancyGuard {

    // ── Supply y porcentajes de quema ─────────────────────────
    uint256 public constant TOTAL_SUPPLY       = 200_000_000_000 * 10**18;
    uint256 public constant PORC_QUEMA_INICIAL = 5;   // 5% quema al desplegar
    uint256 public constant PORC_QUEMA_TX      = 2;   // 2% quema en cada transferencia

    // ── Porcentajes de distribución inicial (suman 100%) ─────
    // 5% quema + 40% bóveda + 15% gas + 20% eventos + 20% reserva = 100%
    uint256 public constant PORC_BOVEDA  = 40;
    uint256 public constant PORC_GAS     = 15;
    uint256 public constant PORC_EVENTOS = 20;
    uint256 public constant PORC_RESERVA = 20;

    // ── Wallets de las 4 bóvedas ──────────────────────────────
    address public walletBovedaUsuarios;
    address public walletGas;
    address public walletEventosMarketing;
    address public walletReservaMaestra;

    // ── Control de distribución y exclusiones de quema ────────
    bool public distribucionRealizada = false;
    mapping(address => bool) public isExcludedFromBurn;

    // ── Metadatos del token ───────────────────────────────────
    string public constant TOKEN_NOMBRE   = "Soulgeist";
    string public constant TOKEN_SIMBOLO  = "SG";
    string public constant TOKEN_LOGO_URI = "https://caminoamictlan.com/img/Soul.png";
    string public constant TOKEN_WEBSITE  = "https://caminoamictlan.com";

    // ── Eventos ───────────────────────────────────────────────
    event DistribucionInicial(
        uint256 quemados,
        uint256 boveda,
        uint256 gas,
        uint256 eventos,
        uint256 reserva
    );
    event TokensDistribuidos(uint256 cantidadTotal, uint256 quemados);
    event WalletActualizada(string boveda, address nuevaWallet);
    event TokensQuemadosEnTx(address indexed from, address indexed to, uint256 quema);
    event ExclusionActualizada(address indexed cuenta, bool excluida);

    // ── Constructor ───────────────────────────────────────────
    constructor(
        address _bovedaUsuarios,
        address _gas,
        address _eventos,
        address _reservaMaestra
    )
        ERC20("Soulgeist", "SG")
        Ownable(msg.sender)
    {
        // Validar que ninguna wallet sea address(0)
        require(_bovedaUsuarios  != address(0), "Boveda: wallet invalida");
        require(_gas             != address(0), "Gas: wallet invalida");
        require(_eventos         != address(0), "Eventos: wallet invalida");
        require(_reservaMaestra  != address(0), "Reserva: wallet invalida");

        walletBovedaUsuarios   = _bovedaUsuarios;
        walletGas              = _gas;
        walletEventosMarketing = _eventos;
        walletReservaMaestra   = _reservaMaestra;

        // Excluir contrato y owner de la quema automática
        isExcludedFromBurn[address(this)] = true;
        isExcludedFromBurn[msg.sender]    = true;

        // Mintear supply total al contrato y distribuir
        _mint(address(this), TOTAL_SUPPLY);
        _distribuirInicial();
    }

    // ── Quema automática del 2% en cada transferencia ─────────
   function _update(address from, address to, uint256 amount) internal override(ERC20) {
        if (isExcludedFromBurn[from] || isExcludedFromBurn[to] || from == address(0) || to == address(0)) {
            super._update(from, to, amount);
            return;
        }

        uint256 quema = (amount * PORC_QUEMA_TX) / 100;
        uint256 montoReal = amount - quema;

        // Primero quemamos
        super._burn(from, quema);
        // Luego hacemos la transferencia del remanente
        super._update(from, to, montoReal);

        emit TokensQuemadosEnTx(from, to, quema);
    }

    // ── Distribución inicial interna ──────────────────────────
    function _distribuirInicial() internal {
        require(!distribucionRealizada, "Ya distribuido");
        distribucionRealizada = true;

        uint256 quemaInicial = (TOTAL_SUPPLY * PORC_QUEMA_INICIAL) / 100;
        uint256 montoBoveda  = (TOTAL_SUPPLY * PORC_BOVEDA)        / 100;
        uint256 montoGas     = (TOTAL_SUPPLY * PORC_GAS)           / 100;
        uint256 montoEventos = (TOTAL_SUPPLY * PORC_EVENTOS)       / 100;
        uint256 montoReserva = (TOTAL_SUPPLY * PORC_RESERVA)       / 100;

        // Quema real del 5% inicial
        _burn(address(this), quemaInicial);

        // Distribuir a las 4 bóvedas (sin activar quema por tx — address(this) excluido)
        _transfer(address(this), walletBovedaUsuarios,   montoBoveda);
        _transfer(address(this), walletGas,              montoGas);
        _transfer(address(this), walletEventosMarketing, montoEventos);
        _transfer(address(this), walletReservaMaestra,   montoReserva);

        emit DistribucionInicial(quemaInicial, montoBoveda, montoGas, montoEventos, montoReserva);
    }

    // ── Redistribución manual con quema (solo owner) ──────────
    function distribuirYQuemarTokens(uint256 _cantidadTotal) external onlyOwner nonReentrant {
        require(_cantidadTotal > 0, "Cantidad invalida");
        require(balanceOf(address(this)) >= _cantidadTotal, "Fondos insuficientes");

        uint256 quema        = (_cantidadTotal * PORC_QUEMA_INICIAL) / 100;
        uint256 montoBoveda  = (_cantidadTotal * PORC_BOVEDA)        / 100;
        uint256 montoGas     = (_cantidadTotal * PORC_GAS)           / 100;
        uint256 montoEventos = (_cantidadTotal * PORC_EVENTOS)       / 100;
        uint256 montoReserva = (_cantidadTotal * PORC_RESERVA)       / 100;

        _burn(address(this), quema);
        _transfer(address(this), walletBovedaUsuarios,   montoBoveda);
        _transfer(address(this), walletGas,              montoGas);
        _transfer(address(this), walletEventosMarketing, montoEventos);
        _transfer(address(this), walletReservaMaestra,   montoReserva);

        emit TokensDistribuidos(_cantidadTotal, quema);
    }

    // ── Actualizar wallets (solo owner) ───────────────────────
    function actualizarWalletBoveda(address _nueva) external onlyOwner {
        require(_nueva != address(0), "Wallet invalida");
        walletBovedaUsuarios = _nueva;
        emit WalletActualizada("BovedaUsuarios", _nueva);
    }

    function actualizarWalletGas(address _nueva) external onlyOwner {
        require(_nueva != address(0), "Wallet invalida");
        walletGas = _nueva;
        emit WalletActualizada("Gas", _nueva);
    }

    function actualizarWalletEventos(address _nueva) external onlyOwner {
        require(_nueva != address(0), "Wallet invalida");
        walletEventosMarketing = _nueva;
        emit WalletActualizada("EventosMarketing", _nueva);
    }

    function actualizarWalletReserva(address _nueva) external onlyOwner {
        require(_nueva != address(0), "Wallet invalida");
        walletReservaMaestra = _nueva;
        emit WalletActualizada("ReservaMaestra", _nueva);
    }

    // ── Gestión de exclusiones de quema (solo owner) ──────────
    // Útil para excluir exchanges, pools de liquidez, etc.
    function setExcludedFromBurn(address _cuenta, bool _excluida) external onlyOwner {
        require(_cuenta != address(0), "Cuenta invalida");
        isExcludedFromBurn[_cuenta] = _excluida;
        emit ExclusionActualizada(_cuenta, _excluida);
    }

    // ── Consultar balances de todas las bóvedas ───────────────
    function consultarBovedas() external view returns (
        uint256 boveda,
        uint256 gas,
        uint256 eventos,
        uint256 reserva,
        uint256 enContrato,
        uint256 supplyActual
    ) {
        return (
            balanceOf(walletBovedaUsuarios),
            balanceOf(walletGas),
            balanceOf(walletEventosMarketing),
            balanceOf(walletReservaMaestra),
            balanceOf(address(this)),
            totalSupply()
        );
    }

    // ── Rescate de emergencia (solo owner) ────────────────────
    // Por si quedan tokens atrapados en el contrato
    function rescatarTokens(uint256 _cantidad) external onlyOwner nonReentrant {
        require(_cantidad > 0, "Cantidad invalida");
        require(balanceOf(address(this)) >= _cantidad, "Sin fondos");
        _transfer(address(this), walletReservaMaestra, _cantidad);
    }
}