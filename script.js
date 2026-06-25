// ==================================================================
// CONFIGURACIÓN DE BLOCKCHAIN (CONSTANTES FIJAS)
// ==================================================================
const SOULGEIST_ABI = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_bovedaUsuarios",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_gas",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_eventos",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_reservaMaestra",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "allowance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "needed",
				"type": "uint256"
			}
		],
		"name": "ERC20InsufficientAllowance",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "balance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "needed",
				"type": "uint256"
			}
		],
		"name": "ERC20InsufficientBalance",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "approver",
				"type": "address"
			}
		],
		"name": "ERC20InvalidApprover",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "receiver",
				"type": "address"
			}
		],
		"name": "ERC20InvalidReceiver",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			}
		],
		"name": "ERC20InvalidSender",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			}
		],
		"name": "ERC20InvalidSpender",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "OwnableInvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "OwnableUnauthorizedAccount",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ReentrancyGuardReentrantCall",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "Approval",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "quemados",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "boveda",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "gas",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "eventos",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "reserva",
				"type": "uint256"
			}
		],
		"name": "DistribucionInicial",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "cuenta",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "excluida",
				"type": "bool"
			}
		],
		"name": "ExclusionActualizada",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "cantidadTotal",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "quemados",
				"type": "uint256"
			}
		],
		"name": "TokensDistribuidos",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "quema",
				"type": "uint256"
			}
		],
		"name": "TokensQuemadosEnTx",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "Transfer",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "string",
				"name": "boveda",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "nuevaWallet",
				"type": "address"
			}
		],
		"name": "WalletActualizada",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "PORC_BOVEDA",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "PORC_EVENTOS",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "PORC_GAS",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "PORC_QUEMA_INICIAL",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "PORC_QUEMA_TX",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "PORC_RESERVA",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "TOKEN_LOGO_URI",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "TOKEN_NOMBRE",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "TOKEN_SIMBOLO",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "TOKEN_WEBSITE",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "TOTAL_SUPPLY",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_nueva",
				"type": "address"
			}
		],
		"name": "actualizarWalletBoveda",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_nueva",
				"type": "address"
			}
		],
		"name": "actualizarWalletEventos",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_nueva",
				"type": "address"
			}
		],
		"name": "actualizarWalletGas",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_nueva",
				"type": "address"
			}
		],
		"name": "actualizarWalletReserva",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			}
		],
		"name": "allowance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "approve",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "balanceOf",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "burn",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "burnFrom",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "consultarBovedas",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "boveda",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "gas",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "eventos",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "reserva",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "enContrato",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "supplyActual",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "decimals",
		"outputs": [
			{
				"internalType": "uint8",
				"name": "",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "distribucionRealizada",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_cantidadTotal",
				"type": "uint256"
			}
		],
		"name": "distribuirYQuemarTokens",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "isExcludedFromBurn",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "name",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_cantidad",
				"type": "uint256"
			}
		],
		"name": "rescatarTokens",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_cuenta",
				"type": "address"
			},
			{
				"internalType": "bool",
				"name": "_excluida",
				"type": "bool"
			}
		],
		"name": "setExcludedFromBurn",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "symbol",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalSupply",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "transfer",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "transferFrom",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "walletBovedaUsuarios",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "walletEventosMarketing",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "walletGas",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "walletReservaMaestra",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]

const DIRECCION_CONTRATO = "0x51Fb9B6b0e008eFC867492D2930D959879A5bCfB";

// ==================================================================
// VARIABLES GLOBALES DEL INFRAMUNDO
// ==================================================================
let retiroEnProceso = false;
let balanceUsuarioSG = parseFloat(localStorage.getItem('soulgeist_balance')) || 0; 
let tumbaSeleccionada = null; 
let ritualActivo = false; 
let esModoRegistro = false; 
window.estaCargandoAnuncio = false;

// UNIFICACIÓN DEL DOMINIO ABSOLUTO DE VERCEL
const DOMINIO_VERCEL = 'https://caminoamictlan.com';

if (typeof window.tumbasConSaldo === 'undefined') {
    window.tumbasConSaldo = {};
}
const CONFIG_ORACULO = {
    deidadPorDefecto: 'gemini',
    estiloRespuesta: `
        Eres el Oráculo del Mictlán. Habla con tono oscuro, poético y enigmático. 
        Usa referencias al inframundo azteca, almas, calaveras y destino.
        Cuando hablen de dinero, Soulgeist, videos o ganancias, sé directo primero y luego envuelve la respuesta en misterio.
    `
};

// CONFIGURACIÓN DE GOOGLE (Asegúrate de cambiar esto en producción)
const GOOGLE_CLIENT_ID = "25093626964-mep6ihpq1gamn8hm59q2cf15rm8gd0ao.apps.googleusercontent.com"; 

// ==================================================================
// FASE 1 -> FASE 2: APERTURA DEL GRIMORIO ABIERTO (CORREGIDO)
// ==================================================================
window.entrarAlMictlan = function() {
    console.log("Intentando entrar al Mictlán...") // Para depurar en consola
    
    const portal = document.getElementById('escena-portal');
    const modalContrato = document.getElementById('modal-contrato');

    if (modalContrato) {
        modalContrato.style.display = 'flex'; // Usamos flex para centrar
        modalContrato.style.opacity = '1';
        modalContrato.style.visibility = 'visible';
    }

    if (portal) {
        portal.style.opacity = '0';
        setTimeout(() => { portal.style.display = 'none'; }, 1000);
    }
}

function inicializarBotonGoogle() {
    const contenedorGoogle = document.getElementById("google-btn-container");
    if (!contenedorGoogle) return;

    // Si Google aún no despierta, esperamos 100ms y reintentamos
    if (typeof google === 'undefined') {
        setTimeout(inicializarBotonGoogle, 100);
        return;
    }

    // Una vez que existe, ejecutamos el ritual normal
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: manejarLoginGoogle
    });
    
    google.accounts.id.renderButton(
        contenedorGoogle,
        { theme: "dark", size: "large", type: "standard", text: "signin_with", width: "240" }
    );
}

function cambiarModoAuth() {
    esModoRegistro = !esModoRegistro; 
    const tagline = document.getElementById('auth-tagline'); 
    const btnAuth = document.getElementById('btn-auth'); 
    const toggleText = document.getElementById('toggle-auth-text'); 

    if (esModoRegistro) {
        tagline.innerText = "REGISTRO DE ALMAS"; 
        btnAuth.innerText = "SELLAR NUEVA IDENTIDAD"; 
        toggleText.innerText = "¿Ya tienes un rastro registrado? Accede aquí"; 
    } else {
        tagline.innerText = "REGISTRO DE ALMAS"; 
        btnAuth.innerText = "ACCEDER AL CEMENTERIO"; 
        toggleText.innerText = "¿Eres un nuevo espíritu? Sella tu identidad aquí"; 
    }
}

// ==================================================================
// FASE 2 -> FASE 3: VALIDACIÓN Y ENTRADA AL CAMPO SANTO (CONECTADO A API)
// ==================================================================
async function manejarAuth() {
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const btnAuth = document.getElementById('btn-auth');

    if (!emailEl || !passwordEl || !btnAuth) return;

    const email = emailEl.value.trim();
    const password = passwordEl.value.trim();

    if (!email || !password) {
        lanzarAlertaMictlan("Debes completar ambos campos.", "CAMPOS INCOMPLETOS");
        return;
    }

    const accion = esModoRegistro ? 'registro' : 'login';

    if (accion === 'registro') {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
        if (!regex.test(password)) {
            lanzarAlertaMictlan("La contraseña debe tener 8+ caracteres, mayúscula, minúscula y símbolo.", "LLAVE DÉBIL");
            return;
        }
    }

    const textoOriginal = btnAuth.innerText;
    btnAuth.innerText = "PROCESANDO...";
    btnAuth.disabled = true;

    try {
        const respuesta = await fetch('/api/pacto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, accion })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok || resultado.success === false) {
            lanzarAlertaMictlan(resultado.error || "Pacto rechazado.", "RITUAL RECHAZADO");
            return;
        }

        if (accion === 'registro') {
            lanzarAlertaMictlan("¡Pacto sellado! Ahora inicia sesión.", "ALMA REGISTRADA");
            cambiarModoAuth();   // Cambia automáticamente a login
        } else {
            // Login exitoso
            window.userWallet = resultado.usuario.email;
            localStorage.setItem('soulgeist_user_email', resultado.usuario.email);
            localStorage.setItem('usuario_email', resultado.usuario.email);

            lanzarAlertaMictlan("Bienvenido al Mictlán.", "ACCESO CONCEDIDO");
            await sincronizarBalanceConRedis();
            entrarAlCampoSanto({ balanceSG: balanceUsuarioSG });
        }
    } catch (error) {
        console.error("Error en manejarAuth:", error);
        lanzarAlertaMictlan("No se pudo conectar con el inframundo.", "FALLO DE CONEXIÓN");
    } finally {
        btnAuth.innerText = textoOriginal;
        btnAuth.disabled = false;
    }
}

async function manejarLoginGoogle(response) {
    try {
        // Reemplaza 'tu-dominio-en-vercel.vercel.app' por tu dirección real de Vercel
        const DOMINIO_VERCEL = 'https://www.caminoamictlan.com/'; 

        const res = await fetch(`${DOMINIO_VERCEL}/api/auth-google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });

        const datos = await res.json();

        if (res.ok && datos.success) {
            window.userWallet = datos.perfil.email;
            localStorage.setItem('soulgeist_user_email', datos.perfil.email);

            await sincronizarBalanceConRedis();
            entrarAlCampoSanto({ balanceSG: balanceUsuarioSG });
        } else {
            lanzarAlertaMictlan(datos.error || "Fallo al autenticar con Google.", "ERROR GOOGLE");
        }
    } catch (error) {
        console.error("Error Google:", error);
        lanzarAlertaMictlan("Fallo en la autenticación.", "FALLO DE RED");
    }
}
function entrarAlCampoSanto(perfil = {}) {
    const modalContrato = document.getElementById('modal-contrato');
    const cementerio = document.getElementById('campo-santo');
    const candelabro = document.querySelector('.candelabro-central');

    if (modalContrato) modalContrato.style.display = 'none';
    if (cementerio) cementerio.style.display = 'block';

    if (candelabro) {
        candelabro.style.display = 'block';
        setTimeout(() => candelabro.style.opacity = '1', 50);
    }

    // Carga fuerte
    if (perfil && perfil.balanceSG !== undefined) {
        balanceUsuarioSG = parseFloat(perfil.balanceSG) || 0;
    }

    localStorage.setItem('soulgeist_balance', balanceUsuarioSG);
    console.log("=== BALANCE FINAL AL ENTRAR ===", balanceUsuarioSG);

    actualizarBalanceSoulgeist(balanceUsuarioSG);
cargarSaldosCriptas();
    generarCementerio();
}

// ==================================================================
// PASO 1: CLICK EN SOULGEIST -> MODAL INFORMATIVO CON SOLO BOTÓN "CERRAR"
// ==================================================================
function dispararInicioRitualGlobal() {
    const modal = document.getElementById('modal-ritual');
    const info = document.getElementById('info-ritual');
    const titulo = document.getElementById('titulo-ritual');

    if (!modal) return;

    // 1. Mostrar el modal
    modal.style.display = 'block';
    if (titulo) titulo.innerText = "CANALIZACIÓN DE SOULGEIST";
    
    // 2. Inyectar el selector de cantidad
    if (info) {
        info.innerHTML = `
            <div style="text-align: center; margin: 20px 0;">
                <p style="color: #aaa;">Poder disponible en Soulgeist:</p>
                <h2 style="color: #00ffff;">${balanceUsuarioSG.toFixed(2)} SG</h2>
                <input type="number" id="input-cantidad-ritual" 
                       placeholder="Cantidad a enviar" 
                       style="width: 80%; padding: 10px; background: #111; border: 1px solid #00ffff; color: #fff; text-align: center;">
            </div>
        `;
    }

    // 3. Botones (asegurando que no se dupliquen eventos)
    const botones = document.querySelector('.botones-exchange');
    if (botones) {
        botones.innerHTML = `
            <button id="btn-ritual-aceptar" style="background: #00ffff; color: #000; padding: 10px 20px;">CONFIRMAR</button>
            <button onclick="cerrarRitual()" style="padding: 10px 20px;">CANCELAR</button>
        `;

        document.getElementById('btn-ritual-aceptar').onclick = () => {
            const cantidad = parseFloat(document.getElementById('input-cantidad-ritual').value);
            
            if (isNaN(cantidad) || cantidad <= 0 || cantidad > balanceUsuarioSG) {
                lanzarAlertaMictlan("Cantidad no válida o insuficiente.", "ERROR");
                return;
            }

            // GUARDAMOS LA CANTIDAD EN UNA VARIABLE GLOBAL
            window.cantidadParaRitual = cantidad;
            
            // Activamos el estado de ritual para que las tumbas respondan
            ritualActivo = true;
            
            lanzarAlertaMictlan("Ahora selecciona una tumba para canalizar.", "RITUAL LISTO");
            cerrarRitual(); 
        };
    }
}

// ==================================================================
// PASO 2 Y 3: CLICK EN CRIPTA -> ANIMACIÓN EN VIVO -> MODAL RITUAL INICIADO
// ==================================================================
// Tasas de respaldo mientras carga la API
window.TASAS_ACTUALES = {
    "Ethereum": { tasa: 0.00000045 },
    "Litecoin": { tasa: 0.0012 },
    "Pepe": { tasa: 15000 },
    "MATIC/POL": { tasa: 0.015 },
    "BNB": { tasa: 0.0018 },
    "USDT": { tasa: 0.25 },
    "Bitcoin": { tasa: 0.000002 }
};

// Actualiza las tasas desde el Oráculo (QuickSwap) cada 60 segundos
async function actualizarTasasEnVivo() {
    try {
        const res = await fetch('/api/tasas');
        if (!res.ok) throw new Error('Respuesta no ok');
        const tasasNuevas = await res.json();
        if (tasasNuevas && !tasasNuevas.error) {
            window.TASAS_ACTUALES = tasasNuevas;
            console.log('✅ Tasas actualizadas desde QuickSwap:', tasasNuevas);
        }
    } catch (e) {
        console.warn('⚠️ Usando tasas de respaldo:', e.message);
    }
}

// Llamar al cargar y luego cada 60 segundos
actualizarTasasEnVivo();
setInterval(actualizarTasasEnVivo, 60000);

function generarCementerio() {
    const contenedor = document.getElementById('contenedor-criptos');
    if (!contenedor) return;
    
    contenedor.innerHTML = '';

    // === CORRECCIÓN VISUAL DE NUEVO ESPÍRITU (BUG 1 SOLUCIONADO) ===
    const criptasExistentes = localStorage.getItem('soulgeist_criptas');
    
    if (!criptasExistentes) {
        // Solo si nunca ha guardado criptas (usuario nuevo), inicializamos en cero limpio
        window.tumbasConSaldo = {
            "Soulgeist": 0, "Ethereum": 0, "Litecoin": 0, "Pepe": 0,
            "Solana": 0, "Dogecoin": 0, "USDT": 0, "Bitcoin": 0
        };
        localStorage.setItem('soulgeist_criptas', JSON.stringify(window.tumbasConSaldo));
    } else if (!window.tumbasConSaldo || Object.keys(window.tumbasConSaldo).length === 0) {
        // Si el usuario refrescó la página, restauramos sus criptas reales guardadas
        window.tumbasConSaldo = JSON.parse(criptasExistentes);
    }

    const configuracion = [
    { nombre: "Soulgeist", sim: "SG", color: "#00ffff", top: "48%", left: "78.5%", especial: true },
    { nombre: "Ethereum", sim: "♦", color: "#627eea", top: "72%", left: "7.5%" },
    { nombre: "Litecoin", sim: "Ł", color: "#00d4ff", top: "75%", left: "26.5%" },
    { nombre: "Pepe", sim: "🐸", color: "#45ca5d", top: "68%", left: "38%" },
    { nombre: "MATIC/POL", sim: "M", color: "#8247E5", top: "64%", left: "46%" },
    { nombre: "BNB", sim: "B", color: "#F0B90B", top: "61%", left: "68%" },
    { nombre: "USDT", sim: "₮", color: "#26a17b", top: "73%", left: "77%" },
    { nombre: "Bitcoin", sim: "₿", color: "#f7931a", top: "72%", left: "90%" }
];

    configuracion.forEach(pos => {
	
	const infoTasa = window.TASAS_ACTUALES[pos.nombre] || { tasa: 0, minimoNativo: 0 }; 
        const esPuntoRojo = (pos.nombre === "Bitcoin" || pos.nombre === "Litecoin");
        const saldoGuardado = (window.tumbasConSaldo && window.tumbasConSaldo[pos.nombre]) ? window.tumbasConSaldo[pos.nombre] : 0;
        
        // 2. Ahora sí podemos usar esPuntoRojo y saldoGuardado sin error
        const textoBalance = saldoGuardado.toFixed(6);
        const visibilidadOpacidad = (saldoGuardado > 0 || esPuntoRojo) ? "1" : "0";

        // 3. Creamos el div UNA sola vez
        const div = document.createElement('div');
        div.className = pos.especial ? 'zona-tumba alma-maestra' : (esPuntoRojo ? 'zona-tumba tumba-sellada' : 'zona-tumba');
        
        div.style.top = pos.top;
        div.style.left = pos.left;
        div.style.setProperty('--color-cripto', pos.color);
        div.setAttribute('data-nombre', pos.nombre);

        
        if (pos.especial) {
            div.innerHTML = `
                <div class="sigilo-soulgeist"></div>
                <div class="nombre-cripto">Soulgeist</div>
                <div class="balance-actual" id="balance-soulgeist">Poder: ${balanceUsuarioSG} SG</div>
            `;
        } else {
            div.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; position: relative; width: 120px;">
                    <div class="moneda-flotante" style="filter: drop-shadow(0 0 10px ${pos.color});">
                        <span class="simbolo-cripto">${pos.sim}</span>
                    </div>
                    <div class="info-tumba" style="margin-top: 12px; text-align: center; width: 100%;">
                        <div class="nombre-cripto" style="color: ${pos.color}; font-weight: bold; font-size: 14px; text-shadow: 0 0 5px #000;">
                            ${pos.nombre}
                        </div>
                        <div class="balance-proyectado" style="color: #fff; font-size: 12px; opacity: ${visibilidadOpacidad}; transition: opacity 0.5s ease;">
                            +${textoBalance} ${pos.sim}
                        </div>
                    </div>
                </div>
            `;
        }

        div.onclick = (e) => {
            e.stopPropagation();
	
	    if (esPuntoRojo) {
                lanzarAlertaMictlan("ESTA BÓVEDA ESTÁ EN EL ABISMO", "El portal hacia esta cripta está sellado por los guardianes. Regresa pronto.");
                return;
            }

            if (window.tumbasConSaldo && window.tumbasConSaldo[pos.nombre] > 0) {
                abrirModalCosechaFinal(pos);
                return;
            }

            if (pos.especial) {
                dispararInicioRitualGlobal();
                return;
            }

                 if (ritualActivo) {
                if (balanceUsuarioSG <= 0) {
                    lanzarAlertaMictlan("Tu Soulgeist está vacío.", "RITUAL DENEGADO");
                    return;
                }

                const cantidadEnviada = window.cantidadParaRitual || balanceUsuarioSG;
                
                if (cantidadEnviada > balanceUsuarioSG) {
                    lanzarAlertaMictlan("No tienes suficiente Soulgeist.", "RITUAL DENEGADO");
                    return;
                }

                // DESCUESTA REAL
                balanceUsuarioSG = Math.max(0, balanceUsuarioSG - cantidadEnviada);
                localStorage.setItem('soulgeist_balance', balanceUsuarioSG);
                actualizarBalanceSoulgeist(balanceUsuarioSG);

                ritualActivo = false;

                const tumbaOrigen = document.querySelector('.alma-maestra');
                const tumbaDestino = e.currentTarget;

    const infoTasa = window.TASAS_ACTUALES[pos.nombre] || { tasa: 0 };
const cantidadConvertida = cantidadEnviada * infoTasa.tasa;

lanzarAlma(tumbaOrigen, tumbaDestino, pos.color, cantidadConvertida, pos, async () => {
    window.tumbasConSaldo[pos.nombre] = (window.tumbasConSaldo[pos.nombre] || 0) + cantidadConvertida;
    guardarSaldosCriptas();
    await descontarBalanceEnRedis(cantidadEnviada);
    generarCementerio();
    mostrarModalFusionExitosa(pos, cantidadConvertida);
});
            } else {
                lanzarAlertaMictlan("Toca el Soulgeist para iniciar la canalización.", "RITUAL REQUERIDO");
            }
        };

        contenedor.appendChild(div);
    });

    // Pilares fijos
    const pilares = [
        { texto: "ASCENSO", sub: "REGRESAR", link: "https://faucet-btc.xyz", clase: "pilar-izquierdo" },
        { texto: "MICTLÁN", sub: "DESCENDER", link: "#", clase: "pilar-derecho" }
    ];
    pilares.forEach(p => {
        const pilarExistente = document.querySelector(`.${p.clase}`);
        if (pilarExistente) pilarExistente.remove();
        const enlace = document.createElement('a');
        enlace.href = p.link;
        enlace.className = `inscripcion-pilar ${p.clase}`;
        enlace.innerHTML = `<span>${p.texto}</span><small>${p.sub}</small>`;
        if (p.clase === "pilar-derecho") {
            enlace.onclick = (e) => { e.preventDefault(); mostrarContratoMictlan(); };
        }
        contenedor.appendChild(enlace);
    });
}

// ==================================================================
// PASO 4: MODAL DE COSECHA DE CRIPTO Y CONFIGURACIÓN DE WALLET
// ==================================================================
function abrirModalCosechaFinal(pos) {
    const modal = document.getElementById('modal-ritual');
    const titulo = document.getElementById('titulo-ritual');
    const info = document.getElementById('info-ritual');
    const botones = document.querySelector('.botones-exchange');

    if (!modal) return;

    window.currentCripto = pos;
    titulo.innerText = `BÓVEDA DE ${pos.nombre.toUpperCase()}`;
    
    const saldoActual = window.tumbasConSaldo[pos.nombre] || 0;

    // SG equivalentes al saldo visual
    const infoTasaModal = window.TASAS_ACTUALES[pos.nombre] || { tasa: 0 };
    const sgEquivalentes = infoTasaModal.tasa > 0 ? (saldoActual / infoTasaModal.tasa) : 0;

    info.innerHTML = `
        <div style="text-align: center; margin: 20px 0;">
            <p style="color: #aaa;">Saldo acumulado en esta tumba:</p>
            <h2 style="color: ${pos.color}; font-size: 28px; text-shadow: 0 0 10px ${pos.color};">
                ${saldoActual.toFixed(8)} ${pos.sim}
            </h2>
            <p style="color: #888; font-size: 13px; margin-top: 6px;">
                ≈ <b style="color:#c8a951;">${sgEquivalentes.toFixed(2)} SG</b> a retirar
            </p>
            <div style="margin:14px auto; max-width:320px; padding:10px 14px; background:rgba(200,169,81,0.08); border-left:3px solid #c8a951; border-radius:4px; text-align:left;">
                <p style="color:#c8a951; font-size:11px; margin:0; line-height:1.6;">
                    ⚠️ <b>Nota:</b> Los saldos mostrados son valores de referencia.
                    Al retirar recibirás <b>SG tokens</b> equivalentes en tu MetaMask,
                    que puedes convertir a ${pos.nombre} en
                    <a href="https://quickswap.exchange/#/swap?inputCurrency=0x51Fb9B6b0e008eFC867492D2930D959879A5bCfB"
                       target="_blank" style="color:#ff6b35; text-decoration:underline;">QuickSwap ↗</a>.
                </p>
            </div>
            <p style="color:#666; font-size:12px; margin-top:6px;">
                ¿Qué deseas hacer con esta energía acumulada?
            </p>
        </div>
    `;

    botones.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px; width: 80%; margin: 0 auto;">
            <!-- Opción 1: Seguir acumulando -->
            <button onclick="abrirModalSeleccionCantidad(window.currentCripto)" 
                    style="background: #222; color: ${pos.color}; border: 1px solid ${pos.color}; padding: 12px; font-weight: bold;">
                ➕ AÑADIR MÁS PODER
            </button>
            
            <!-- Opción 2: Retirar (Muestra los campos de wallet) -->
            <button id="btn-mostrar-retiro" 
                    style="background: ${pos.color}; color: #000; padding: 12px; font-weight: bold;">
                💰 RETIRAR A BILLETERA
            </button>
            
            <button onclick="cerrarRitual()" style="background: transparent; color: #666; padding: 5px;">
                CANCELAR
            </button>
        </div>
    `;

    // Lógica para mostrar los campos de retiro solo si pulsa el botón
   // --- Modificación en abrirModalCosechaFinal ---
document.getElementById('btn-mostrar-retiro').onclick = function() {
    const seccion = document.getElementById('seccion-retiro');
    const pos = window.currentCripto;

    // Detectamos si es un activo EVM (Polygon/BNB Chain)
    const esEVM = (pos.nombre === "MATIC/POL" || pos.nombre === "BNB" || pos.nombre === "Ethereum" || pos.nombre === "USDT" || pos.nombre === "Pepe");

    if (esEVM) {
        // --- FLUJO METAMASK ---
        const saldoActual = window.tumbasConSaldo[pos.nombre] || 0;
pos.montoAEnviar = saldoActual;
conectarYRetirarMetaMask(pos);
        } else {
            procesarRetiro(); // Tu función existente
        }
   };

    modal.style.display = 'block';
}



function adaptarPlaceholderPasarela(criptoId) {
    // Si la cripto es de red (EVM), no hacemos nada porque no usamos pasarelas
    const esEVM = ['MATIC/POL', 'BNB', 'ETHEREUM', 'USDT', 'PEPE', 'SOULGEIST'].includes(criptoId.toUpperCase());
    if (esEVM) return;

    const pasarela = document.getElementById('pasarela-select').value;
    const input = document.getElementById('wallet-input');
    if (!input) return;

    if (pasarela === 'bitso') {
        input.placeholder = "Dirección Bitso (BTC, USDT, etc.)";
    } else {
        input.placeholder = `Dirección de ${criptoId} en ${pasarela.toUpperCase()}`;
    }
}

async function procesarRetiro() {
    const nombreCripto = window.currentCripto ? window.currentCripto.nombre : "Bitcoin";
    
    // --- NUEVO PUENTE DELEGADOR ---
    // Si es un activo de red, lo enviamos a su propio ritual y salimos de esta función
    if (['MATIC/POL', 'BNB', 'ETHEREUM', 'USDT', 'PEPE', 'SOULGEIST'].includes(nombreCripto.toUpperCase())) {
        await conectarYRetirarMetaMask(window.currentCripto);
        return; 
    }
    // -------------------------------

    // Si llega aquí, es porque es BTC o LTC (el código original sigue intacto)
    const inputWallet = document.getElementById('wallet-input');
    const selectPasarela = document.getElementById('pasarela-select');
    
    if (!inputWallet || inputWallet.value.trim().length < 5) {
        lanzarAlertaMictlan("Falta la dirección de destino.", "RITUAL INCOMPLETO");
        return;
    }

    const identidadUsuario = localStorage.getItem('soulgeist_user_email') || window.userWallet;
    const pasarelaElegida = selectPasarela ? selectPasarela.value : "bitso";

    cerrarRitual();
    procesarCosecha(identidadUsuario, inputWallet.value.trim(), nombreCripto, pasarelaElegida);
}


async function procesarCosecha(identidad, walletUsuario, criptoSeleccionada, pasarela) {
    try {
        console.log("🔄 Enviando reclamo:", { identidad, walletUsuario, cripto: criptoSeleccionada, pasarela });

        const saldoCripto = window.tumbasConSaldo[criptoSeleccionada] || 0;

console.log(`Saldo real de ${criptoSeleccionada}: ${saldoCripto}`);

// === LLAMADA AL BACKEND MEJORADA ===
console.log("📤 Enviando reclamo:", { 
    identidad: identidad, 
    wallet: walletUsuario, 
    cripto: criptoSeleccionada, 
    pasarela: pasarela 
});

const respuesta = await fetch('/api/reclamar', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
        identidad: identidad,
        wallet: walletUsuario,
        cripto: criptoSeleccionada,
        pasarela: pasarela,
	saldoCripto: saldoCripto
    })
});

console.log("Status del backend:", respuesta.status);

let resultado;
try {
    resultado = await respuesta.json();
} catch (e) {
    console.error("Error al parsear JSON del backend:", e);
    lanzarAlertaMictlan("Respuesta inválida del servidor", "ERROR INTERNO");
    return;
}

console.log("Respuesta del backend:", resultado);

if (!respuesta.ok) {
    lanzarAlertaMictlan(resultado.error || "Error del servidor", "ADVERTENCIA MORTAL");
    return;
}

// Éxito
if (resultado.success) {
    balanceUsuarioSG = 0;
    localStorage.setItem('soulgeist_balance', '0');
    
    const selector = document.querySelector('.alma-maestra .balance-actual');
    if (selector) selector.innerText = `Poder: 0 SG`;

    generarCementerio();
    lanzarAlertaMictlan(resultado.mensaje || "Cosecha realizada con éxito", "ÉXITO");
}

        // Éxito
        if (resultado.balanceAlmas !== undefined) {
            balanceUsuarioSG = resultado.balanceAlmas;
            localStorage.setItem('soulgeist_balance', balanceUsuarioSG);
            
            const selector = document.querySelector('.alma-maestra .balance-actual');
            if (selector) selector.innerText = `Poder: ${balanceUsuarioSG} SG`;
        }

        if (window.tumbasConSaldo[criptoSeleccionada] !== undefined) {
            window.tumbasConSaldo[criptoSeleccionada] = 0;
            guardarSaldosCriptas();
        }

	if (['MATIC/POL', 'BNB', 'ETHEREUM', 'USDT', 'PEPE', 'SOULGEIST'].includes(criptoSeleccionada.toUpperCase())) {
            fetch('/api/limpiar-balance-tras-retiro', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet: walletUsuario, cripto: criptoSeleccionada }) 
            }).then(() => console.log("Sincronización con Redis completada.")).catch(console.error);
        }

        generarCementerio();
        lanzarAlertaMictlan(resultado.mensaje || "Cosecha realizada", "ÉXITO");

    } catch (error) {
        console.error("Error en procesarCosecha:", error);
        lanzarAlertaMictlan("No se pudo conectar con el inframundo.", "FALLO DE CONEXIÓN");
    }
}

function cerrarRitual() {
    const modal = document.getElementById('modal-ritual'); 
    const cementerio = document.getElementById('campo-santo'); 
    if(modal) modal.style.display = 'none'; 
    if(cementerio) cementerio.style.filter = "none"; 
}

// ==================================================================
// ABSORCIÓN DE MONETIZADOS (RECLAMOS DE ENERGÍA DE MONETAG)
// ==================================================================
let anuncioEnCurso = false;
let focoPerdido = false;
const checkFocus = () => {
    // Nota: Usamos una variable de estado que revisaremos dentro de mostrarVideoUnityAds
    if (document.hidden && window.vigilanciaActiva) {
        focoPerdido = true;
        console.log("Trampa detectada: El usuario abandonó el ritual.");
    }
};

function mostrarVideoUnityAds() {
    if (!window.userWallet) {
        lanzarAlertaMictlan("Debes ligar tu wallet antes de absorber energía.", "SANTUARIO SIN DUEÑO");
        return;
    }

    if (anuncioEnCurso) return;

    anuncioEnCurso = true;
    focoPerdido = false;
    window.vigilanciaActiva = false; // Activamos vigilancia mediante una variable global

    setTimeout(() => {
        window.vigilanciaActiva = true;
    }, 3000);

    document.addEventListener("visibilitychange", checkFocus);



    // Abrir ventana una sola vez
    window.open("https://omg10.com/4/11178661", '_blank', 'noopener,noreferrer');

    const modalPortal = document.getElementById('portal-monlix-modal');
    const btnCerrar = document.getElementById('cerrar-portal-btn');

    if (modalPortal && btnCerrar) {
        modalPortal.style.display = 'flex';
        lanzarAlertaMictlan("Interactúa con el anuncio y regresa para reclamar.", "PORTAL ABIERTO");

        let tiempoRestante = 30;
        btnCerrar.disabled = true;
        btnCerrar.style.background = "#222";
        btnCerrar.innerText = `CANALIZANDO ENERGÍA (${tiempoRestante}s)...`;

        const relojMictlan = setInterval(() => {
    // 1. Verificación de seguridad (Foco perdido)
    if (focoPerdido) {
        clearInterval(relojMictlan);
        document.removeEventListener("visibilitychange", checkFocus);
        anuncioEnCurso = false;
        document.title = "Ritual Interrumpido | Camino al Mictlán"; // Aviso de falla
        modalPortal.style.display = 'none';
        lanzarAlertaMictlan("¡RITUAL ROTO! Debes mantener la publicidad activa.", "FALLO DE CONCENTRACIÓN");
        return;
    }

    tiempoRestante--;

    // 2. ACTUALIZACIÓN EN BARRA DE TÍTULO
    // Si quedan segundos, muestra el conteo. Si llega a 0, avisa que ya puede cerrar.
    document.title = tiempoRestante > 0 
        ? `(${tiempoRestante}s) Canalizando... | Camino al Mictlán` 
        : "✅ ¡ENERGÍA LISTA! | Camino al Mictlán";

    // 3. Actualización en el botón
    btnCerrar.innerText = tiempoRestante > 0 
        ? `CANALIZANDO ENERGÍA (${tiempoRestante}s)...` 
        : "RETROCEDER AL CEMENTERIO";

    // 4. Finalización del tiempo
    if (tiempoRestante <= 0) {
        clearInterval(relojMictlan);
        document.removeEventListener("visibilitychange", checkFocus);
        
        btnCerrar.disabled = false;
        btnCerrar.style.background = "#3a0000";
        btnCerrar.style.color = "#ffcccc";
        btnCerrar.style.cursor = "pointer";
    }
}, 1000);
    } else {
        anuncioEnCurso = false;
    }
}

// 2. AQUÍ ESTÁ TU BLOQUE TOTALMENTE INTACTO (Se ejecuta al cerrar el portal de Monlix)
const ENLACE_MISTICO_KEY = "TuPalabraSecretaDelInframundo";

async function videoCompletado() {
    if (!window.userWallet) {
        lanzarAlertaMictlan("Debes ligar tu wallet antes de absorber energía.", "SANTUARIO SIN DUEÑO");
        return;
    }

    if (focoPerdido) {
        lanzarAlertaMictlan("No puedes reclamar: el portal se cerró porque abandonaste la publicidad.", "RITUAL INVÁLIDO");
        return;
    }

    try {
        const walletLimpia = window.userWallet.toLowerCase().trim();
        const accion = 'sumar_ritual';
        
        // --- RITUAL DE FIRMA CRIPTOGRÁFICA ---
        // Creamos un mensaje único combinando los datos
        const mensaje = `${walletLimpia}:${accion}:${ENLACE_MISTICO_KEY}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(mensaje);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const firmaSegura = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Envia el POST real a tu API para acumular los 10 SG en Redis
        const respuesta = await fetch('/api/acumular-sg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: window.userWallet, accion: 'sumar_ritual' })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            lanzarAlertaMictlan(resultado.error || "Los espíritus bloquearon esta ofrenda.", "CANDADO DEL TIEMPO");
            return;
        }
 
	anuncioEnCurso = false;
	document.removeEventListener("visibilitychange", checkFocus);

        // Actualiza las variables globales y el localStorage con el nuevo balance del servidor
        balanceUsuarioSG = parseFloat(resultado.nuevoBalance) || balanceUsuarioSG;
        localStorage.setItem('soulgeist_balance', balanceUsuarioSG);

        // Actualiza el contador y dibuja de nuevo tu cementerio
        actualizarBalanceSoulgeist(balanceUsuarioSG);
        generarCementerio();

        // Despliega tu alerta mística con el mensaje de éxito original
        lanzarAlertaMictlan(resultado.mensaje || `+10 SG absorbidos`, "ENERGÍA ABSORBIDA");

    } catch (error) {
	anuncioEnCurso = false;
	document.removeEventListener("visibilitychange", checkFocus);
        console.error("Error en video:", error);
        lanzarAlertaMictlan("No se pudo conectar con el inframundo.", "FALLO DE RED");
    }
}

// ==================================================================
// EXTRAS Y MODALES SECUNDARIOS
// ==================================================================
function mostrarContratoMictlan() {
    const overlay = document.createElement('div'); 
    overlay.className = 'overlay-contrato'; 
    const modal = document.createElement('div'); 
    modal.className = 'modal-pergamino';  
    
    modal.innerHTML = `
    <div class="pergamino-content">
        <h2 class="pergamino-titulo">Contrato del Mictlán</h2>
        <div class="pergamino-texto">
            <p style="margin-bottom: 12px;">Yo, buscador de tesoros, ligo mi alma a estos dominios sagrados...</p>
        </div>
        <div class="pergamino-botones">
            <button class="btn-ritual pentaculo-cursor" id="pacto-si">ACEPTAR PACTO</button>
            <button class="btn-ritual pentaculo-cursor" style="background:#222;" id="pacto-no">HUIR</button>
        </div>
    </div>`; 
    
    document.body.appendChild(overlay); 
    document.body.appendChild(modal); 

    document.getElementById('pacto-no').onclick = () => { modal.remove(); overlay.remove(); }; 
    document.getElementById('pacto-si').onclick = () => {
        modal.style.transition = "all 0.8s ease-in-out"; 
        modal.style.opacity = "0"; 
        overlay.style.transition = "opacity 0.8s"; 
        overlay.style.opacity = "0"; 
        setTimeout(() => { modal.remove(); overlay.remove(); abrirConfirmacionFinal(); }, 800); 
    };
}

function abrirConfirmacionFinal() {
    const overlayFinal = document.createElement('div'); 
    overlayFinal.className = 'overlay-contrato'; 
    const modalFinal = document.createElement('div'); 
    modalFinal.className = 'modal-notificacion';  
    
    Object.assign(modalFinal.style, {
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", zIndex: "10001",
        background: "rgba(10, 0, 0, 0.95)", border: "2px solid #ff0000",
        boxShadow: "0 0 20px #ff0000", padding: "30px", textAlign: "center"
    }); 

    modalFinal.innerHTML = `
        <h2 style="color:#ff0000; font-family:'Nosifer', serif;">PACTO SELLADO</h2>
        <p style="color:#fff; font-family:'MedievalSharp', cursive;">Tu alma ahora pertenece al Mictlán.</p>
        <div style="margin-top:20px; display:flex; gap:10px; justify-content:center;">
            <button id="final-si" class="btn-ritual pentaculo-cursor" style="background:#4a0000; color:white; padding:10px 20px; border:1px solid #ff0000;">DESCENDER</button>
            <button id="final-no" class="btn-ritual pentaculo-cursor" style="background:#222; color:white; padding:10px 20px; border:1px solid #555;">CANCELAR</button>
        </div>
    `; 

    document.body.appendChild(overlayFinal); 
    document.body.appendChild(modalFinal); 

    document.getElementById('final-si').onclick = () => { // window.location.href = "https://void-onyx-web.vercel.app";
lanzarAlertaMictlan("Portal Sellado", "El Abismo aún no está listo para recibir tu alma. Vuelve pronto.");
 }; 
    document.getElementById('final-no').onclick = () => { modalFinal.remove(); overlayFinal.remove(); }; 
}

function lanzarAlertaMictlan(mensaje, titulo = "¡ADVERTENCIA MORTAL!") {
    // ESTA LÍNEA TE DIRÁ EXACTAMENTE QUIÉN BLOQUEA EL RETIRO
    console.trace("Rastreo de la alerta:"); 
    
    document.getElementById('alerta-titulo').innerText = titulo; 
    document.getElementById('alerta-mensaje').innerText = mensaje; 
    const modal = document.getElementById('alerta-mictlan'); 
    if(modal) modal.style.display = 'flex'; 
}

function cerrarAlertaMictlan() {
    const modal = document.getElementById('alerta-mictlan');
    const modalAlterno = document.getElementById('alerta-mictlan');
    if (modal) modal.style.display = 'none';
    if (modalAlterno) modalAlterno.style.display = 'none';
}

// ====================== MENÚ PRINCIPAL DE LEYES ======================
function mostrarPergamino(tipo) {
    const pantalla = document.getElementById('pantalla-codice');
    const titulo   = document.getElementById('codice-titulo');
    const cuerpo   = document.getElementById('codice-cuerpo');
    const boton    = document.querySelector('.boton-cerrar-codice');

    if (tipo === 'leyes') {
        titulo.innerText = "LEYES DEL MICTLÁN";
        cuerpo.innerHTML = `
    <p style="text-align:center; color:#ccaaaa; margin-bottom:25px;">
        Elige la sabiduría que deseas consultar:
    </p>
    <div style="display:flex; flex-direction:column; gap:18px; text-align:center; margin-top:10px;">
        <span onclick="mostrarSubLey('privacidad')" class="pentaculo-cursor link-ley" style="font-family:'MedievalSharp',cursive; font-size:0.7rem; letter-spacing:1px; display:block;">— SEGURIDAD Y PRIVACIDAD —</span>
<span onclick="mostrarSubLey('reglas')" class="pentaculo-cursor link-ley" style="font-family:'MedievalSharp',cursive; font-size:0.7rem; letter-spacing:1px; display:block;">— REGLAS ETERNAS —</span>
<span onclick="mostrarSubLey('prohibiciones')" class="pentaculo-cursor link-ley" style="font-family:'MedievalSharp',cursive; font-size:0.7rem; letter-spacing:1px; display:block;">— PROHIBICIONES DEL INFRAMUNDO —</span>
<span onclick="mostrarSubLey('consecuencias')" class="pentaculo-cursor link-ley" style="font-family:'MedievalSharp',cursive; font-size:0.7rem; letter-spacing:1px; display:block;">— CONSECUENCIAS —</span>
    </div>
`;

        // ✅ Botón principal → cierra el pergamino
        if (boton) {
            boton.innerHTML = '[ CERRAR PACTO ]';
            boton.onclick = cerrarCodice;
        }

    } else if (tipo === 'alianzas') {
    titulo.innerText = "ALIANZAS OSCURAS"; 
    
   cuerpo.innerHTML = `
    <div class="bloque-metamask" style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
        <img src="img/Meta1.png" alt="MetaMask" style="width: 50px; height: 50px;">
        <span style="font-weight: 900;">METAMASK</span>
    </div>
`;
    }

    if (pantalla) {
        pantalla.style.display = 'flex';
        setTimeout(() => { pantalla.style.opacity = '1'; }, 10);
    }
}

// ====================== SUB-SECCIONES DE LEYES ======================
function mostrarSubLey(seccion) {
    const titulo = document.getElementById('codice-titulo');
    const cuerpo = document.getElementById('codice-cuerpo');
    const boton  = document.querySelector('.boton-cerrar-codice');

    if (boton) {
        boton.innerHTML = '[ REGRESAR A LEYES ]';
        boton.onclick = () => mostrarPergamino('leyes');
    }

    const contenidos = {
        privacidad: {
            titulo: "VELO DE PRIVACIDAD",
            texto: `Las sombras del Mictlán guardan tus secretos con celo ancestral.<br><br>
                    Solo preservamos tu dirección de wallet y correo electrónico — 
                    los sellos necesarios para que el portal reconozca tu alma.<br><br>
                    Jamás reclamaremos tu nombre mortal, domicilio físico, 
                    número de invocación ni datos bancarios del mundo de los vivos.<br><br>
                    Tu esencia digital pertenece únicamente a ti.`
        },
        reglas: {
            titulo: "REGLAS ETERNAS",
            texto: `Desde los tiempos de Mictlantecuhtli, el inframundo opera bajo 
                    leyes inmutables que todo viajero debe respetar:<br><br>
                    — Una sola alma por caminante. Las identidades múltiples 
                    serán reconocidas y eliminadas sin misericordia.<br><br>
                    — El uso de VPN, proxies o cualquier velo artificial para 
                    ocultar tu origen está estrictamente prohibido.<br><br>
                    — Las recompensas son sagradas y solo se otorgan a quienes 
                    las merecen por mérito propio.<br><br>
                    — SOULGEIST es una criptomoneda con valor real. 
                    Su uso implica conocimiento y aceptación del riesgo financiero.`
        },
        prohibiciones: {
            titulo: "PROHIBICIONES DEL INFRAMUNDO",
            texto: `Los siguientes actos son considerados profanación en el Mictlán 
                    y serán juzgados con severidad:<br><br>
                    — Manipulación de transacciones o intentos de engaño al sistema.<br><br>
                    — Difusión de información falsa sobre SOULGEIST o Camino al Mictlán.<br><br>
                    — Uso de bots, scripts automatizados o cualquier herramienta 
                    que simule actividad humana.<br><br>
                    — Actividades que violen las leyes de México o del país 
                    desde donde se accede al portal.<br><br>
                    — Intentos de hackeo, inyección de código o cualquier ataque 
                    contra la infraestructura del Mictlán.`
        },
        consecuencias: {
            titulo: "CONSECUENCIAS",
            texto: `El Mictlán no perdona ni olvida. Quienes profanen estas leyes 
                    enfrentarán el juicio eterno:<br><br>
                    — Suspensión permanente e irrevocable de la cuenta. 
                    Recuerda: del más allá no hay regreso.<br><br>
                    — Quema inmediata de todas las recompensas acumuladas.<br><br>
                    — Bloqueo definitivo de wallet y dirección IP.<br><br>
                    — En casos graves que impliquen fraude o actividad ilegal, 
                    la información será compartida con las autoridades competentes 
                    conforme a la legislación mexicana vigente.<br><br>
                    <em>El Mictlán observa. El Mictlán recuerda. El Mictlán actúa.</em>`
        }
    };

    const data = contenidos[seccion];
    if (data) {
        titulo.innerText = data.titulo;
        cuerpo.innerHTML = `<p>${data.texto}</p>`;
    }
}
function cerrarCodice() {
    const pantalla = document.getElementById('pantalla-codice');
    if (pantalla) {
        pantalla.style.display = 'none';
    }
}

function cerrarCodice() { 
    document.getElementById('pantalla-codice').style.display = 'none'; 
} 


function abrirSoporte() {
    const pantalla = document.getElementById('pantalla-oraculo'); 
    if (pantalla) {
        pantalla.style.display = 'flex'; 
        setTimeout(() => { pantalla.style.opacity = '1'; }, 10); 
    }
}

function cerrarOraculo() {
    const pantalla = document.getElementById('pantalla-oraculo'); 
    if (pantalla) pantalla.style.display = 'none'; 
}

async function enviarOfrendaOraculo() {
    const inputMensaje = document.getElementById('oraculo-input');
    const oraculoRespuestaDiv = document.getElementById('oraculo-respuesta');
    
    if (!inputMensaje || !inputMensaje.value.trim()) {
        if (oraculoRespuestaDiv) oraculoRespuestaDiv.innerHTML = "La pregunta es obligatoria.";
        return;
    }

    const preguntaGuardada = inputMensaje.value.trim();

    try {
        // Mostrar estado de carga místico en el contenedor de tu pantalla
        if (oraculoRespuestaDiv) {
            oraculoRespuestaDiv.style.color = "#ffb380";
            oraculoRespuestaDiv.innerHTML = "<i>El humo del copal se eleva... Las deidades escuchan tu susurro...</i>";
        }
        
        // Limpiamos el input de inmediato para mejorar la experiencia de usuario
        inputMensaje.value = "";

        const response = await fetch('/api/invocar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: preguntaGuardada })
        });

        const data = await response.json();

        if (oraculoRespuestaDiv) {
            if (response.ok) {
                oraculoRespuestaDiv.style.color = "#ffffff"; // Color normal para la respuesta
                oraculoRespuestaDiv.innerHTML = data.respuesta;
            } else {
                oraculoRespuestaDiv.style.color = "#ff5555"; // Color rojo para errores
                oraculoRespuestaDiv.innerHTML = "Error: " + (data.error || "Fallo en la comunicación.");
            }
        }
    } catch (error) {
        console.error("Error:", error);
        if (oraculoRespuestaDiv) {
            oraculoRespuestaDiv.style.color = "#ff5555";
            oraculoRespuestaDiv.innerHTML = "Error técnico: Las deidades guardan silencio.";
        }
    }
}

// ==================================================================
// CARGA INICIAL Y VINCULACIÓN PROTEGIDA (REPARADO)
// ==================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Inicialización segura del botón de inicio de sesión de Google
    if (typeof inicializarBotonGoogle === 'function') {
        inicializarBotonGoogle();
    }

    // Portal de Entrada a las Rejas
    const portalElement = document.getElementById('escena-portal');
    if (portalElement) {
        portalElement.onclick = entrarAlMictlan;
    }

    // Botón Principal Superior: "ABSORBER ENERGÍA" / Iniciar Ritual
    const btnRitualFlotante = document.getElementById('btn-iniciar-ritual-faucet') || document.querySelector('.btn-invocar-ritual');
    if (btnRitualFlotante) {
        btnRitualFlotante.onclick = dispararInicioRitualGlobal;
    }

    // VINCULACIÓN SEGURA DE LOS BOTONES DEL MODAL GRIMORIO (Evita el error fatal de la consola)
    // Buscamos tus IDs reales: 'btn-ritual-enviar-unico' y 'btn-ritual-cancelar-primer-paso'
    const btnEnviarGlobal = document.getElementById('btn-ritual-enviar-unico') || document.getElementById('btn-ritual-enviar');
    if (btnEnviarGlobal) {
        btnEnviarGlobal.onclick = procesarRetiro;
    }

    const btnCancelarGlobal = document.getElementById('btn-ritual-cancelar-primer-paso') || document.getElementById('btn-ritual-cancelar');
    if (btnCancelarGlobal) {
        btnCancelarGlobal.onclick = cerrarRitual;
    }

    // Persistencia del usuario en el Inframundo
    const usuarioGuardado = localStorage.getItem('soulgeist_user_email');
    if (usuarioGuardado) {
        window.userWallet = usuarioGuardado;
        // Si hay una sesión activa, entra directo al Campo Santo mapeando el balance
        if (typeof entrarAlCampoSanto === 'function') {
            entrarAlCampoSanto({ balanceSG: parseFloat(localStorage.getItem('soulgeist_balance')) || 0 }); 
        }
    }
// Añade esto al final de tu bloque document.addEventListener("DOMContentLoaded", () => { ... });
	if (document.getElementById('barra-progreso')) {
        actualizarBarraProgreso();
    }
});

// Aceptamos 'pos' como parámetro
// ÚNICA VERSIÓN DE lanzarAlma
function lanzarAlma(origen, destino, color, cantidad, pos, callback) {
    if (!origen || !destino) {
        if (callback) callback();
        return;
    }

    const anima = document.createElement('div');
    anima.className = 'almaviajera';
    
    Object.assign(anima.style, {
        position: 'absolute',
        left: '0px', top: '0px',
        width: '14px', height: '14px',
        backgroundColor: color,
        background: `radial-gradient(circle, #fff, ${color} 40%, transparent 70%)`,
        boxShadow: `0 0 15px ${color}, 0 0 30px ${color}`,
        transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
        transform: 'translate(-50%, -50%) scale(1)'
    });

    const rectOrigen = origen.getBoundingClientRect();
    const rectDestino = destino.getBoundingClientRect();
    const rectContenedor = document.getElementById('contenedor-criptos').getBoundingClientRect();

    const xInicio = (rectOrigen.left + rectOrigen.width / 2) - rectContenedor.left;
    const yInicio = (rectOrigen.top + rectOrigen.height / 2) - rectContenedor.top;
    const xFin = (rectDestino.left + rectDestino.width / 2) - rectContenedor.left;
    const yFin = (rectDestino.top + rectDestino.height / 2) - rectContenedor.top;

    anima.style.left = `${xInicio}px`;
    anima.style.top = `${yInicio}px`;

    document.getElementById('contenedor-criptos').appendChild(anima);

    requestAnimationFrame(() => {
        anima.style.left = `${xFin}px`;
        anima.style.top = `${yFin}px`;
        anima.style.transform = 'translate(-50%, -50%) scale(1.6)';
    });

    anima.addEventListener('transitionend', () => {

    anima.remove();

    destino.classList.add('efecto-impacto');

    setTimeout(() => {

        destino.classList.remove('efecto-impacto');

        if (callback) callback();

    }, 150);

}, { once: true });
}
function actualizarBalanceSoulgeist(nuevoValor) {
    // Busca el elemento del Soulgeist por su ID único
    const el = document.getElementById('balance-soulgeist');
    if (el) {
        el.innerText = `Poder: ${nuevoValor} SG`;
    }
}
function mostrarModalFusionExitosa(pos, cantidad) {
    lanzarAlertaMictlan(
        `¡Alma extraída con éxito! +${cantidad.toFixed(6)} ${pos.sim}`, 
        "FUSIÓN COMPLETADA"
    );
    
    // Opcional: Cerrar cualquier modal abierto
    setTimeout(() => {
        cerrarRitual();
    }, 1800);
}
// --- MODAL DE SELECCIÓN DE CANTIDAD ---
function abrirModalSeleccionCantidad(pos) {
    const modal = document.getElementById('modal-ritual'); // Reutilizamos el contenedor
    if (!modal) return;

    document.getElementById('titulo-ritual').innerText = `SACRIFICIO A ${pos.nombre.toUpperCase()}`;
    
    document.getElementById('info-ritual').innerHTML = `
        <div style="text-align: center; color: #fff;">
            <p>Soulgeist disponible: <b>${balanceUsuarioSG.toFixed(2)} SG</b></p>
            <input type="number" id="cantidad-a-enviar" placeholder="Cantidad SG" 
                   style="width:80%; padding:10px; background:#000; color:#fff; border:1px solid ${pos.color}; margin:10px 0;">
        </div>
    `;

    // Reconfiguramos los botones del modal
    const botones = document.querySelector('.botones-exchange');
    botones.innerHTML = `
        <button id="btn-confirmar-envio" style="background:${pos.color};">INICIAR RITUAL</button>
        <button onclick="cerrarRitual()">CANCELAR</button>
    `;

    document.getElementById('btn-confirmar-envio').onclick = () => {
        const cantidad = parseFloat(document.getElementById('cantidad-a-enviar').value);
        if (isNaN(cantidad) || cantidad <= 0 || cantidad > balanceUsuarioSG) {
            lanzarAlertaMictlan("Cantidad no válida o insuficiente.", "SACRIFICIO INVÁLIDO");
            return;
        }
        
        // Ejecutamos la transferencia con la cantidad elegida
        iniciarTransferenciaElegida(pos, cantidad);
    };
    
    modal.style.display = 'block';
}

async function iniciarTransferenciaElegida(pos, cantidad) {
    const tumbaOrigen = document.querySelector('.alma-maestra');
    const tumbaDestino = document.querySelector(`[data-nombre="${pos.nombre}"]`);
   
    if (!tumbaOrigen || !tumbaDestino) return;

    // 1. Guardamos el balance ANTES de descontar (para debug)
    const balanceAntes = balanceUsuarioSG;
    console.log(`[DEBUG] Balance antes: ${balanceAntes} | Cantidad a enviar: ${cantidad}`);

    // 2. Descontar localmente
    balanceUsuarioSG = Math.max(0, balanceUsuarioSG - cantidad);
    actualizarBalanceSoulgeist(balanceUsuarioSG);
    localStorage.setItem('soulgeist_balance', balanceUsuarioSG);

    console.log(`[DEBUG] Balance después de descuento: ${balanceUsuarioSG}`);

    const ganancia = cantidad * (pos.tasa || 0);
    cerrarRitual();

    // 3. Enviar a Redis (CORREGIDO)
    if (window.userWallet) {
        try {
            console.log(`[DESCUENTO] Enviando nuevoBalance = ${balanceUsuarioSG} a Redis`);

            const response = await fetch('/api/acumular-sg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet: window.userWallet,
                    accion: 'descontar_ritual',
                    nuevoBalance: cantidad   // ← Este debe ser 990
                })
            });

            const result = await response.json();
            console.log("✅ Respuesta de Redis:", result);
        } catch (error) {
            console.error("❌ Error al actualizar Redis:", error);
        }
    }

    // 4. Animación + sumar a cripta
    lanzarAlma(tumbaOrigen, tumbaDestino, pos.color, ganancia, pos, () => {
        window.tumbasConSaldo[pos.nombre] = (window.tumbasConSaldo[pos.nombre] || 0) + ganancia;
        
        const keyCriptas = `soulgeist_criptas_${window.userWallet || 'anonimo'}`;
        localStorage.setItem(keyCriptas, JSON.stringify(window.tumbasConSaldo));

        generarCementerio();
        mostrarModalFusionExitosa(pos, ganancia);
    });
}


// ======================== SINCRONIZACIÓN DE BALANCE ========================

async function sincronizarBalanceConRedis() {
    if (!window.userWallet) return 0;

    try {
        const emailLimpio = window.userWallet.toLowerCase().trim();
        
        // Pon aquí tu dominio real de Vercel
        const DOMINIO_VERCEL = 'https://www.caminoamictlan.com';
        const res = await fetch(`${DOMINIO_VERCEL}/api/obtener-balance?wallet=${encodeURIComponent(emailLimpio)}`);
        
        if (!res.ok) {
            const errorData = await res.json();
            console.error("Detalle del error en el servidor:", errorData);
            throw new Error(`Servidor respondió con status ${res.status}`);
        }

        const data = await res.json();
        if (data.balance !== undefined) {
            balanceUsuarioSG = parseFloat(data.balance) || 0;
            localStorage.setItem('soulgeist_balance', balanceUsuarioSG);
            return balanceUsuarioSG;
        }
    } catch (e) {
        console.warn("Fallo total de conexión:", e);
    }
    return parseFloat(localStorage.getItem('soulgeist_balance')) || 0;
}

// Agrega esta función a tu script.js
function resetearMemoriaUsuario() {
    localStorage.removeItem('soulgeist_balance');
    localStorage.removeItem('soulgeist_criptas'); // O cualquier otra llave que uses
    balanceUsuarioSG = 0;
    console.log("Memoria local limpiada para un nuevo usuario.");
}
function limpiarSesionPrevia() {
    localStorage.removeItem('soulgeist_balance');
    // Si usas otras llaves, remuévelas también aquí
    console.log("Memoria limpiada: Preparando para un nuevo pacto.");
}
// Ejemplo al obtener éxito del login
async function loginExitoso(datosUsuario) {
    limpiarSesionPrevia(); // Limpia la basura anterior
    window.userWallet = datosUsuario.email; // Define la identidad
    await entrarAlCampoSanto(); // Carga la verdad desde Redis
}
async function descontarBalanceEnRedis(costoRitual) {
    if (!window.userWallet) return;

    try {
        const respuesta = await fetch('/api/acumular-sg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wallet: window.userWallet,
                costoRitual: costoRitual,
                accion: 'descontar_ritual'
            })
        });

        const resultado = await respuesta.json();
        console.log("✅ Descuento enviado a Redis:", resultado);

        if (respuesta.ok) {
            console.log("Balance actualizado en Redis correctamente");
        }
    } catch (error) {
        console.error("❌ Error al actualizar Redis:", error);
    }
}
function cargarSaldosCriptas() {
    if (!window.userWallet) {
        window.tumbasConSaldo = { "Soulgeist": 0, "Ethereum": 0, "Litecoin": 0, "Pepe": 0, "Matic": 0, "Bnn": 0, "USDT": 0, "Bitcoin": 0 };
        console.log("Nuevo usuario: criptas en cero");
        return;
    }

    const key = `soulgeist_criptas_${window.userWallet}`;
    const guardados = localStorage.getItem(key);
    
    if (guardados) {
        window.tumbasConSaldo = JSON.parse(guardados);
        console.log(`✅ Criptas cargadas para ${window.userWallet}`);
    } else {
        window.tumbasConSaldo = { "Soulgeist": 0, "Ethereum": 0, "Litecoin": 0, "Pepe": 0, "Matic": 0, "Bnb": 0, "USDT": 0, "Bitcoin": 0 };
        console.log(`Nuevo usuario: criptas en cero`);
    }
}

function guardarSaldosCriptas() {
    if (!window.userWallet) return;
    const key = `soulgeist_criptas_${window.userWallet}`;
    localStorage.setItem(key, JSON.stringify(window.tumbasConSaldo));
    console.log(`💾 Guardado criptas para ${window.userWallet}`);
}
function salirDelMictlan() {
    // 1. Limpiamos la identidad del alma (sesión)
    localStorage.removeItem('soulgeist_user_email');
    localStorage.removeItem('usuario_email');
    // Opcional: Si quieres limpiar el balance al salir
    // localStorage.removeItem('soulgeist_balance'); 

    lanzarAlertaMictlan("Tu rastro se desvanece... Regresando al umbral.", "ALMA EN REPOSO");

    // 2. Recargamos la página después de un momento para volver al portal inicial
    setTimeout(() => {
        window.location.reload();
    }, 2000);
}

// Vincular el botón al cargar el documento
document.addEventListener("DOMContentLoaded", () => {
    const btnSalir = document.getElementById('btn-salir-mictlan');
    if (btnSalir) {
        btnSalir.onclick = salirDelMictlan;
    }
});

document.addEventListener('mousemove', (e) => {
   const cursorSerpiente = document.getElementById('cursor-serpiente');

    if (cursorSerpiente) {
        cursorSerpiente.style.left = (e.clientX + 15) + 'px';
        cursorSerpiente.style.top = (e.clientY + 15) + 'px';
        
    }
});
const mensaje = "ANCLADO AL ABISMO";
const contenedor = document.getElementById('cursor-serpiente');

// Crear elementos de letra
mensaje.split('').forEach(char => {
    const span = document.createElement('span');
    span.textContent = char;
    span.className = 'letra-serpiente';
    contenedor.appendChild(span);
});

const letras = document.querySelectorAll('.letra-serpiente');
let posiciones = Array.from(letras).map(() => ({ x: 0, y: 0 }));

document.addEventListener('mousemove', (e) => {
    // La primera letra sigue al mouse directamente
    posiciones[0] = { x: e.clientX, y: e.clientY };

    // Cada letra sigue a la anterior con retraso
    for (let i = 1; i < letras.length; i++) {
        const dx = posiciones[i-1].x - posiciones[i].x;
        const dy = posiciones[i-1].y - posiciones[i].y;
        
        // El factor 0.3 controla qué tanto "se estira" la serpiente
        posiciones[i].x += dx * 0.3;
        posiciones[i].y += dy * 0.3;

        letras[i].style.left = (posiciones[i].x + 15) + 'px';
        letras[i].style.top = (posiciones[i].y + 15) + 'px';
        letras[i].style.position = 'fixed';
    }
    
    // Posicionar la primera letra
    letras[0].style.left = (e.clientX + 15) + 'px';
    letras[0].style.top = (e.clientY + 15) + 'px';
    letras[0].style.position = 'fixed';
});

// Funciones para gestionar el Modal de la Bóveda
function abrirModalWallet() {
    document.getElementById('modal-boveda').style.display = 'flex';
}

function cerrarBoveda() {
    document.getElementById('modal-boveda').style.display = 'none';
}

// Redirecciones directas sin rodeos
function abrirQuickSwap() {
    window.open('https://quickswap.exchange/#/swap', '_blank');
}

// Variable global para guardar el contenido original de la Bóveda
let contenidoOriginalBoveda = "";

function abrirCompraTarjeta() {
    const modal = document.getElementById('modal-boveda');
    const cuerpo = document.getElementById('boveda-cuerpo');

    cuerpo.innerHTML = `
        <div style="text-align: center;">
            <p style="font-size: 1.6em; color: #ff0000; text-shadow: 2px 2px 4px #000; margin-bottom: 15px; font-weight: 900;">
                SABIDURÍA DEL PORTAL
            </p>
            <p style="color: #cc0000; text-shadow: 1px 1px 3px #000; margin-bottom: 25px; font-weight: bold;">
                EL CANAL DE COMPRA CON TARJETA ESTÁ SIENDO CONSAGRADO.
            </p>
            
            <button onclick="abrirQuickSwap()" 
                style="display: block; width: 85%; margin: 12px auto; padding: 14px; background: #4a0000; color: #ffdddd; border: 2px solid #ff0000; font-family: 'Nosifer', cursive; font-size: 0.95em; cursor: pointer; text-shadow: 1px 1px 2px #000;">
                [ COMPRAR TOKENS (VÍA QUICKSWAP) ]
            </button>
            
            <button onclick="cerrarBoveda()" 
                style="display: block; width: 85%; margin: 12px auto; padding: 14px; background: #2a0000; color: #ffdddd; border: 2px solid #880000; font-family: 'Nosifer', cursive; font-size: 0.95em; cursor: pointer; text-shadow: 1px 1px 2px #000;">
                [ VOLVER AL CEMENTERIO ]
            </button>
        </div>
    `;

    modal.style.display = 'flex';
}

function cerrarCompraTarjeta() {
    const cuerpo = document.getElementById('boveda-cuerpo');
    // 1. Restauramos los botones originales que guardamos antes
    cuerpo.innerHTML = contenidoOriginalBoveda;
    // 2. Cerramos el modal usando tu función original
    cerrarBoveda();
}
function mostrarAlerta(titulo, mensaje) {
    document.getElementById('alerta-titulo').innerText = titulo;
    document.getElementById('alerta-mensaje').innerText = mensaje;
    document.getElementById('modal-alerta').style.display = 'flex';
}

function cerrarAlerta() {
    document.getElementById('modal-alerta').style.display = 'none';
}
// ==================================================================
// GUARDIÁN DE RED (CONFIGURADO PARA POLYGON MAINNET)
// ==================================================================
async function asegurarRedProduccion() {
    const POLYGON_CHAIN_ID = '0x89'; // Polygon Mainnet (137)

    if (window.ethereum) {
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== POLYGON_CHAIN_ID) {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: POLYGON_CHAIN_ID }],
                });
            }
        } catch (error) {
            console.error("Error al conectar con la red de producción:", error);
            lanzarAlertaMictlan("Debes conectar tu wallet a Polygon Mainnet.", "RED INCORRECTA");
        }
    } else {
        lanzarAlertaMictlan("No se detectó billetera Web3.", "SIN BILLETERA");
    }
}
window.entrarAlMictlan = entrarAlMictlan;

async function cargarABI() {
    try {
        const response = await fetch('contractABI.json');
        return await response.json();
    } catch (error) {
        console.error("No se pudo cargar el ABI:", error);
        return null;
    }
}

async function actualizarTransparencia() {
    const elemento = document.getElementById("tokensQuemados");
    if (!elemento) {
        console.error("No se encontró tokensQuemados");
        return;
    }

    elemento.textContent = "Consultando al Mictlán...";

    try {
        const provider = new ethers.JsonRpcProvider("https://rpc-mainnet.matic.quiknode.pro");
        
        const contratoAddress = "0x51Fb9B6b0e008eFC867492D2930D959879A5bCfB";
        
        const abi = ["function totalSupply() view returns (uint256)"];
        
        const contrato = new ethers.Contract(contratoAddress, abi, provider);

        const supplyActual = await contrato.totalSupply();
        const supplyInicial = ethers.parseUnits("200000000000", 18);

        const quemados = supplyInicial - supplyActual;
        const valorNumerico = parseFloat(ethers.formatUnits(quemados, 18));

        let textoAbreviado = valorNumerico.toFixed(0);
        if (valorNumerico >= 1000000000) {
            textoAbreviado = (valorNumerico / 1000000000).toFixed(2) + "B";
        } else if (valorNumerico >= 1000000) {
            textoAbreviado = (valorNumerico / 1000000).toFixed(2) + "M";
        } else if (valorNumerico >= 1000) {
            textoAbreviado = (valorNumerico / 1000).toFixed(2) + "K";
        }

        elemento.textContent = `${textoAbreviado} SG QUEMADOS`;
        console.log("✅ Quemados actualizados:", textoAbreviado);

    } catch (err) {
        console.error("Error al actualizar quemados:", err);
        elemento.textContent = "Error al consultar";
    }
}

// Ejecutar automáticamente
window.addEventListener('load', () => {
    setTimeout(actualizarTransparencia, 1800);
});


async function verificarSaludGas(walletAdmin, provider) {
    const balanceGas = await provider.getBalance(walletAdmin.address);
    // 0.01 MATIC es suficiente para varios retiros, si tiene menos, alerta!
    if (balanceGas < ethers.parseEther("0.01")) {
        await enviarAlertaTelegram("⚠️ *ALERTA:* La billetera de gas se está agotando.");
        throw new Error("Fondos de gas insuficientes.");
    }
}
/**
 * Solicita la conexión con MetaMask.
 * Si tiene éxito, devuelve la dirección de la billetera.
 * Si falla o el usuario cancela, lanza una alerta temática.
 */

async function conectarMetaMask() {
    if (!window.ethereum) {
        lanzarAlertaMictlan("Billetera no detectada", "Necesitas instalar MetaMask para continuar con el ritual.");
        return null;
    }
    try {
        const cuentas = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (cuentas.length > 0) {
            const cuentaPrincipal = cuentas[0];
            console.log("Alma conectada:", cuentaPrincipal);
            return cuentaPrincipal;
        }
    } catch (error) {
        if (error.code === 4001) {
            lanzarAlertaMictlan("Conexión rechazada", "El guardián necesita acceso a tu billetera para el ritual.");
        } else {
            lanzarAlertaMictlan("Error místico", "No se pudo establecer el vínculo con MetaMask.");
            console.error(error);
        }
        return null;
    }
}

// --- DETECCIÓN GLOBAL DE DISPOSITIVO ---
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// 1. Ocultar botón de conexión al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    const btnConectar = document.getElementById('btn-conectar-metamask');
    if (isMobile && btnConectar) {
        btnConectar.style.display = 'none';
    }
});

// 2. Restringir retiros a PC
async function conectarYRetirarMetaMask(pos) {
    if (isMobile) {
        lanzarAlertaMictlan(
            "Los retiros a MetaMask son una operación de alta seguridad que solo puede realizarse desde un navegador en computadora (PC).", 
            "SANTUARIO PC REQUERIDO"
        );
        return;
    }

    if (!pos || typeof pos.montoAEnviar === 'undefined') {
        lanzarAlertaMictlan("Ritual incompleto", "No se detectó el monto a retirar.");
        return;
    }

    if (typeof window.ethers === 'undefined') {
        setTimeout(() => conectarYRetirarMetaMask(pos), 1000);
        return;
    }

    try {
        const direccion = await conectarMetaMask();
        if (!direccion) return;

        const btn = document.getElementById('btn-mostrar-retiro');
        btn.innerText = "FIRMANDO TRANSACCIÓN...";
        btn.disabled = true;

        // SG equivalentes al saldo visual (compensando el 2% de quema del contrato)
        const infoTasaRetiro = window.TASAS_ACTUALES[pos.nombre] || { tasa: 0 };
        const saldoVisual = window.tumbasConSaldo[pos.nombre] || 0;
        // Cuántos SG son equivalentes al saldo visual
        const sgBrutos = infoTasaRetiro.tasa > 0 ? (saldoVisual / infoTasaRetiro.tasa) : 0;
        // Compensar el 2% que el contrato quema automáticamente
        const sgAEnviar = sgBrutos / 0.98;

        if (sgAEnviar <= 0) {
            lanzarAlertaMictlan("No tienes saldo suficiente para retirar.", "RITUAL INCOMPLETO");
            return;
        }

        btn.innerText = "PROCESANDO...";

        const respuesta = await fetch('/api/reclamar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identidad: window.userWallet,
                wallet: direccion,
                cripto: pos.nombre,
                pasarela: 'metamask',
                sgAEnviar: sgAEnviar,
                saldoVisual: saldoVisual
            })
        });

        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            lanzarAlertaMictlan(resultado.error || "Error del servidor", "RITUAL FALLIDO");
            return;
        }

        window.tumbasConSaldo[pos.nombre] = 0;
        guardarSaldosCriptas();
        generarCementerio();

        lanzarAlertaMictlan(resultado.mensaje || "SG enviados a tu wallet.", "RITUAL COMPLETADO");
        cerrarRitual();

    } catch (err) {
        console.error(err);
        lanzarAlertaMictlan("Error", "El ritual falló.");
    } finally {
        const btn = document.getElementById('btn-mostrar-retiro');
        if (btn) {
            btn.innerText = "💰 RETIRAR A BILLETERA";
            btn.disabled = false;
        }
    }
}

async function actualizarBarraProgreso() {
    const barra = document.getElementById('barra-progreso');
    const texto = document.querySelector('p[style*="font-family"]');
    if (!barra || !texto) return;

    try {
        const res = await fetch('/api/pacto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accion: 'estado_pacto' })
        });
        
        // Si el servidor responde con error, salimos suavemente
        if (!res.ok) {
            console.warn("El inframundo no responde correctamente:", res.status);
            return;
        }

        const data = await res.json();
        
        // Verificamos que 'data' tenga lo necesario
        if (data && typeof data.actual !== 'undefined') {
            const porcentaje = (data.actual / data.limite) * 100;
            barra.style.width = porcentaje + "%";
            texto.innerText = data.actual >= 50 
                ? "PACTO FUNDADOR CERRADO" 
                : `ALMAS FUNDADORAS: ${data.actual} / ${data.limite}`;
        }
    } catch (e) {
        console.error("Fallo de conexión:", e);
    }
}