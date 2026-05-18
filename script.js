// ==================================================================
// VARIABLES GLOBALES DEL INFRAMUNDO
// ==================================================================
let balanceUsuarioSG = 0; // Controlará tu balance dinámico desde Redis
let tumbaSeleccionada = null; // Almacenará la tumba de destino elegida
let ritualActivo = false; // Bloquea o desbloquea la selección de destino
let esModoRegistro = false; // Alterna el formulario tradicional de la página izquierda

// CONFIGURACIÓN DE GOOGLE (Asegúrate de cambiar esto en producción)
const GOOGLE_CLIENT_ID = "25093626964-mep6ihpq1gamn8hm59q2cf15rm8gd0ao.apps.googleusercontent.com"; 

// ==================================================================
// FASE 1 -> FASE 2: APERTURA DEL GRIMORIO ABIERTO (CORREGIDO)
// ==================================================================
function entrarAlMictlan() {
    const portal = document.getElementById('escena-portal'); 
    const modalContrato = document.getElementById('modal-contrato'); 
    
    if (!portal || !modalContrato) return; 

    // Aseguramos que el cementerio NO se muestre todavía en el fondo
    const campoSanto = document.getElementById('campo-santo'); 
    if (campoSanto) campoSanto.style.display = 'none'; 

    // Desvanecimiento suave del portal de las rejas
    portal.style.transition = "opacity 0.8s ease"; 
    portal.style.opacity = '0'; 
    
    setTimeout(() => {
        portal.style.display = 'none'; 
        modalContrato.style.display = 'flex'; // Abre el Grimorio/Registro limpiamente
    }, 800); 
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
        tagline.innerText = "REGISTRO DE ESPÍRITUS"; 
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
    const email = document.getElementById('email').value.trim(); 
    const password = document.getElementById('password').value.trim(); 
    
    if (!email || !password) {
        lanzarAlertaMictlan("Debes completar ambos campos para alterar el libro de los muertos.", "CAMPOS INCOMPLETOS"); 
        return; 
    }

    const accionMistica = esModoRegistro ? 'registro' : 'login'; 

    try {
        const btnAuth = document.getElementById('btn-auth'); 
        const textoOriginal = btnAuth.innerText; 
        btnAuth.innerText = "PROCESANDO PACTO..."; 
        btnAuth.disabled = true; 

        const respuesta = await fetch('/api/pacto', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                accion: accionMistica, 
                email: email, 
                password: password 
            }) 
        });

        const resultado = await respuesta.json(); 
        
        btnAuth.innerText = textoOriginal; 
        btnAuth.disabled = false; 

        if (!respuesta.ok) {
            lanzarAlertaMictlan(resultado.error || "Las deidades del inframundo han rechazado tu ofrenda.", "RITUAL RECHAZADO"); 
            return; 
        }

        if (accionMistica === 'registro') {
            lanzarAlertaMictlan(resultado.message, "ALMA REGISTRADA"); 
            cambiarModoAuth(); 
        } 
        else if (accionMistica === 'login') {
            window.userWallet = resultado.usuario.email; 
            localStorage.setItem('soulgeist_user_email', resultado.usuario.email); 
            entrarAlCampoSanto({ balanceSG: resultado.usuario.balance }); 
        }

    } catch (error) {
        console.error("Fallo de conexión con el Mictlán:", error); 
        lanzarAlertaMictlan("No se pudo establishcer conexión con el inframundo. Revisa tu red.", "FALLO DE CONEXIÓN"); 
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

    balanceUsuarioSG = perfil.balanceSG || 0; 
    generarCementerio(); 
}

if (typeof window.tumbasConSaldo === 'undefined') {
    window.tumbasConSaldo = {}; 
}

// ==================================================================
// DISPARADOR GLOBAL ESTILO VIDEOJUEGO (PASO 1 Y 2 DEL VIDEO)
// ==================================================================
function dispararInicioRitualGlobal() {
    if (balanceUsuarioSG <= 0) {
        lanzarAlertaMictlan("Tu medidor de Soulgeist está extinto. Reclama energía en el video antes de consumar un pacto.", "SIN ENERGÍA");
        return;
    }

    // 1. Atenuamos el fondo del Campo Santo
    document.getElementById('campo-santo').style.filter = "blur(5px) brightness(0.4)";
    const modal = document.getElementById('modal-ritual');
    if (modal) {
        modal.style.setProperty('--color-ritmo', "#00ffff");
        modal.style.display = 'block';
    }

    // Ocultamos inputs del modal provisionalmente
    const inputContenedor = document.getElementById('wallet-input')?.parentElement;
    const selectContenedor = document.getElementById('pasarela-select')?.parentElement;
    if (inputContenedor) inputContenedor.style.display = 'none';
    if (selectContenedor) selectContenedor.style.display = 'none';

    document.getElementById('titulo-ritual').innerText = "RITUAL INICIADO";
    document.getElementById('info-ritual').innerHTML = `
        <p style="margin-bottom: 15px; color: #ccc; font-family:'MedievalSharp', cursive;">SELECCIONA UNA TUMBA DE DESTINO PARA CANALIZAR TU PODER SG.</p>
    `;

    const modalBotonesNativos = document.getElementById('botones-exchange');
    let btnPrincipal = null;
    let btnCancelar = null;
    if (modalBotonesNativos) {
        modalBotonesNativos.style.display = 'flex';
        const listaBotones = Array.from(modalBotonesNativos.getElementsByTagName('button'));
        btnCancelar = listaBotones.find(b => b.getAttribute('onclick')?.includes('cerrar') || b.innerText.toLowerCase().includes('cancelar'));
        btnPrincipal = listaBotones.find(b => b !== btnCancelar);
    }

    if (btnPrincipal) {
        btnPrincipal.style.display = 'block';
        btnPrincipal.innerText = "ACEPTAR PACTO";
        btnPrincipal.style.background = "#00ffff";
        btnPrincipal.style.color = "#000";

        const clonBtn = btnPrincipal.cloneNode(true);
        btnPrincipal.parentNode.replaceChild(clonBtn, btnPrincipal);
        btnPrincipal = clonBtn;

        // PASO 2: Al dar clic en Aceptar Pacto se cierra el modal y se activa el mapa receptivo
        btnPrincipal.onclick = (event) => {
            event.preventDefault();
            cerrarRitual(); 
            ritualActivo = true; 
            lanzarAlertaMictlan("El poder está latente. Toca cualquier cripta en el Campo Santo para inyectar tus almas.", "MAPA RECEPTIVO");
        };
    }

    if (btnCancelar) {
        btnCancelar.style.display = 'block';
        btnCancelar.innerText = "HUIR";
        btnCancelar.onclick = () => { ritualActivo = false; cerrarRitual(); };
    }
}

// ==================================================================
// RENDERIZADO DEL MAPA Y MANEJO DINÁMICO DE MODALES (MÉTODO INMUNE)
// ==================================================================
function generarCementerio() {
    const contenedor = document.getElementById('contenedor-criptos'); 
    if (!contenedor) return; 
    contenedor.innerHTML = ''; 

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

        if (pos.especial) {
            div.innerHTML = `
                <div class="sigilo-soulgeist"></div>
                <div class="nombre-cripto">${pos.nombre}</div>
                <div class="balance-actual">Poder: ${balanceUsuarioSG} SG</div>
            `; 
        } else {
            const gananciaDecimal = balanceUsuarioSG > 0 ? (balanceUsuarioSG * pos.tasa) : 0; 
            const textoBalance = gananciaDecimal > 0 ? `+${gananciaDecimal.toLocaleString()}` : `0`; 
            
            div.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; position: relative; width: 120px;">
                    <div class="moneda-flotante" style="filter: drop-shadow(0 0 10px ${pos.color});">
                        <span class="simbolo-cripto">${pos.sim}</span>
                    </div>
                    <div class="info-tumba" style="margin-top: 12px; text-align: center; width: 100%;">
                        <div class="nombre-cripto" style="color: ${pos.color}; font-weight: bold; font-size: 14px; text-shadow: 0 0 5px #000;">
                            ${pos.nombre}
                        </div>
                        <div class="balance-proyectado" style="color: #fff; font-size: 12px; opacity: 0.8;">
                            ${textoBalance} ${pos.sim}
                        </div>
                    </div>
                </div>
            `; 
        }

        div.onclick = (e) => {
            e.stopPropagation();
            
            if (pos.especial) {
                dispararInicioRitualGlobal();
                return;
            }

            // ==================================================================
            // CONTROL DE CLIC BAJO EL RITUAL ACTIVO (PARTÍCULA -> MODAL INTERMEDIO)
            // ==================================================================
            if (ritualActivo) {
                ritualActivo = false; 
                window.tumbasConSaldo[pos.nombre] = true;

                const tumbaOrigen = document.querySelector('.alma-maestra');
                const tumbaDestino = e.currentTarget;
                const gananciaDecimal = balanceUsuarioSG > 0 ? (balanceUsuarioSG * pos.tasa) : 0;

                // PASO 3: Desatamos el viaje místico
                lanzarAlma(tumbaOrigen, tumbaDestino, pos.color, gananciaDecimal, () => {
                    
                    // PASO 4: Se ejecuta en milisegundos EXACTOS cuando la partícula llega a la cripta
                    document.getElementById('campo-santo').style.filter = "blur(5px) brightness(0.4)";
                    const modal = document.getElementById('modal-ritual');
                    if (modal) {
                        modal.style.setProperty('--color-ritmo', pos.color);
                        modal.style.display = 'block';
                    }

                    const inputContenedor = document.getElementById('wallet-input')?.parentElement;
                    const selectContenedor = document.getElementById('pasarela-select')?.parentElement;
                    if (inputContenedor) inputContenedor.style.display = 'none';
                    if (selectContenedor) selectContenedor.style.display = 'none';

                    document.getElementById('titulo-ritual').innerText = "PODER TRANSFERIDO";
                    document.getElementById('info-ritual').innerHTML = `
                        <p style="margin-bottom: 15px; color: #fff; font-family:'MedievalSharp', cursive;">¡LA TUMBA DE CANALIZACIÓN HA RECIBIDO LA ENERGÍA EN ${pos.nombre.toUpperCase()}!</p>
                    `;

                    const modalBotonesNativos = document.getElementById('botones-exchange');
                    let btnPrincipal = null;
                    let btnCancelar = null;
                    if (modalBotonesNativos) {
                        modalBotonesNativos.style.display = 'flex';
                        const listaBotones = Array.from(modalBotonesNativos.getElementsByTagName('button'));
                        btnCancelar = listaBotones.find(b => b.getAttribute('onclick')?.includes('cerrar') || b.innerText.toLowerCase().includes('cancelar'));
                        btnPrincipal = listaBotones.find(b => b !== btnCancelar);
                    }

                    if (btnPrincipal) {
                        btnPrincipal.style.display = 'block';
                        btnPrincipal.innerText = "CONTINUAR";
                        btnPrincipal.style.background = pos.color;
                        btnPrincipal.style.color = "#000";

                        const clonBtn = btnPrincipal.cloneNode(true);
                        btnPrincipal.parentNode.replaceChild(clonBtn, btnPrincipal);
                        btnPrincipal = clonBtn;

                        btnPrincipal.onclick = () => {
                            cerrarRitual();
                            setTimeout(() => { abrirModalCosechaFinal(pos); }, 50);
                        };
                    }
                    if (btnCancelar) btnCancelar.style.display = 'none'; 
                });

            } else {
                abrirModalCosechaFinal(pos);
            }
        };

        contenedor.appendChild(div); 
    });

    // Pilares
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
        if(p.clase === "pilar-derecho") {
            enlace.onclick = (e) => { e.preventDefault(); mostrarContratoMictlan(); }; 
        }
        contenedor.appendChild(enlace); 
    });
}

function actualizarSumaVisual(elementoTumba, cantidad) {
    const texto = elementoTumba.querySelector('.balance-proyectado'); 
    if (texto) {
        let actual = parseFloat(texto.innerText.replace(/[^0-9.]/g, '')) || 0; 
        let nuevo = actual + Math.max(0, cantidad); 
        texto.innerText = `+${nuevo.toFixed(6)} ${texto.innerText.split(' ').pop()}`; 
        
        texto.style.transform = "scale(1.2)"; 
        texto.style.color = "#fff"; 
        setTimeout(() => {
            texto.style.transform = "scale(1)"; 
            texto.style.color = "";  
        }, 300); 
    }
}

function notificacionGotica(titulo, mensaje, color, mostrarInput) {
    document.getElementById('campo-santo').style.filter = "blur(5px) brightness(0.4)"; 
    const modal = document.getElementById('modal-ritual'); 
    const input = document.getElementById('wallet-input'); 
    const btnEnviar = document.getElementById('btn-enviar-alma') || document.querySelector('.botones-exchange button:first-child'); 
    
    if(modal) {
        modal.style.setProperty('--color-ritmo', color); 
        modal.style.display = 'block'; 
    }
    
    document.getElementById('titulo-ritual').innerText = titulo; 
    document.getElementById('info-ritual').innerText = mensaje; 
    
    if (input) {
        if (mostrarInput) {
            input.style.display = 'block'; 
            if(btnEnviar) btnEnviar.style.display = 'block'; 
            input.value = "";  
        } else {
            input.style.display = 'none'; 
            if(btnEnviar) btnEnviar.style.display = 'none'; 
        }
    }
}

// FASE 4: ABRE LA COSECHA DE LA CRIPTA SELECCIONADA CON EL CAMPO DE WALLET
function abrirModalCosechaFinal(pos) {
    const valorUsuarioUSD = balanceUsuarioSG * 0.001; 

    if (valorUsuarioUSD < pos.usdMinimo) {
        lanzarAlertaMictlan( 
            `El umbral de esta cripta exige un valor mínimo de $ ${pos.usdMinimo.toFixed(2)} USD en almas. Actualmente posees el equivalente a $ ${valorUsuarioUSD.toFixed(2)} USD (${balanceUsuarioSG} SG). Sigue cosechando en Soulgeist para romper el sello.`, 
            "REQUISITO INCUMPLIDO"
        );
        return; 
    }

    document.getElementById('campo-santo').style.filter = "blur(5px) brightness(0.4)"; 

    const modal = document.getElementById('modal-ritual'); 
    const titulo = document.getElementById('titulo-ritual'); 
    const info = document.getElementById('info-ritual'); 
    
    if(modal) {
        modal.style.setProperty('--color-ritmo', pos.color); 
        modal.style.display = 'block'; 
    }
    
    titulo.innerText = `COSECHA DE ${pos.nombre.toUpperCase()}`; 
    
    const inputContenedor = document.getElementById('wallet-input')?.parentElement;
    const selectContenedor = document.getElementById('pasarela-select')?.parentElement;
    if(inputContenedor) inputContenedor.style.display = 'block';
    if(selectContenedor) selectContenedor.style.display = 'block';

    info.innerHTML = `
        <p style="margin-bottom: 15px; color: #ccc;">Selecciona la pasarela de destino para canalizar tus ${pos.sim}:</p>
        
        <select id="pasarela-select" onchange="adaptarPlaceholderPasarela('${pos.nombre}')" style="width: 100%; background: #111; color: #fff; border: 1px solid ${pos.color}; padding: 10px; border-radius: 5px; font-family: 'MedievalSharp', cursive; margin-bottom: 15px; cursor: pointer;">
            <option value="faucetpay">FaucetPay (Micro-Wallet)</option>
            ${pos.nombre === "Bitcoin" ? '<option value="bitso_lightning">Bitso (Red Lightning ⚡)</option>' : ''}
            <option value="bitso">Bitso (Red Principal)</option>
            <option value="coinbase">Coinbase</option>
            <option value="binance">Binance Exchange</option>
        </select>

        <input type="text" id="wallet-input" placeholder="Correo vinculado a FaucetPay o Dirección" style="display: block; width: 100%; background: #000; color: #fff; border: 1px solid #555; padding: 12px; text-align: center; font-size: 14px; border-radius: 4px; box-sizing: border-box; margin-bottom: 15px;">
    `; 
    
    window.currentCripto = pos.nombre; 

    const modalBotonesNativos = document.getElementById('botones-exchange');
    let btnPrincipal = null;
    let btnCancelar = null;
    if (modalBotonesNativos) {
        modalBotonesNativos.style.display = 'flex';
        const listaBotones = Array.from(modalBotonesNativos.getElementsByTagName('button'));
        btnCancelar = listaBotones.find(b => b.getAttribute('onclick')?.includes('cerrar') || b.innerText.toLowerCase().includes('cancelar'));
        btnPrincipal = listaBotones.find(b => b !== btnCancelar);
    }

    if (btnPrincipal) {
        btnPrincipal.style.display = 'block';
        btnPrincipal.innerText = "ENVIAR ALMA";
        btnPrincipal.style.background = pos.color;
        btnPrincipal.style.color = "#000";

        const clonBtn = btnPrincipal.cloneNode(true);
        btnPrincipal.parentNode.replaceChild(clonBtn, btnPrincipal);
        btnPrincipal = clonBtn;

        btnPrincipal.onclick = () => {
            if (typeof procesarRetiro !== 'undefined') procesarRetiro();
        };
    }

    if (btnCancelar) {
        btnCancelar.style.display = 'block';
        btnCancelar.innerText = "CANCELAR";
        btnCancelar.onclick = cerrarRitual;
    }
}

function adaptarPlaceholderPasarela(criptoId) {
    const pasarela = document.getElementById('pasarela-select').value; 
    const input = document.getElementById('wallet-input'); 
    if (!input) return; 
    
    if (pasarela === 'faucetpay') {
        input.placeholder = "Correo vinculado a FaucetPay o Dirección"; 
    } else if (pasarela === 'bitso_lightning') {
        input.placeholder = "Ingresa tu Invoice de Lightning (lnbc...)"; 
    } else {
        input.placeholder = `Dirección de depósito de ${criptoId} (on-chain)`; 
    }
}

function procesarRetiro() {
    const inputWallet = document.getElementById('wallet-input'); 
    const selectPasarela = document.getElementById('pasarela-select'); 
    
    if(!inputWallet) return; 
    
    const wallet = inputWallet.value.trim(); 
    const pasarelaElegida = selectPasarela ? selectPasarela.value : "faucetpay"; 
    
    if (wallet.length < 8) {
        lanzarAlertaMictlan("La dirección o credencial del portal es demasiado corta.", "ERROR DE RITUAL"); 
        return; 
    }
    
    cerrarRitual(); 
    procesarCosecha(wallet, window.currentCripto, pasarelaElegida); 
}

async function procesarCosecha(walletUsuario, criptoSeleccionada, pasarela) {
    try {
        const respuesta = await fetch('/api/reclamar', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                wallet: walletUsuario, 
                cripto: criptoSeleccionada, 
                pasarela: pasarela 
            }) 
        });

        const resultado = await respuesta.json(); 

        if (respuesta.status === 403 || respuesta.status === 429) {
            lanzarAlertaMictlan(resultado.error, "CANDADO DEL TIEMPO / SEGURIDAD"); 
            return; 
        }

        if (!respuesta.ok) {
            lanzarAlertaMictlan(resultado.error || "El ritual falló misteriosamente.", "ADVERTENCIA MORTAL"); 
            return; 
        }

        if (resultado.balanceAlmas !== undefined) {
            balanceUsuarioSG = resultado.balanceAlmas; 
            const selectorBalance = document.querySelector('.alma-maestra .balance-actual'); 
            if (selectorBalance) {
                selectorBalance.innerText = `Poder: ${balanceUsuarioSG} SG`; 
            }
            generarCementerio(); 
        }

        lanzarAlertaMictlan(resultado.mensaje, "RITUAL COMPLETADO"); 

    } catch (error) {
        console.error("Error en el portal:", error); 
        lanzarAlertaMictlan("No se pudo establecer conexión con el inframundo. Revisa tu red.", "FALLO DE CONEXIÓN"); 
    }
}

function cerrarRitual() {
    const modal = document.getElementById('modal-ritual'); 
    const cementerio = document.getElementById('campo-santo'); 
    if(modal) modal.style.display = 'none'; 
    if(cementerio) cementerio.style.filter = "none"; 
}

// ==================================================================
// ABSORCIÓN DE VIDEOS MONETIZADOS
// ==================================================================
async function videoCompletado() {
    if (!window.userWallet) {
        lanzarAlertaMictlan("Debes ligan tu wallet al Mictlán antes de absorber energía de los videos.", "SANTUARIO SIN DUEÑO"); 
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

        balanceUsuarioSG = resultado.nuevoBalance; 
        
        const selectorBalance = document.querySelector('.alma-maestra .balance-actual'); 
        if (selectorBalance) {
            selectorBalance.innerText = `Poder: ${balanceUsuarioSG} SG`; 
        }
        
        generarCementerio(); 
        lanzarAlertaMictlan(resultado.mensaje, "ENERGÍA ABSORBIDA"); 

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
// CARGA INICIAL Y PERSISTENCIA DE ALMAS
// ==================================================================
document.addEventListener("DOMContentLoaded", () => {
    inicializarBotonGoogle();

    const portalElement = document.getElementById('escena-portal');
    if(portalElement) {
        portalElement.onclick = entrarAlMictlan;
    }

    // Vinculamos de una vez el disparador global del ritual en el botón flotante si existe
    const btnRitualFlotante = document.getElementById('btn-iniciar-ritual-faucet') || document.querySelector('.btn-invocar-ritual');
    if (btnRitualFlotante) {
        btnRitualFlotante.onclick = dispararInicioRitualGlobal;
    }

    const usuarioGuardado = localStorage.getItem('soulgeist_user_email');
    if (usuarioGuardado) {
        window.userWallet = usuarioGuardado;
        entrarAlCampoSanto({ balanceSG: 0 }); 
    }
});