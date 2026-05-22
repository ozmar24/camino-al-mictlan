// ==================================================================
// VARIABLES GLOBALES DEL INFRAMUNDO
// ==================================================================
let retiroEnProceso = false;
let balanceUsuarioSG = parseFloat(localStorage.getItem('soulgeist_balance')) || 0; // Controlará tu balance dinámico desde Redis
let tumbaSeleccionada = null; // Almacenará la tumba de destino elegida
let ritualActivo = false; // Bloquea o desbloquea la selección de destino
let esModoRegistro = false; // Alterna el formulario tradicional de la página izquierda
if (typeof window.tumbasConSaldo === 'undefined') {
    const criptasGuardadas = localStorage.getItem('soulgeist_criptas');
window.tumbasConSaldo = criptasGuardadas ? JSON.parse(criptasGuardadas) : {}; // Guardará ejemplo: { "Solana": true, "Pepe": true }
}

// CONFIGURACIÓN DE GOOGLE (Asegúrate de cambiar esto en producción)
const GOOGLE_CLIENT_ID = "25093626964-mep6ihpq1gamn8hm59q2cf15rm8gd0ao.apps.googleusercontent.com"; 

// ==================================================================
// FASE 1 -> FASE 2: APERTURA DEL GRIMORIO ABIERTO (CORREGIDO)
// ==================================================================
function entrarAlMictlan() {
    console.log("Intentando entrar al Mictlán..."); // Para depurar en consola
    
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
    // 1. Recolección limpia utilizando las IDs exactas de tu HTML
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const btnAuth = document.getElementById('btn-auth');

    if (!emailEl || !passwordEl) {
        lanzarAlertaMictlan("Los portales de texto no se manifestaron.", "ERROR CRÍTICO");
        return;
    }

    const email = emailEl.value.trim();
    const password = passwordEl.value.trim();

    if (!email || !password) {
        lanzarAlertaMictlan("Debes completar ambos campos del pacto.", "CAMPOS INCOMPLETOS");
        return;
    }

    // === DETECCIÓN DE ACCIÓN ===
    const accionMistica = esModoRegistro ? 'registro' : 'login';

    // === NUEVO FILTRO DE SEGURIDAD PARA LA CONTRASEÑA (SOLO EN REGISTRO) ===
    if (accionMistica === 'registro') {
        // Expresión regular: Mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 símbolo/carácter especial
        const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
        
        if (!regexPassword.test(password)) {
            lanzarAlertaMictlan(
                "La llave secreta es débil. Debe contener al menos 8 caracteres, una deidad mayúscula, una minúscula y un símbolo arcano (ej: @, $, !, #, _).", 
                "LLAVE INSEGURA"
            );
            return; // Bloquea el envío si no pasa la prueba de fuego
        }
    }

    // === INICIO DEL PROCESAMIENTO VISUAL ===
    const textoOriginal = btnAuth.innerText;
    btnAuth.innerText = "PROCESANDO PACTO...";
    btnAuth.disabled = true;

    try {
        console.log(`→ Solicitando ${accionMistica} estilo Onyx para: ${email}`);

        const respuesta = await fetch('/api/pacto', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ email, password, accion: accionMistica }) 
        });

        // === CONTROL DE ERRORES AL LEER EL JSON ===
        let resultado;
        try {
            resultado = await respuesta.json();
        } catch (err) {
            console.error('Respuesta no es JSON. Status:', respuesta.status, 'Error:', err);
            const texto = await respuesta.text().catch(() => '[no body]');
            console.error('Respuesta cruda:', texto);
            lanzarAlertaMictlan("Respuesta inválida del servidor.", "FALLO DE CONEXIÓN");
            return;
        }

        console.log("Respuesta del abismo:", resultado);

        // Validamos la respuesta idéntica a Onyx (usando resultado.success)
        if (resultado.success === false) {
            lanzarAlertaMictlan(resultado.error || "Pacto rechazado.", "RITUAL RECHAZADO");
            return;
        }

        if (accionMistica === 'registro') {
            lanzarAlertaMictlan("Pacto sellado con éxito. Ahora inicia sesión.", "ALMA REGISTRADA");
            cambiarModoAuth(); // Te pasa automáticamente a la pantalla de Login
        } else {
            // Sincronización radical del LocalStorage
            window.userWallet = resultado.usuario.email;
            localStorage.setItem('soulgeist_user_email', resultado.usuario.email);
            localStorage.setItem('usuario_email', resultado.usuario.email);
            localStorage.setItem('email', resultado.usuario.email);
            
            lanzarAlertaMictlan("Bienvenido al Mictlán.", "ACCESO CONCEDIDO");
            entrarAlCampoSanto({ balanceSG: resultado.usuario.balance || 0 });
        }

    } catch (error) {
        console.error("Error crítico en manejarAuth:", error);
        lanzarAlertaMictlan("No se pudo conectar con el inframundo.", "FALLO DE CONEXIÓN");
    } finally {
        // Devolvemos siempre el botón a su estado original pase lo que pase
        btnAuth.innerText = textoOriginal;
        btnAuth.disabled = false;
    }
}


async function manejarLoginGoogle(response) {
    try {
        const res = await fetch('/api/auth-google', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ token: response.credential }) 
        });

        const datos = await res.json(); 

        if (res.ok && datos.success) {
            window.userWallet = datos.perfil.email; 
            localStorage.setItem('soulgeist_user_email', datos.perfil.email); 
            entrarAlCampoSanto({ balanceSG: datos.perfil.balanceSG }); 
        } else {
            console.error("El backend rechazó el token:", datos.error); 
        }
    } catch (error) {
        console.error("Error en la conexión con la API del Mictlán:", error); 
    }
}

function entrarAlCampoSanto(perfil) {
    const modalContrato = document.getElementById('modal-contrato');
    const cementerio = document.getElementById('campo-santo');
    const candelabro = document.querySelector('.candelabro-central');

    if (modalContrato) modalContrato.style.display = 'none';
    if (cementerio) cementerio.style.display = 'block';

    if (candelabro) {
        candelabro.style.display = 'block';
        setTimeout(() => { candelabro.style.opacity = '1'; }, 50);
    }

    // === CARGA SEGURA DEL BALANCE ===
    if (perfil && typeof perfil.balanceSG !== 'undefined') {
        balanceUsuarioSG = parseFloat(perfil.balanceSG) || 0;
    } else {
        balanceUsuarioSG = parseFloat(localStorage.getItem('soulgeist_balance')) || 0;
    }

    localStorage.setItem('soulgeist_balance', balanceUsuarioSG);

    console.log("Balance cargado:", balanceUsuarioSG);

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
        { nombre: "Ethereum", sim: "♦", color: "#627eea", top: "72%", left: "7.5%", tasa: 0.00000045, usdMinimo: 0.15 },
        { nombre: "Litecoin", sim: "Ł", color: "#00d4ff", top: "75%", left: "26.5%", tasa: 0.0012, usdMinimo: 0.15 },
        { nombre: "Pepe", sim: "🐸", color: "#45ca5d", top: "68%", left: "38%", tasa: 15000, usdMinimo: 0.15 },
        { nombre: "Solana", sim: "S", color: "#14f195", top: "64%", left: "46%", tasa: 0.0008, usdMinimo: 0.15 },
        { nombre: "Dogecoin", sim: "Ð", color: "#ba9f33", top: "61%", left: "68%", tasa: 1.5, usdMinimo: 0.15 },
        { nombre: "USDT", sim: "₮", color: "#26a17b", top: "73%", left: "77%", tasa: 0.25, usdMinimo: 0.15 },
        { nombre: "Bitcoin", sim: "₿", color: "#f7931a", top: "72%", left: "90%", tasa: 0.000002, usdMinimo: 0.15 }
    ];

    configuracion.forEach(pos => {
        const div = document.createElement('div');
        div.className = pos.especial ? 'zona-tumba alma-maestra' : 'zona-tumba';
        div.style.top = pos.top;
        div.style.left = pos.left;
        div.style.setProperty('--color-cripto', pos.color);
        div.setAttribute('data-nombre', pos.nombre);

        // LEEMOS EL SALDO REAL YA FILTRADO
        const saldoGuardado = window.tumbasConSaldo && window.tumbasConSaldo[pos.nombre] ? window.tumbasConSaldo[pos.nombre] : 0;
        const visibilidadOpacidad = saldoGuardado > 0 ? "1" : "0";
        const textoBalance = saldoGuardado.toFixed(6);

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
                const ganancia = cantidadEnviada * (pos.tasa || 0);

                // DEDUCCIÓN INMEDIATA Y SEGURA
                balanceUsuarioSG = Math.max(0, balanceUsuarioSG - cantidadEnviada);
                actualizarBalanceSoulgeist(balanceUsuarioSG);
                localStorage.setItem('soulgeist_balance', balanceUsuarioSG);

                ritualActivo = false;

                const tumbaOrigen = document.querySelector('.alma-maestra');
                const tumbaDestino = e.currentTarget;

                lanzarAlma(tumbaOrigen, tumbaDestino, pos.color, ganancia, pos, () => {
                    window.tumbasConSaldo[pos.nombre] = (window.tumbasConSaldo[pos.nombre] || 0) + ganancia;
                    localStorage.setItem('soulgeist_criptas', JSON.stringify(window.tumbasConSaldo));

                    const contenedorBalance = tumbaDestino.querySelector('.balance-proyectado');
                    if (contenedorBalance) {
                        contenedorBalance.innerText = `+${window.tumbasConSaldo[pos.nombre].toFixed(6)} ${pos.sim}`;
                        contenedorBalance.style.opacity = "1";
                    }
                    mostrarModalFusionExitosa(pos, ganancia);
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
    const campoSanto = document.getElementById('campo-santo');
    if (campoSanto) {
        campoSanto.style.filter = "blur(5px) brightness(0.4)";
    }

    const modal = document.getElementById('modal-ritual');
    if (!modal) return;

    modal.style.setProperty('--color-ritmo', pos.color || "#f7931a");
    modal.style.display = 'block';

    // Calcular saldo
    const saldoAcumulado = window.tumbasConSaldo[pos.nombre] || 0;

    document.getElementById('titulo-ritual').innerText = `COSECHA DE ${pos.nombre.toUpperCase()}`;

    window.currentCripto = pos;

    // Contenido del modal
    document.getElementById('info-ritual').innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <p style="color: #fff; font-size: 19px; margin: 10px 0;">
                Saldo disponible: 
                <b style="color: ${pos.color};">${saldoAcumulado.toFixed(8)} ${pos.sim}</b>
            </p>
        </div>

        <div style="margin-bottom: 18px;">
            <label style="color:#bbb; font-size: 14px; display:block; margin-bottom:6px;">
                Portal de retiro:
            </label>
            <select id="pasarela-select" onchange="adaptarPlaceholderPasarela('${pos.nombre}')" 
                    style="width: 100%; background:#111; color:#fff; border:2px solid ${pos.color}; padding:12px; border-radius:6px; font-size:15px;">
                
                <option value="bitso">Bitso</option>
                <option value="coinbase">Coinbase</option>
                <option value="binance">Binance</option>
            </select>
        </div>

        <div>
            <input type="text" id="wallet-input" placeholder="Ingresa tu dirección o correo..." 
                   style="width: 100%; background:#000; color:#fff; border:2px solid #555; padding:14px; text-align:center; border-radius:6px; font-size:15px;">
        </div>
    `;

    // Botones
    const botones = document.querySelector('.botones-exchange');
    if (botones) {
        botones.innerHTML = `
            <button id="btn-cosecha-enviar" class="pentaculo-cursor" 
                    style="background:${pos.color}; color:#000; padding:12px 30px; margin-right:10px; font-weight:bold;">
                TRANSMUTAR ALMA
            </button>
            <button id="btn-cosecha-cancelar" class="pentaculo-cursor" 
                    style="background:#222; color:#fff; padding:12px 30px;">
                VOLVER A LAS SOMBRAS
            </button>
        `;

        document.getElementById('btn-cosecha-enviar').onclick = procesarRetiro;
        document.getElementById('btn-cosecha-cancelar').onclick = cerrarRitual;
    }
}


function adaptarPlaceholderPasarela(criptoId) {
    const pasarela = document.getElementById('pasarela-select').value;
    const input = document.getElementById('wallet-input');
    if (!input) return;

    if (pasarela === 'bitso') {
        input.placeholder = "Dirección Bitso (BTC, USDT, etc.)";
    } else {
        input.placeholder = `Dirección de ${criptoId} en ${pasarela.toUpperCase()}`;
    }
}

function procesarRetiro() {
    const inputWallet = document.getElementById('wallet-input');
    const selectPasarela = document.getElementById('pasarela-select');
   
    if (!inputWallet) return;

    const walletDestino = inputWallet.value.trim();

    if (walletDestino.length < 5) {
        lanzarAlertaMictlan("Falta la dirección o correo de destino.", "RITUAL INCOMPLETO");
        return;
    }

    const identidadUsuario = localStorage.getItem('soulgeist_user_email') || window.userWallet;

    if (!identidadUsuario) {
        lanzarAlertaMictlan("Tu alma no está autenticada.", "ERROR DE IDENTIDAD");
        cerrarRitual();
        return;
    }

    const pasarelaElegida = selectPasarela ? selectPasarela.value : "faucetpay";
    const nombreCripto = window.currentCripto ? window.currentCripto.nombre : "Bitcoin";

    cerrarRitual();

    procesarCosecha(identidadUsuario, walletDestino, nombreCripto, pasarelaElegida);
}

// === AGREGAMOS 'saldoEnSG' COMO QUINTO PARÁMETRO ===
async function procesarCosecha(identidad, walletUsuario, criptoSeleccionada, pasarela) {
    try {
        console.log("🔄 Enviando reclamo:", { identidad, walletUsuario, cripto: criptoSeleccionada, pasarela });

        const saldoCripto = window.tumbasConSaldo[criptoSeleccionada] || 0;

        const respuesta = await fetch('/api/reclamar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identidad: identidad,
                wallet: walletUsuario,
                cripto: criptoSeleccionada,
                pasarela: pasarela,
                cantidadRetiro: saldoCripto,
                cantidadSG: saldoCripto   // Por si el backend lo usa
            })
        });

        console.log("Status:", respuesta.status);

        const resultado = await respuesta.json();
        console.log("Respuesta backend:", resultado);

        if (!respuesta.ok) {
            lanzarAlertaMictlan(resultado.error || "Error del servidor", "ADVERTENCIA MORTAL");
            return;
        }

        // Éxito
        if (resultado.balanceAlmas !== undefined) {
            balanceUsuarioSG = resultado.balanceAlmas;
            localStorage.setItem('soulgeist_balance', balanceUsuarioSG);

            const selector = document.querySelector('.alma-maestra .balance-actual');
            if (selector) selector.innerText = `Poder: ${balanceUsuarioSG} SG`;

            generarCementerio();
        }

        lanzarAlertaMictlan(resultado.mensaje || "Cosecha realizada", "ÉXITO");

    } catch (error) {
        console.error("Error completo:", error);
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
// ABSORCIÓN DE VIDEOS MONETIZADOS (RECLAMOS DE ENERGÍA)
// ==================================================================
async function videoCompletado() {
    if (!window.userWallet) {
        lanzarAlertaMictlan("Debes ligar tu wallet al Mictlán antes de absorber energía de los videos.", "SANTUARIO SIN DUEÑO");
        return;
    }

    try {
        const respuesta = await fetch('/api/acumular-sg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: window.userWallet })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            lanzarAlertaMictlan(resultado.error || "Los espíritus bloquearon esta ofrenda.", "CANDADO DEL TIEMPO");
            return;
        }

        // === CORRECCIÓN DE SUMA EXACTA (BUG 2 SOLUCIONADO) ===
        // Tomamos el valor exacto enviado por el servidor de Redis
        balanceUsuarioSG = parseFloat(resultado.nuevoBalance);

        // Guardamos la persistencia en el navegador de manera limpia
        localStorage.setItem('soulgeist_balance', balanceUsuarioSG);

        // Actualizamos de manera segura el contenedor superior izquierdo (si existe en tu HTML)
        const balanceIzquierdo = document.getElementById('balance-izquierdo');
        if (balanceIzquierdo) {
            balanceIzquierdo.innerText = balanceUsuarioSG.toFixed(4);
        }

        // Actualizar el texto del Alma Maestra central en vivo
        actualizarBalanceSoulgeist(balanceUsuarioSG);

        // Volvemos a pintar el cementerio para asegurar que las criptas mantengan su saldo sin alterarse
        generarCementerio();
        
        lanzarAlertaMictlan(resultado.mensaje || "Energía absorbida correctamente", "ENERGÍA ABSORBIDA");

    } catch (error) {
        console.error("Error en la transmisión de almas:", error);
        lanzarAlertaMictlan("El portal no pudo registrar tu visualización. Revisa tu conexión con el inframundo.", "FALLO DE RED");
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

    document.getElementById('final-si').onclick = () => { window.location.href = "https://void-onyx-web.vercel.app"; }; 
    document.getElementById('final-no').onclick = () => { modalFinal.remove(); overlayFinal.remove(); }; 
}

function lanzarAlertaMictlan(mensaje, titulo = "¡ADVERTENCIA MORTAL!") {
    document.getElementById('alerta-titulo').innerText = titulo; 
    document.getElementById('alerta-mensaje').innerText = mensaje; 
    const modal = document.getElementById('alerta-mictlan'); 
    if(modal) modal.style.display = 'flex'; 
}

function cerrarAlertaMictlan() {
    const modal = document.getElementById('alert-mictlan');
    const modalAlterno = document.getElementById('alerta-mictlan');
    if (modal) modal.style.display = 'none';
    if (modalAlterno) modalAlterno.style.display = 'none';
}

function mostrarPergamino(tipo) {
    const pantalla = document.getElementById('pantalla-codice'); 
    const titulo = document.getElementById('codice-titulo'); 
    const cuerpo = document.getElementById('codice-cuerpo'); 

    if (tipo === 'leyes') {
        titulo.innerText = "DERECHOS ETERNOS"; 
        cuerpo.innerHTML = "EL CONTRATO ES DE POR VIDA.<br>LOS RECLAMOS REQUIEREN SACRIFICIO.<br>EL MICTLÁN NO OLVIDA."; 
    } else if (tipo === 'alianzas') {
        titulo.innerText = "ALIANZAS OSCURAS"; 
        cuerpo.innerHTML = "<br><br>• FAUCETPAY<br>• BITSO<br>• COINBASE<br>• BINANCE"; 
    }

    if (pantalla) {
        pantalla.style.display = 'flex'; 
        setTimeout(() => { pantalla.style.opacity = '1'; }, 10); 
    }
}

function cerrarCodice() { document.getElementById('pantalla-codice').style.display = 'none'; } 

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
    const mensaje = inputMensaje ? inputMensaje.value.trim() : ""; 
    const usuarioActivo = localStorage.getItem('soulgeist_user_email') || "Alma Anónima"; 

    if (!mensaje) {
        lanzarAlertaMictlan("No puedes invocar a las deidades con un pergamino vacío.", "SUSURRO VACÍO"); 
        return; 
    }

    console.log(`Invocación de soporte recibida de [${usuarioActivo}]: ${mensaje}`); 
    
    lanzarAlertaMictlan("Tu mensaje ha cruzado el umbral. Las deidades responderán pronto.", "INVOCACIÓN ENVIADA"); 
    if (inputMensaje) inputMensaje.value = "";  
    cerrarOraculo(); 
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
            entrarAlCampoSanto({ balanceSG: 0 }); 
        }
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
    
    // 1. Descontamos localmente de inmediato
    balanceUsuarioSG -= cantidad;
    actualizarBalanceSoulgeist(balanceUsuarioSG);
    localStorage.setItem('soulgeist_balance', balanceUsuarioSG);

    const ganancia = cantidad * (pos.tasa || 0);

    cerrarRitual(); 

    // === ENVIAR EL DESCUENTO REAL A UPSTASH REDIS ===
    // === ENVIAR ACTUALIZACIÓN DE BALANCE A UPSTASH REDIS ===
    if (window.userWallet) {
        try {
            // CORRECCIÓN MATEMÁTICA CRÍTICA:
            // Restamos la cantidad transmutada del balance general ANTES de enviarlo a Redis
            balanceUsuarioSG = balanceUsuarioSG - cantidad;
            if (balanceUsuarioSG < 0) balanceUsuarioSG = 0; // Evita que baje de cero por seguridad

            // Actualizamos inmediatamente el localStorage para que el saldo persista al refrescar
            localStorage.setItem('soulgeist_balance', balanceUsuarioSG);
            
            console.log(`[RITUAL] Notificando descuento a Redis. Quedan reales: ${balanceUsuarioSG}`);
            
            const res = await fetch('/api/acumular-sg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    wallet: window.userWallet, 
                    nuevoBalance: balanceUsuarioSG, // Ahora sí va el valor restado (ej: 0)
                    accion: 'descontar_ritual'
                })
            });
            
            const datosServidor = await res.json();
            console.log("Servidor responde:", datosServidor);

        } catch (error) {
            console.error("Fallo de conexión al restar saldo en Redis:", error);
        }
    }

    // 2. Ejecutar animación del alma volando
    lanzarAlma(tumbaOrigen, tumbaDestino, pos.color, ganancia, pos, () => {
        window.tumbasConSaldo[pos.nombre] = (window.tumbasConSaldo[pos.nombre] || 0) + ganancia;
        localStorage.setItem('soulgeist_criptas', JSON.stringify(window.tumbasConSaldo));
        
        const contenedorBalance = tumbaDestino.querySelector('.balance-proyectado');
        if (contenedorBalance) {
            contenedorBalance.innerText = `+${window.tumbasConSaldo[pos.nombre].toFixed(6)} ${pos.sim}`;
            contenedorBalance.style.opacity = "1";
        }

        mostrarModalFusionExitosa(pos, ganancia);
    });
}