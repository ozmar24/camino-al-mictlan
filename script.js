// ==================================================================
// VARIABLES GLOBALES DEL INFRAMUNDO
// ==================================================================
let balanceUsuarioSG = 0; // Controlará tu balance dinámico desde Redis
let tumbaSeleccionada = null; // Almacenará la tumba de destino elegida
let ritualActivo = false; // Bloquea o desbloquea la selección de destino

function entrarAlMictlan() {
    const portal = document.getElementById('escena-portal');
    const cementerio = document.getElementById('campo-santo');
    const candelabro = document.querySelector('.candelabro-central');
    
    if (!portal || !cementerio) return;

    portal.style.transition = "opacity 1.5s ease";
    portal.style.opacity = '0';
    
    setTimeout(() => {
        portal.style.display = 'none';
        cementerio.style.display = 'block';
        
        if (candelabro) {
            candelabro.style.display = 'block';
            setTimeout(() => { candelabro.style.opacity = '1'; }, 50);
        }

        generarCementerio();
    }, 1500);
}

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
    // 🚨 AJUSTE EN CEROS: Si el usuario tiene 0 almas, la ganancia proyectada es 0 redondo.
    const gananciaEstimada = balanceUsuarioSG > 0 ? (balanceUsuarioSG * pos.tasa).toLocaleString() : "0";
    
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
                    +${gananciaEstimada} ${pos.sim}
                </div>
            </div>
        </div>
    `;
}

        // ==================================================================
        // GESTIÓN DE CLICS CON EL FLUJO DEL VIDEO
        // ==================================================================
        div.onclick = (e) => {
            e.stopPropagation();
            
            if (pos.especial) {
                ritualActivo = true;
                window.currentCripto = "Soulgeist";
                notificacionGotica("RITUAL INICIADO", "Selecciona una tumba de destino para canalizar tu Poder SG.", pos.color, false);
            } 
            else {
                if (ritualActivo) {
                    ritualActivo = false; 
                    cerrarRitual(); 
                    
                    const tumbaOrigen = document.querySelector('.alma-maestra');
                    tumbaSeleccionada = e.currentTarget;
                    window.currentCripto = pos.nombre; 

                    const baseCalculo = balanceUsuarioSG > 0 ? balanceUsuarioSG : 100;
                    lanzarAlma(tumbaOrigen, tumbaSeleccionada, pos.color, baseCalculo * pos.tasa, pos);
                } else {
                    abrirModalRitual(pos);
                }
            }
        };

        contenedor.appendChild(div);
    });

    const pilares = [
        { texto: "ASCENSO", sub: "REGRESAR", link: "https://faucet-btc.xyz", clase: "pilar-izquierdo" },
        { texto: "MICTLÁN", sub: "DESCENDER", link: "#", clase: "pilar-derecho" }
    ];

    pilares.forEach(p => {
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
        let nuevo = actual + cantidad;
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
    
    modal.style.setProperty('--color-ritmo', color);
    document.getElementById('titulo-ritual').innerText = titulo;
    document.getElementById('info-ritual').innerText = mensaje;
    
    if (mostrarInput) {
        input.style.display = 'block';
        if(btnEnviar) btnEnviar.style.display = 'block';
        input.value = ""; 
    } else {
        input.style.display = 'none';
        if(btnEnviar) btnEnviar.style.display = 'none';
    }
    
    modal.style.display = 'block';
}

// ==================================================================
// ABRE EL MODAL DE RECLAMO E INTEGRA EL FILTRO ANTI-FUGAS ($0.15 USD)
// ==================================================================
function abrirModalRitual(pos) {
    // Definimos arbitrariamente que 1 Alma SG equivale a $0.001 USD
    // Por lo tanto, 100 almas recolectadas en el día = $0.10 USD.
    const valorUsuarioUSD = balanceUsuarioSG * 0.001;

    // Si el valor acumulado en dólares es inferior al mínimo requerido ($0.15 USD)
    if (valorUsuarioUSD < pos.usdMinimo) {
    lanzarAlertaMictlan(
        `El umbral de esta cripta exige un valor mínimo de $ ${pos.usdMinimo.toFixed(2)} USD en almas. Actualmente posees el equivalente a $ ${valorUsuarioUSD.toFixed(2)} USD (${balanceUsuarioSG} SG). Sigue cosechando en Soulgeist para romper el sello.`, 
        "REQUISITO INCUMPLIDO"
    );
    return; 
}

    const modal = document.getElementById('modal-ritual');
    const titulo = document.getElementById('titulo-ritual');
    const info = document.getElementById('info-ritual');
    const input = document.getElementById('wallet-input');
    const btnEnviar = document.getElementById('btn-enviar-alma') || document.querySelector('.botones-exchange button:first-child');

    input.value = "";
    modal.style.setProperty('--color-ritmo', pos.color);
    modal.style.display = 'block';
    
    titulo.innerText = `COSECHA DE ${pos.nombre.toUpperCase()}`;
    info.innerText = `Ingresa tu dirección de Wallet externa para recibir tus ${pos.sim}.`;
    
    input.style.display = 'block';
    if(btnEnviar) btnEnviar.style.display = 'block';
    
    window.currentCripto = pos.nombre;
}

function procesarRetiro() {
    const wallet = document.getElementById('wallet-input').value;
    
    if (wallet.length < 10) {
        lanzarAlertaMictlan("El viento del norte rechaza esa dirección. Tu wallet es demasiado corta.", "ERROR DE RITUAL");
        return;
    }
    
    cerrarRitual();
    procesarCosecha(wallet, window.currentCripto);
}

function cerrarRitual() {
    const modal = document.getElementById('modal-ritual');
    const cementerio = document.getElementById('campo-santo');
    modal.style.display = 'none';
    cementerio.style.filter = "none"; 
}

function lanzarAlma(origenElemento, destinoElemento, color, cantidad, datosCripto) {
    const rectOrigen = origenElemento.getBoundingClientRect();
    const rectDestino = destinoElemento.getBoundingClientRect();

    const alma = document.createElement('div');
    alma.className = 'alma-viajera';
    alma.style.setProperty('--color-alma', color);
    document.body.appendChild(alma);

    let posX = rectOrigen.left + rectOrigen.width / 2;
    let posY = rectOrigen.top + rectOrigen.height / 2;

    const intervaloNiebla = setInterval(() => {
        for(let i = 0; i < 2; i++) { 
            const nube = document.createElement('div');
            nube.className = 'rastro-niebla';
            nube.style.setProperty('--color-alma', color);
            const size = Math.random() * 30 + 10;
            nube.style.width = size + 'px';
            nube.style.height = size + 'px';
            nube.style.left = (parseFloat(alma.style.left) + (Math.random() - 0.5) * 20) + 'px';
            nube.style.top = (parseFloat(alma.style.top) + (Math.random() - 0.5) * 20) + 'px';
            document.body.appendChild(nube);

            nube.animate([
                { transform: 'scale(1) translateY(0)', opacity: 0.4 },
                { transform: `scale(2) translateY(${(Math.random() - 0.5) * 30}px)`, opacity: 0 }
            ], { duration: 800, easing: 'ease-out' }).onfinish = () => nube.remove();
        }
    }, 30);

    const anim = alma.animate([
        { left: `${posX}px`, top: `${posY}px` },
        { 
            left: `${(posX + (rectDestino.left + rectDestino.width / 2)) / 2 + (Math.random() * 100 - 50)}px`, 
            top: `${(posY + (rectDestino.top + rectDestino.height / 2)) / 2 - 80}px` 
        },
        { left: `${rectDestino.left + rectDestino.width / 2}px`, top: `${rectDestino.top + rectDestino.height / 2}px` }
    ], {
        duration: 1000,
        easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)'
    });

    anim.onfinish = () => {
        clearInterval(intervaloNiebla);
        alma.remove();
        actualizarSumaVisual(destinoElemento, cantidad);
        
        // Al terminar el trayecto del video, mandamos llamar a abrirModalRitual pasándole la info de la cripto
        abrirModalRitual(datosCripto);
    };
}

function mostrarContratoMictlan() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay-contrato';
    const modal = document.createElement('div');
    modal.className = 'modal-pergamino'; 
    
    modal.innerHTML = `
    <div class="pergamino-content">
        <h2 class="pergamino-titulo">Contrato del Mictlán</h2>
        <div class="pergamino-texto">
            <p style="margin-bottom: 12px;">
                Yo, buscador de tesoros, ligo mi alma a estos dominios sagrados...
            </p>
        </div>
        <div class="pergamino-botones">
            <button class="btn-ritual" id="pacto-si">ACEPTAR PACTO</button>
            <button class="btn-ritual" style="background:#222;" id="pacto-no">HUIR</button>
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
            <button id="final-si" class="btn-ritual" style="background:#4a0000; color:white; padding:10px 20px; border:1px solid #ff0000; cursor:pointer;">DESCENDER</button>
            <button id="final-no" class="btn-ritual" style="background:#222; color:white; padding:10px 20px; border:1px solid #555; cursor:pointer;">CANCELAR</button>
        </div>
    `;

    document.body.appendChild(overlayFinal);
    document.body.appendChild(modalFinal);

    document.getElementById('final-si').onclick = () => { window.location.href = "https://void-onyx-web.vercel.app"; };
    document.getElementById('final-no').onclick = () => { modalFinal.remove(); overlayFinal.remove(); };
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
    if (pantalla) {
        pantalla.style.opacity = '0';
        setTimeout(() => { pantalla.style.display = 'none'; }, 500);
    }
}

function enviarOfrendaOraculo() {
    const msg = document.getElementById('oraculo-input').value;
    if(msg.trim()) {
        alert("Tu susurro ha sido entregado a los ancestros...");
        document.getElementById('oraculo-input').value = ""; 
        cerrarOraculo();
    } else {
        alert("El Oráculo requiere una ofrenda de palabras.");
    }
}

function lanzarAlertaMictlan(mensaje, titulo = "¡ADVERTENCIA MORTAL!") {
    document.getElementById('alerta-titulo').innerText = titulo;
    document.getElementById('alerta-mensaje').innerText = mensaje;
    const modal = document.getElementById('alerta-mictlan');
    if(modal) modal.style.display = 'flex';
}

function cerrarAlertaMictlan() {
    const modal = document.getElementById('alerta-mictlan');
    if (modal) modal.style.display = 'none';
}

async function procesarCosecha(walletUsuario, criptoSeleccionada) {
    if (!walletUsuario || walletUsuario.length < 10) {
        lanzarAlertaMictlan("El viento del norte rechaza esa dirección. Tu wallet es demasiado corta para procesar el pacto.", "ERROR DE RITUAL");
        return;
    }

    try {
        const respuesta = await fetch('/api/reclamar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: walletUsuario, cripto: criptoSeleccionada })
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