
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
const DOMINIO_VERCEL = 'https://camino-al-mictlan.vercel.app';

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

    const accion = esModoRegistro ? 'registro' : 'login';

    if (accion === 'registro') {
        const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
        if (!regexPassword.test(password)) {
            lanzarAlertaMictlan("La llave secreta es débil. Debe contener al menos 8 caracteres, mayúscula, minúscula y un símbolo.", "LLAVE INSEGURA");
            return;
        }
    }

    const textoOriginal = btnAuth.innerText;
    btnAuth.innerText = "PROCESANDO PACTO...";
    btnAuth.disabled = true;

    try {
        const respuesta = await fetch(`${DOMINIO_VERCEL}/api/pacto`, {
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
            lanzarAlertaMictlan("Pacto sellado con éxito. Ahora inicia sesión.", "ALMA REGISTRADA");
            cambiarModoAuth();
        } else {
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
        const DOMINIO_VERCEL = 'https://camino-al-mictlan.vercel.app'; 

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

                lanzarAlma(tumbaOrigen, tumbaDestino, pos.color, cantidadEnviada * (pos.tasa || 0), pos, async () => {
    window.tumbasConSaldo[pos.nombre] = (window.tumbasConSaldo[pos.nombre] || 0) + (cantidadEnviada * (pos.tasa || 0));
    
guardarSaldosCriptas();

    // === ACTUALIZACIÓN CRÍTICA EN REDIS ===
    await descontarBalanceEnRedis(cantidadEnviada);



    generarCementerio();
    mostrarModalFusionExitosa(pos, cantidadEnviada * (pos.tasa || 0));
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

    info.innerHTML = `
        <div style="text-align: center; margin: 20px 0;">
            <p style="color: #aaa;">Saldo acumulado en esta tumba:</p>
            <h2 style="color: ${pos.color}; font-size: 28px; text-shadow: 0 0 10px ${pos.color};">
                ${saldoActual.toFixed(8)} ${pos.sim}
            </h2>
            <p style="color: #666; font-size: 12px; margin-top: 10px;">
                ¿Qué deseas hacer con esta energía acumulada?
            </p>
            
            <!-- Campo para la wallet, solo se usa si decide retirar -->
            <div id="seccion-retiro" style="display:none; margin-top: 20px;">
                <select id="pasarela-select" onchange="adaptarPlaceholderPasarela('${pos.nombre}')" 
                        style="width: 80%; padding: 10px; background: #111; border: 1px solid ${pos.color}; color: #fff; margin-bottom: 10px;">
                    <option value="bitso">BITSO (Recomendado)</option>
                    <option value="binance">BINANCE</option>
                    <option value="coinbase">COINBASE</option>
                    ${pos.nombre === 'Bitcoin' ? '<option value="bitso_lightning">BITSO LIGHTNING (Instantáneo)</option>' : ''}
                </select>
                <input type="text" id="wallet-input" placeholder="Dirección de destino" 
                       style="width: 80%; padding: 10px; background: #000; border: 1px solid ${pos.color}; color: #fff; text-align: center;">
            </div>
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
    document.getElementById('btn-mostrar-retiro').onclick = function() {
        const seccion = document.getElementById('seccion-retiro');
        if (seccion.style.display === 'none') {
            seccion.style.display = 'block';
            this.innerText = "CONFIRMAR RETIRO";
            this.onclick = procesarRetiro; // Al segundo click, procesa el retiro
        }
    };

    modal.style.display = 'block';
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

    // ELIMINAMOS CUALQUIER VERIFICACIÓN DE VIDEO AQUÍ
    // Retiro directo a backend
    const identidadUsuario = localStorage.getItem('soulgeist_user_email') || window.userWallet;
    const pasarelaElegida = selectPasarela ? selectPasarela.value : "bitso";
    const nombreCripto = window.currentCripto ? window.currentCripto.nombre : "Bitcoin";

    cerrarRitual();
    
    // Llamada directa a tu API de reclamos
    procesarCosecha(identidadUsuario, walletDestino, nombreCripto, pasarelaElegida);
}

// === AGREGAMOS 'saldoEnSG' COMO QUINTO PARÁMETRO ===
async function procesarCosecha(identidad, walletUsuario, criptoSeleccionada, pasarela) {
    try {
        console.log("🔄 Enviando reclamo:", { identidad, walletUsuario, cripto: criptoSeleccionada, pasarela });

        const saldoCripto = window.tumbasConSaldo[criptoSeleccionada] || 0;

        console.log(`Saldo real de ${criptoSeleccionada}: ${saldoCripto}`);

        const respuesta = await fetch('/api/reclamar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
    identidad: identidad,
    wallet:    walletUsuario,
    cripto:    criptoSeleccionada,
    pasarela:  pasarela
            })
        });

        const resultado = await respuesta.json();
        console.log("Respuesta del backend:", resultado);

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
        }

        if (window.tumbasConSaldo[criptoSeleccionada] !== undefined) {
            window.tumbasConSaldo[criptoSeleccionada] = 0;
            guardarSaldosCriptas();
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
// ABSORCIÓN DE VIDEOS MONETIZADOS (RECLAMOS DE ENERGÍA)
// ==================================================================
// ==================================================================
// UNITY ADS - MOSTRAR VIDEO Y PROCESAR RECOMPENSA
// ==================================================================
function mostrarVideoUnityAds() {
    if (!window.userWallet) {
        lanzarAlertaMictlan("Debes ligar tu wallet antes de absorber energía.", "SANTUARIO SIN DUEÑO");
        return;
    }

    console.log("🎬 Intentando mostrar video de Unity Ads...");
    console.log("Unity Ads inicializado?", window.unityAdsInitialized);
    console.log("window.unityads disponible?", typeof window.unityads !== 'undefined');

    // Intentar mostrar video real
    if (window.unityAdsInitialized && typeof window.unityads !== 'undefined') {
        console.log("✅ Mostrando video real de Unity Ads...");
        
        window.unityads.show('Rewarded_Android', {
            onComplete: function() {
                console.log("✅ Video completado correctamente");
                videoCompletado();
            },
            onSkipped: function() {
                console.log("⏭️ Usuario saltó el video");
                lanzarAlertaMictlan("Los espíritus no recompensarán tu prisa.", "VIDEO SALTADO");
            },
            onError: function(error) {
                console.error("❌ Error en video:", error);
                // Fallback: simular video
                lanzarAlertaMictlan("Transmisión en progreso... Espera 3 segundos", "ESPERANDO ABISMO");
                setTimeout(videoCompletado, 3000);
            }
        });
    } else {
        // Fallback: simular video si Unity Ads no está disponible
        console.warn("❌ Unity Ads no disponible, simulando video...");
        lanzarAlertaMictlan("Transmisión en progreso... Espera 3 segundos", "ESPERANDO ABISMO");
        setTimeout(videoCompletado, 3000);
    }
}
async function videoCompletado() {
    if (!window.userWallet) {
        lanzarAlertaMictlan("Debes ligar tu wallet antes de absorber energía.", "SANTUARIO SIN DUEÑO");
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

        balanceUsuarioSG = parseFloat(resultado.nuevoBalance) || balanceUsuarioSG;
        localStorage.setItem('soulgeist_balance', balanceUsuarioSG);

        actualizarBalanceSoulgeist(balanceUsuarioSG);
        generarCementerio();

        lanzarAlertaMictlan(resultado.mensaje || `+10 SG absorbidos`, "ENERGÍA ABSORBIDA");

    } catch (error) {
        console.error("Error en video:", error);
        lanzarAlertaMictlan("No se pudo conectar con el inframundo.", "FALLO DE RED");
    }
}

function videoSaltado() {
    lanzarAlertaMictlan("Los espíritus no recompensarán tu prisa.", "VIDEO SALTADO");
}

function errorVideo(error) {
    console.error("Error en video de Unity Ads:", error);
    lanzarAlertaMictlan("Fallo en la transmisión astral.", "ERROR DE VIDEO");
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

// --- FUNCIONES DE CÓDICES (MEJORADO) ---
// ====================== MENÚ PRINCIPAL DE LEYES ======================
function mostrarPergamino(tipo) {
    const pantalla = document.getElementById('pantalla-codice');
    const titulo = document.getElementById('codice-titulo');
    const cuerpo = document.getElementById('codice-cuerpo');
    const botonCerrar = document.querySelector('.boton-cerrar-codice');

    if (tipo === 'leyes') {
        titulo.innerText = "LEYES DEL MICTLÁN";
        cuerpo.innerHTML = `
            <p style="text-align:center; color:#ccaaaa; margin-bottom:25px;">Elige la sabiduría que deseas consultar:</p>
            
            <button onclick="mostrarSubLey('privacidad')" class="btn-subley">Seguridad y Privacidad</button>
            <button onclick="mostrarSubLey('reglas')" class="btn-subley">Reglas Eternas</button>
            <button onclick="mostrarSubLey('prohibiciones')" class="btn-subley">Prohibiciones del Inframundo</button>
            <button onclick="mostrarSubLey('consecuencias')" class="btn-subley">Consecuencias</button>
        `;

        // Botón principal de Leyes
        if (botonCerrar) {
            botonCerrar.innerHTML = '[ CERRAR PACTO ]';
            botonCerrar.onclick = cerrarCodice;
        }
    } 
    else if (tipo === 'alianzas') {
        // ... tu código actual de alianzas
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
    const botonCerrar = document.querySelector('.boton-cerrar-codice');

    // Cambiamos el botón a "REGRESAR A LEYES"
    if (botonCerrar) {
        botonCerrar.innerHTML = '[ REGRESAR A LEYES ]';
        botonCerrar.onclick = () => mostrarPergamino('leyes');
    }

    if (seccion === 'privacidad') {
        titulo.innerText = "VELO DE PRIVACIDAD";
        cuerpo.innerHTML = `<p>No recopilamos datos sensibles como nombre completo, dirección física, teléfono o información bancaria.<br><br>Únicamente almacenamos wallet y correo para el funcionamiento del portal.</p>`;
    } else if (seccion === 'reglas') {
        titulo.innerText = "REGLAS ETERNAS";
        cuerpo.innerHTML = `<p>Queda prohibido el uso de VPN, proxies o múltiples cuentas.<br>Todo intento de manipulación será considerado traición.</p>`;
    } else if (seccion === 'prohibiciones') {
        titulo.innerText = "PROHIBICIONES DEL INFRAMUNDO";
        cuerpo.innerHTML = `<p>Actividades fraudulentas o distribución de información falsa serán castigadas.</p>`;
    } else if (seccion === 'consecuencias') {
        titulo.innerText = "CONSECUENCIAS";
        cuerpo.innerHTML = `<p>La violación de estas leyes puede resultar en la suspensión permanente de la cuenta y la quema de recompensas.<br>El Mictlán no olvida.</p>`;
    }
}

function mostrarSubLey(seccion) {
    const titulo = document.getElementById('codice-titulo');
    const cuerpo = document.getElementById('codice-cuerpo');

    if (seccion === 'privacidad') {
        titulo.innerText = "VELO DE PRIVACIDAD";
        cuerpo.innerHTML = `<p>No recopilamos datos sensibles como nombre completo, dirección física, teléfono o información bancaria.<br>Únicamente almacenamos wallet y correo para el funcionamiento del portal.</p>`;
    } 
    else if (seccion === 'reglas') {
        titulo.innerText = "REGLAS ETERNAS";
        cuerpo.innerHTML = `<p>Queda prohibido el uso de VPN, proxies o múltiples cuentas.<br>Todo intento de manipulación será considerado traición.</p>`;
    } 
    else if (seccion === 'prohibiciones') {
        titulo.innerText = "PROHIBICIONES DEL INFRAMUNDO";
        cuerpo.innerHTML = `<p>Actividades fraudulentas o distribución de información falsa serán castigadas.</p>`;
    } 
    else if (seccion === 'consecuencias') {
        titulo.innerText = "CONSECUENCIAS";
        cuerpo.innerHTML = `<p>La violación de estas leyes puede resultar en la suspensión permanente de la cuenta y quema de recompensas.<br>El Mictlán no olvida.</p>`;
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

// ❌ BUSCA ESTO:
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
    
    // 1. Descontamos localmente UNA SOLA VEZ
    balanceUsuarioSG = balanceUsuarioSG - cantidad; 
    if (balanceUsuarioSG < 0) balanceUsuarioSG = 0;

    actualizarBalanceSoulgeist(balanceUsuarioSG);
    localStorage.setItem('soulgeist_balance', balanceUsuarioSG);

    const ganancia = cantidad * (pos.tasa || 0);
    cerrarRitual(); 

   if (window.userWallet) {
        try {
            // AQUÍ ES DONDE ESTABA EL ERROR: 
            // Ya no restamos de nuevo, simplemente enviamos el balanceUsuarioSG que ya restamos arriba.
            
            console.log(`[RITUAL] Notificando descuento a Redis. Quedan: ${balanceUsuarioSG}`);
            
            await fetch('/api/acumular-sg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    wallet: window.userWallet, 
                    nuevoBalance: balanceUsuarioSG, 
                    accion: 'descontar_ritual'
                })
            });
        } catch (error) {
            console.error("Fallo de conexión al restar saldo en Redis:", error);
        }
    }

    lanzarAlma(tumbaOrigen, tumbaDestino, pos.color, ganancia, pos, () => {
        const keyCriptas = `soulgeist_criptas_${window.userWallet || 'anonimo'}`;
        window.tumbasConSaldo[pos.nombre] = (window.tumbasConSaldo[pos.nombre] || 0) + ganancia;
        localStorage.setItem(keyCriptas, JSON.stringify(window.tumbasConSaldo));
        generarCementerio();
        mostrarModalFusionExitosa(pos, ganancia);
    });
}


// ======================== SINCRONIZACIÓN DE BALANCE ========================
// Reemplaza tu función actual por esta versión para depurar:
async function sincronizarBalanceConRedis() {
    if (!window.userWallet) return 0;

    try {
        const emailLimpio = window.userWallet.toLowerCase().trim();
        
        // Pon aquí tu dominio real de Vercel
        const DOMINIO_VERCEL = 'https://camino-al-mictlan.vercel.app'; 
        
        // Modificado a URL absoluta:
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
        window.tumbasConSaldo = { "Soulgeist": 0, "Ethereum": 0, "Litecoin": 0, "Pepe": 0, "Solana": 0, "Dogecoin": 0, "USDT": 0, "Bitcoin": 0 };
        console.log("Nuevo usuario: criptas en cero");
        return;
    }

    const key = `soulgeist_criptas_${window.userWallet}`;
    const guardados = localStorage.getItem(key);
    
    if (guardados) {
        window.tumbasConSaldo = JSON.parse(guardados);
        console.log(`✅ Criptas cargadas para ${window.userWallet}`);
    } else {
        window.tumbasConSaldo = { "Soulgeist": 0, "Ethereum": 0, "Litecoin": 0, "Pepe": 0, "Solana": 0, "Dogecoin": 0, "USDT": 0, "Bitcoin": 0 };
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
    const POLYGON_CHAIN_ID = '0x89'; // Hexadecimal para 137 (Polygon Mainnet)

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