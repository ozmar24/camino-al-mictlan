// ==================================================================
// VARIABLES GLOBALES DEL INFRAMUNDO
// ==================================================================
let retiroEnProceso = false;
// Inicializar balanceUsuarioSG SIN localStorage aquí. Lo cargaremos desde Redis.
let balanceUsuarioSG = 0; 
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
// ... (entrarAlMictlan y inicializarBotonGoogle permanecen igual) ...

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
        tagline.innerText = "REGISTRO DE ALMAS"; // Debería ser "ACCESO DE ALMAS" o similar si no es registro
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

    if (!emailEl || !passwordEl || !btnAuth) {
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
            lanzarAlertaMictlan(
                "La llave secreta es débil. Debe contener al menos 8 caracteres, una mayúscula, una minúscula y un símbolo.",
                "LLAVE INSEGURA"
            );
            return;
        }
    }

    const textoOriginal = btnAuth.innerText;
    btnAuth.disabled = true;
    btnAuth.innerText = "PROCESANDO PACTO...";

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
            lanzarAlertaMictlan("Pacto sellado con éxito. Ahora inicia sesión.", "ALMA REGISTRADA");
            cambiarModoAuth();
            return;
        }

        window.userWallet = resultado.usuario.email;
        localStorage.setItem('soulgeist_user_email', resultado.usuario.email);

        await sincronizarBalanceConRedis();
        entrarAlCampoSanto({ balanceSG: balanceUsuarioSG });

    } catch (error) {
        console.error("Error crítico en manejarAuth:", error);
        lanzarAlertaMictlan("No se pudo conectar con el inframundo.", "FALLO DE CONEXIÓN");
    } finally {
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
            // Tras el login de Google, sincronizamos el balance
            await sincronizarBalanceConRedis();
            entrarAlCampoSanto({ balanceSG: balanceUsuarioSG }); 
        } else {
            console.error("El backend rechazó el token:", datos.error); 
            lanzarAlertaMictlan(datos.error || "Fallo al autenticar con Google.", "ERROR GOOGLE");
        }
    } catch (error) {
        console.error("Error en la conexión con la API del Mictlán:", error); 
        lanzarAlertaMictlan("No se pudo conectar con el servidor de Google.", "FALLO DE RED");
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

    // === CARGA PRIORITARIA DESDE REDIS / LOCALSTORAGE ===
    // El balanceUsuarioSG ya debería estar actualizado por sincronizarBalanceConRedis()
    // Si perfil.balanceSG existe, es porque vino de un login directo (no de Redis),
    // pero idealmente siempre vendrá de Redis a través de sincronizarBalanceConRedis.
    if (perfil && typeof perfil.balanceSG !== 'undefined' && perfil.balanceSG !== 0) {
         balanceUsuarioSG = parseFloat(perfil.balanceSG) || 0;
    }
    // Si el perfil no tiene balance, o es cero, garantizamos que usamos lo de localStorage
    // (que a su vez debería haber sido sincronizado con Redis)
    if (balanceUsuarioSG === 0) {
        balanceUsuarioSG = parseFloat(localStorage.getItem('soulgeist_balance')) || 0;
    }

    // GUARDA EL BALANCE FINALIZADO EN localStorage Y EN EL OBJETO GLOBAL
    localStorage.setItem('soulgeist_balance', balanceUsuarioSG);
    
    console.log("=== BALANCE CARGADO AL ENTRAR ===", balanceUsuarioSG);

    // Actualizar el display visual del balance de SG si existe
    actualizarBalanceSoulgeist(balanceUsuarioSG);

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

    modal.style.display = 'block';
    if (titulo) titulo.innerText = "CANALIZACIÓN DE SOULGEIST";
    
    if (info) {
        // Muestra el balance actual de SG CORRECTAMENTE
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

            window.cantidadParaRitual = cantidad;
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

    const criptasExistentes = localStorage.getItem('soulgeist_criptas');
    if (!criptasExistentes) {
        window.tumbasConSaldo = {
            "Soulgeist": 0, "Ethereum": 0, "Litecoin": 0, "Pepe": 0,
            "Solana": 0, "Dogecoin": 0, "USDT": 0, "Bitcoin": 0
        };
        localStorage.setItem('soulgeist_criptas', JSON.stringify(window.tumbasConSaldo));
    } else if (!window.tumbasConSaldo || Object.keys(window.tumbasConSaldo).length === 0) {
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

        const saldoGuardado = window.tumbasConSaldo && window.tumbasConSaldo[pos.nombre] ? window.tumbasConSaldo[pos.nombre] : 0;
        const visibilidadOpacidad = saldoGuardado > 0 ? "1" : "0";
        const textoBalance = saldoGuardado.toFixed(6);

        if (pos.especial) {
            div.innerHTML = `
                <div class="sigilo-soulgeist"></div>
                <div class="nombre-cripto">Soulgeist</div>
                <div class="balance-actual" id="balance-soulgeist">Poder: ${balanceUsuarioSG.toFixed(2)} SG</div>
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

                // Utilizamos la cantidad predefinida o el balance total si no se especificó
                const cantidadEnviada = window.cantidadParaRitual || balanceUsuarioSG;
                
                // *** LLAMAMOS A LA NUEVA FUNCIÓN PARA TRANSFERENCIA REAL ***
                iniciarTransferenciaElegida(pos, cantidadEnviada, () => {
                    // Este callback se ejecuta DESPUÉS de que la transferencia se haya procesado en backend y frontend
                    // Actualizamos el saldo visual de la cripta si se completó con éxito
                    const contenedorBalance = tumbaDestino.querySelector('.balance-proyectado');
                    if (contenedorBalance) {
                        contenedorBalance.innerText = `+${window.tumbasConSaldo[pos.nombre].toFixed(6)} ${pos.sim}`;
                        contenedorBalance.style.opacity = "1";
                    }
                    // Mostramos el modal de éxito de fusión
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
    const campoSanto = document.getElementById('campo-santo');
    if (campoSanto) {
        campoSanto.style.filter = "blur(5px) brightness(0.4)";
    }

    const modal = document.getElementById('modal-ritual');
    if (!modal) return;

    modal.style.setProperty('--color-ritmo', pos.color || "#f7931a");
    modal.style.display = 'block';

    const saldoAcumulado = window.tumbasConSaldo[pos.nombre] || 0;

    document.getElementById('titulo-ritual').innerText = `COSECHA DE ${pos.nombre.toUpperCase()}`;

    window.currentCripto = pos;

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

    // *** LLAMAMOS A LA FUNCIÓN DE PROCESAMIENTO REAL CON LOS PARÁMETROS ***
    procesarCosecha(identidadUsuario, walletDestino, nombreCripto, pasarelaElegida);
}

// === ESTA FUNCIÓN ES LA QUE SE COMUNICA CON TU BACKEND PARA RETIRAR ***
async function procesarCosecha(identidad, walletUsuario, criptoSeleccionada, pasarela) {
    try {
        console.log("🔄 Enviando reclamo:", { identidad, walletUsuario, cripto: criptoSeleccionada, pasarela });

        const saldoCripto = window.tumbasConSaldo[criptoSeleccionada] || 0;
        const saldoSG = balanceUsuarioSG; // Usamos el balance actual del frontend

        const respuesta = await fetch('/api/reclamar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identidad: identidad,
                wallet: walletUsuario,
                cripto: criptoSeleccionada,
                pasarela: pasarela,
                cantidadRetiro: saldoCripto, // Cantidad de la cripto a retirar
                cantidadSG: saldoSG // El balance de SG que *actualmente* tienes en el frontend
            })
        });

        console.log("Status:", respuesta.status);

        const resultado = await respuesta.json();
        console.log("Respuesta backend:", resultado);

        if (!respuesta.ok) {
            // Si el backend falla al retirar la cripto, NO actualizamos nada en el frontend
            // y mostramos el error.
            lanzarAlertaMictlan(resultado.error || "Error del servidor al procesar el retiro.", "ADVERTENCIA MORTAL");
            return;
        }

        // --- SI EL RETIRO DE CRIPTO FUE EXITOSO EN EL BACKEND ---
        // 1. Actualizamos el balance de SG en el backend (Redis)
        //    Asumimos que la API '/api/reclamar' devuelve el nuevo balance de SG correcto tras el retiro.
        if (resultado.balanceAlmas !== undefined) {
            const nuevoBalanceSG = parseFloat(resultado.balanceAlmas);
            balanceUsuarioSG = nuevoBalanceSG; // Actualizamos la variable global
            localStorage.setItem('soulgeist_balance', balanceUsuarioSG); // Actualizamos localStorage
            actualizarBalanceSoulgeist(balanceUsuarioSG); // Actualizamos la UI
            console.log(`[RECLAMO] Balance de SG actualizado tras retiro de ${criptoSeleccionada}: ${balanceUsuarioSG}`);
        } else {
            console.warn("La respuesta de /api/reclamar no incluyó 'balanceAlmas'. No se actualizó el SG en frontend.");
        }

        // 2. Limpiamos el saldo de la cripta en el frontend y localStorage
        if (window.tumbasConSaldo[criptoSeleccionada] !== undefined) {
            window.tumbasConSaldo[criptoSeleccionada] = 0; // Establecemos a cero en el frontend
            localStorage.setItem('soulgeist_criptas', JSON.stringify(window.tumbasConSaldo)); // Guardamos en localStorage
            // GenerarCementerio() ya refrescará la UI con el saldo a 0
            generarCementerio(); 
        }

        // 3. Mensaje de éxito
        lanzarAlertaMictlan(resultado.mensaje || `Retiro de ${criptoSeleccionada} realizado con éxito.`, "ÉXITO");

    } catch (error) {
        console.error("Error completo en procesarCosecha:", error);
        lanzarAlertaMictlan("No se pudo conectar con el inframundo para el reclamo.", "FALLO DE CONEXIÓN");
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
        lanzarAlertaMictlan("Debes ligar tu wallet antes de absorber energía.", "SANTUARIO SIN DUEÑO");
        return;
    }

    try {
        // *** CAMBIO CLAVE: La API /api/acumular-sg ahora DEBE sumar al balance existente en Redis ***
        const respuesta = await fetch('/api/acumular-sg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: window.userWallet }) // Solo se envía la wallet, la API suma 10 SG
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            lanzarAlertaMictlan(resultado.error || "Los espíritus bloquearon esta ofrenda.", "CANDADO DEL TIEMPO");
            return;
        }

        // --- ACTUALIZAMOS EL BALANCE EN EL FRONTEND DESDE LA RESPUESTA DEL BACKEND ---
        // Es CRUCIAL que el backend devuelva el nuevo balance TOTAL correcto.
        if (resultado.nuevoBalance !== undefined) {
            balanceUsuarioSG = parseFloat(resultado.nuevoBalance); // Sobreescribimos el balance global
            localStorage.setItem('soulgeist_balance', balanceUsuarioSG); // Actualizamos localStorage
            actualizarBalanceSoulgeist(balanceUsuarioSG); // Actualizamos la UI
            generarCementerio(); // Regeneramos el cementerio para mostrar el nuevo balance
            
            lanzarAlertaMictlan(resultado.mensaje || `+10 SG absorbidos`, "ENERGÍA ABSORBIDA");
        } else {
            console.warn("La respuesta de /api/acumular-sg no incluyó 'nuevoBalance'. El balance en frontend puede no estar actualizado.");
            // Como fallback, podrías sumar 10 al balance actual si el backend falla en devolver el total:
            // balanceUsuarioSG += 10;
            // localStorage.setItem('soulgeist_balance', balanceUsuarioSG);
            // actualizarBalanceSoulgeist(balanceUsuarioSG);
            // generarCementerio();
            // lanzarAlertaMictlan(`+10 SG absorbidos (Fallback)`, "ENERGÍA ABSORBIDA");
        }

    } catch (error) {
        console.error("Error en videoCompletado:", error);
        lanzarAlertaMictlan("No se pudo conectar con el inframundo.", "FALLO DE RED");
    }
}

// ==================================================================
// EXTRAS Y MODALES SECUNDARIOS
// ==================================================================
// ... (mostrarContratoMictlan, abrirConfirmacionFinal, lanzarAlertaMictlan, cerrarAlertaMictlan, etc.) ...

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
document.addEventListener("DOMContentLoaded", async () => { // async aquí
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
    const btnEnviarGlobal = document.getElementById('btn-ritual-enviar-unico') || document.getElementById('btn-ritual-enviar');
    if (btnEnviarGlobal) {
        // Este botón se usa en el modal de selección de cantidad
        btnEnviarGlobal.onclick = () => {
            // Aquí se llama a iniciarTransferenciaElegida.
            // Sin embargo, la lógica que la llama ya está en generarCementerio al hacer click en la cripta.
            // Si este botón está en otro modal, deberías adaptarlo.
            // Por ahora, lo dejamos comentado para evitar conflictos.
            // iniciarTransferenciaElegida(...) 
        };
    }

    const btnCancelarGlobal = document.getElementById('btn-ritual-cancelar-primer-paso') || document.getElementById('btn-ritual-cancelar');
    if (btnCancelarGlobal) {
        btnCancelarGlobal.onclick = cerrarRitual;
    }

    // Persistencia del usuario en el Inframundo
    const usuarioGuardado = localStorage.getItem('soulgeist_user_email');
    if (usuarioGuardado) {
        window.userWallet = usuarioGuardado;
        // *** CAMBIO CRUCIAL: Sincronizar balance ANTES de entrar al campo santo ***
        await sincronizarBalanceConRedis(); 
        // Ahora entrarAlCampoSanto usará el balance sincronizado
        if (typeof entrarAlCampoSanto === 'function') {
            entrarAlCampoSanto({ balanceSG: balanceUsuarioSG }); // Pasamos el balance ya cargado
        }
    } else {
        // Si no hay usuario guardado, podemos intentar cargar un balance de localStorage
        // como fallback, pero idealmente el usuario debe loguearse primero.
        balanceUsuarioSG = parseFloat(localStorage.getItem('soulgeist_balance')) || 0;
        actualizarBalanceSoulgeist(balanceUsuarioSG);
    }
});

// === LA FUNCIÓN MÁS IMPORTANTE PARA LA PERSISTENCIA: SE DEBE LLAMAR DESDE EL BACKEND ===
// Esta función SE DEBE EJECUTAR DESPUÉS de que el backend actualice Redis.
// Su propósito es leer el balance CORRECTO de Redis (vía API) y aplicarlo al frontend.
async function sincronizarBalanceConRedis() {
    if (!window.userWallet) return;
    try {
        // Debes tener una ruta en tu API para obtener el saldo actual
        const res = await fetch(`/api/obtener-balance?wallet=${window.userWallet}`);
        const data = await res.json();
        if (data.balance !== undefined) {
            balanceUsuarioSG = data.balance;
            localStorage.setItem('soulgeist_balance', data.balance);
            // Actualiza también el elemento visual si existe
            const display = document.getElementById('display-balance');
            if (display) display.innerText = data.balance;
        }
    } catch (e) {
        console.error("Error al sincronizar saldo:", e);
    }
}
