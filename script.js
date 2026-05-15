function entrarAlMictlan() {
    const portal = document.getElementById('escena-portal');
    const cementerio = document.getElementById('campo-santo');
    const candelabro = document.querySelector('.candelabro-central'); // Seleccionamos el candelabro
    
    if (!portal || !cementerio) return;

    portal.style.transition = "opacity 1.5s ease";
    portal.style.opacity = '0';
    
    setTimeout(() => {
        portal.style.display = 'none';
        cementerio.style.display = 'block';
        
        // --- MOSTRAR CANDELABRO AQUÍ ---
        if (candelabro) {
            candelabro.style.display = 'block';
            setTimeout(() => { candelabro.style.opacity = '1'; }, 50);
        }

        generarCementerio();
        iniciarAmbienteMictlan();
    }, 1500);
}

let tumbaSeleccionada = null;

function generarCementerio() {
    const contenedor = document.getElementById('contenedor-criptos');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    const configuracion = [
        { nombre: "Soulgeist", sim: "SG", color: "#00ffff", top: "48%", left: "78.5%", especial: true },
        { nombre: "Ethereum", sim: "♦", color: "#627eea", top: "72%", left: "7.5%", tasa: 0.000045 },
        { nombre: "Litecoin", sim: "Ł", color: "#00d4ff", top: "75%", left: "26.5%", tasa: 0.0012 },
        { nombre: "Pepe", sim: "🐸", color: "#45ca5d", top: "68%", left: "38%", tasa: 150000 },
        { nombre: "Solana", sim: "S", color: "#14f195", top: "64%", left: "46%", tasa: 0.0008 },
        { nombre: "Dogecoin", sim: "Ð", color: "#ba9f33", top: "61%", left: "68%", tasa: 1.5 }, 
        { nombre: "USDT", sim: "₮", color: "#26a17b", top: "73%", left: "77%", tasa: 0.25 }, 
        { nombre: "Bitcoin", sim: "₿", color: "#f7931a", top: "72%", left: "90%", tasa: 0.000002 }
    ];

    const balanceUsuarioSG = 100;

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
            const gananciaEstimada = (balanceUsuarioSG * pos.tasa).toLocaleString();
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

        div.onclick = (e) => {
            e.stopPropagation();
            if (pos.especial) {
                notificacionGotica("RITUAL INICIADO", "Selecciona una tumba de destino para canalizar tu Poder SG.", pos.color, false);
                tumbaSeleccionada = e.currentTarget; 
            } 
            else if (tumbaSeleccionada && tumbaSeleccionada instanceof HTMLElement) {
                const cantidadASumar = (balanceUsuarioSG * pos.tasa);
                lanzarAlma(tumbaSeleccionada, e.currentTarget, pos.color, cantidadASumar);
                notificacionGotica("PODER TRANSFERIDO", `¡La tumba de ${pos.nombre} ha recibido energía!`, pos.color, false);
                tumbaSeleccionada = null; 
            } 
            else {
                notificacionGotica(`COSECHA DE ${pos.nombre.toUpperCase()}`, `Ingresa tu dirección de Wallet externa para recibir tus ${pos.sim}.`, pos.color, true);
                window.currentCripto = pos.nombre;
            }
        };

        contenedor.appendChild(div);
    });

    // --- INSCRIPCIONES EN LOS PILARES (Sin volver a declarar 'contenedor') ---
    const pilares = [
    { 
        texto: "ASCENSO", 
        sub: "REGRESAR", 
        link: "https://faucet-btc.xyz", 
        clase: "pilar-izquierdo" 
    },
    { 
        texto: "MICTLÁN", 
        sub: "DESCENDER", 
        link: "#", 
        clase: "pilar-derecho" 
    }
];

pilares.forEach(p => {
    const enlace = document.createElement('a');
    enlace.href = p.link;
    enlace.className = `inscripcion-pilar ${p.clase}`;
    // Usamos el texto en el span para el efecto vertical
    enlace.innerHTML = `<span>${p.texto}</span><small>${p.sub}</small>`;
    
    if(p.clase === "pilar-derecho") {
        enlace.onclick = (e) => {
            e.preventDefault();
            mostrarContratoMictlan();
        };
    }
    contenedor.appendChild(enlace);
});
}
function lanzarAlma(origenElemento, destinoElemento, color, cantidad) {
    const rectOrigen = origenElemento.getBoundingClientRect();
    const rectDestino = destinoElemento.getBoundingClientRect();

    const alma = document.createElement('div');
    alma.className = 'alma-viajera';
    alma.style.setProperty('--color-alma', color);
    
    alma.style.left = `${rectOrigen.left + rectOrigen.width / 2}px`;
    alma.style.top = `${rectOrigen.top + rectOrigen.height / 2}px`;
    
    document.body.appendChild(alma);

    const animacion = alma.animate([
        { left: `${rectOrigen.left + rectOrigen.width / 2}px`, top: `${rectOrigen.top + rectOrigen.height / 2}px`, opacity: 1, scale: 1 },
        { left: `${rectDestino.left + rectDestino.width / 2}px`, top: `${rectDestino.top + rectDestino.height / 2}px`, opacity: 0, scale: 0.5 }
    ], {
        duration: 1000,
        easing: 'ease-in'
    });

    animacion.onfinish = () => {
        alma.remove();
        actualizarSumaVisual(destinoElemento, cantidad);
    };
}

function actualizarSumaVisual(elementoTumba, cantidad) {
    const texto = elementoTumba.querySelector('.balance-proyectado');
    if (texto) {
        // Extraemos el número, sumamos y actualizamos
        let actual = parseFloat(texto.innerText.replace(/[^0-9.]/g, '')) || 0;
        let nuevo = actual + cantidad;
        texto.innerText = `+${nuevo.toFixed(6)} ${texto.innerText.split(' ').pop()}`;
        
        // Efecto visual de "golpe" de energía
        texto.style.transform = "scale(1.2)";
        texto.style.color = "#fff";
        setTimeout(() => {
            texto.style.transform = "scale(1)";
            texto.style.color = ""; 
        }, 300);
    }
}

// Esta función controla qué se ve y qué no dentro del modal
function notificacionGotica(titulo, mensaje, color, mostrarInput) {
document.getElementById('campo-santo').style.filter = "blur(5px) brightness(0.4)";
    const modal = document.getElementById('modal-ritual');
    const input = document.getElementById('wallet-input');
    const btnEnviar = document.querySelector('.botones-exchange button:first-child');
    
    // Aplicamos el color de la cripto al borde
    modal.style.setProperty('--color-ritmo', color);
    document.getElementById('titulo-ritual').innerText = titulo;
    document.getElementById('info-ritual').innerText = mensaje;
    
    // Si es solo un aviso (paso 1 y 2), ocultamos el input y el botón de enviar
    if (mostrarInput) {
        input.style.display = 'block';
        btnEnviar.style.display = 'block';
        input.value = ""; // Limpiamos para nueva entrada
    } else {
        input.style.display = 'none';
        btnEnviar.style.display = 'none';
    }
    
    modal.style.display = 'block';
}

function iniciarAmbienteMictlan() {
    // Función para obtener coordenadas aleatorias en la pantalla
    const randomPos = () => ({
        x: Math.random() * (window.innerWidth - 100),
        y: Math.random() * (window.innerHeight - 100)
    });

    // --- LÓGICA DE MURCIÉLAGOS ---
    setInterval(() => {
        const bat = document.createElement('div');
        bat.className = 'murcielago-3d';
        
        // Posición inicial (fuera de pantalla)
        bat.style.left = "-150px";
        bat.style.top = randomPos().y + "px";
        document.body.appendChild(bat);

        // Pequeño delay para que la transición de CSS funcione
        setTimeout(() => {
            const destino = randomPos();
            bat.style.left = (window.innerWidth + 150) + "px"; // Cruza toda la pantalla
            bat.style.top = destino.y + "px"; // A una altura al azar
        }, 100);

        setTimeout(() => bat.remove(), 6000);
    }, 4000);

    // --- LÓGICA DE ARAÑAS LIBRES ---
    setInterval(() => {
        const arana = document.createElement('div');
        arana.className = 'arana-3d';
        
        const inicio = randomPos();
        arana.style.left = inicio.x + "px";
        arana.style.top = "-100px"; // Aparece desde arriba
        document.body.appendChild(arana);

        setTimeout(() => {
            const destino = randomPos();
            arana.style.top = destino.y + "px"; // Baja a un punto al azar
            arana.style.left = destino.x + "px"; // Se mueve hacia los lados
        }, 100);

        // Después de un tiempo, se va de la pantalla
        setTimeout(() => {
            arana.style.top = window.innerHeight + 100 + "px"; 
            setTimeout(() => arana.remove(), 3000);
        }, 5000);
    }, 7000);
}

function abrirModalRitual(pos) {
    const modal = document.getElementById('modal-ritual');
    const titulo = document.getElementById('titulo-ritual');
    const info = document.getElementById('info-ritual');
    const input = document.getElementById('wallet-input');

    // 1. Limpiamos el input por si acaso
    input.value = "";
    
    // 2. Cambiamos el color del borde y resplandor según la moneda (BTC, ETH, etc.)
    modal.style.setProperty('--color-ritmo', pos.color);
    
    // 3. Mostramos el modal con una transición suave
    modal.style.display = 'block';
    
    // 4. Personalizamos el texto
    titulo.innerText = `COSECHA DE ${pos.nombre.toUpperCase()}`;
    info.innerText = `Ingresa tu dirección de Wallet externa para recibir tus ${pos.sim}.`;
    
    // Guardamos la moneda actual en una variable global temporal para saber qué estamos pagando
    window.currentCripto = pos.nombre;
}
function procesarRetiro() {
    const wallet = document.getElementById('wallet-input').value;
    
    if (wallet.length < 10) {
    lanzarAlertaMictlan("El viento del norte rechaza esa dirección. Tu wallet es demasiado corta para procesar el pacto.");
    return;
}

    // Aquí es donde en el futuro harás el fetch() a tu servidor
    alert(`Ritual iniciado. Tus monedas de ${window.currentCripto} están siendo enviadas a: ${wallet}`);
    
    cerrarRitual();
}

function cerrarRitual() {
    const modal = document.getElementById('modal-ritual');
    const cementerio = document.getElementById('campo-santo');
    modal.style.display = 'none';
    cementerio.style.filter = "none"; // Devuelve la vista normal
}
function lanzarAlma(origenElemento, destinoElemento, color, cantidad) {
    const rectOrigen = origenElemento.getBoundingClientRect();
    const rectDestino = destinoElemento.getBoundingClientRect();

    // Crear el núcleo espectral
    const alma = document.createElement('div');
    alma.className = 'alma-viajera';
    alma.style.setProperty('--color-alma', color);
    document.body.appendChild(alma);

    let posX = rectOrigen.left + rectOrigen.width / 2;
    let posY = rectOrigen.top + rectOrigen.height / 2;

    // Generador de rastro de niebla (Efecto gaseoso)
    const intervaloNiebla = setInterval(() => {
        for(let i = 0; i < 2; i++) { // Creamos 2 jirones por ciclo para dar densidad
            const nube = document.createElement('div');
            nube.className = 'rastro-niebla';
            nube.style.setProperty('--color-alma', color);
            
            // Tamaño aleatorio para cada parte de la niebla
            const size = Math.random() * 30 + 10;
            nube.style.width = size + 'px';
            nube.style.height = size + 'px';
            
            // Posición con un poco de dispersión (jitter) para que no sea línea recta
            nube.style.left = (parseFloat(alma.style.left) + (Math.random() - 0.5) * 20) + 'px';
            nube.style.top = (parseFloat(alma.style.top) + (Math.random() - 0.5) * 20) + 'px';
            
            document.body.appendChild(nube);

            nube.animate([
                { transform: 'scale(1) translateY(0)', opacity: 0.4 },
                { transform: `scale(2) translateY(${(Math.random() - 0.5) * 30}px)`, opacity: 0 }
            ], { duration: 800, easing: 'ease-out' }).onfinish = () => nube.remove();
        }
    }, 30);

    // Vuelo con inercia tétrica
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
    };
}
// 1. FUNCIÓN DEL PERGAMINO
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
                Yo, buscador de tesoros, ligo mi alma a estos dominios sagrados. 
                Acepto los ritos y la vigilia eterna a cambio de las criptas del Mictlán. 
                Cualquier violación resultará en la pérdida total de mis ganancias espirituales.
            </p>
            
            <p style="font-size: 0.75rem; line-height: 1.2; opacity: 0.8; border-top: 1px solid rgba(74, 0, 0, 0.2); padding-top: 10px;">
                I, seeker of treasures, bind my soul to these sacred domains. 
                I accept the rites and the eternal vigil in exchange for the crypts of Mictlán. 
                Any violation will result in the total loss of my spiritual earnings.
            </p>
        </div>
        <div class="pergamino-botones">
            <button class="btn-ritual" id="pacto-si">ACEPTAR PACTO</button>
            <button class="btn-ritual" style="background:#222;" id="pacto-no">HUIR</button>
        </div>
    </div>
`;
    
    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    // BOTÓN HUIR: Cierra todo inmediatamente
    document.getElementById('pacto-no').onclick = () => {
        modal.remove();
        overlay.remove();
    };

    // BOTÓN ACEPTAR: Hace el desvanecimiento y abre el cuadro rojo
    document.getElementById('pacto-si').onclick = () => {
        modal.style.transition = "all 0.8s ease-in-out";
        modal.style.opacity = "0";
        modal.style.transform = "translate(-50%, -45%) scale(0.8)";
        overlay.style.transition = "opacity 0.8s";
        overlay.style.opacity = "0";

        setTimeout(() => {
            modal.remove();
            overlay.remove();
            abrirConfirmacionFinal(); // Llamamos a la siguiente fase
        }, 800);
    };
}

// 2. FUNCIÓN DEL CUADRO ROJO (Sin redirección automática)
function abrirConfirmacionFinal() {
    const overlayFinal = document.createElement('div');
    overlayFinal.className = 'overlay-contrato';
    
    const modalFinal = document.createElement('div');
    modalFinal.className = 'modal-notificacion'; 
    
    // Estilos para asegurar que se vea como en tu imagen image_8e6e21.jpg
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

    // AQUÍ SÍ: Si da clic en DESCENDER, se va a Voidonyx
    document.getElementById('final-si').onclick = () => {
        window.location.href = "https://void-onyx-web.vercel.app";
    };

    // Si da clic en CANCELAR, se queda en el cementerio
    document.getElementById('final-no').onclick = () => {
        modalFinal.remove();
        overlayFinal.remove();
    };
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
        // Lista limpia con Bitso, Coinbase y Binance
        cuerpo.innerHTML = "<br><br>• FAUCETPAY<br>• BITSO<br>• COINBASE<br>• BINANCE";
    }

    if (pantalla) {
        pantalla.style.display = 'flex';
        setTimeout(() => { pantalla.style.opacity = '1'; }, 10);
    }
}

function cerrarCodice() {
    document.getElementById('pantalla-codice').style.display = 'none';
}
function abrirSoporte() {
    const pantalla = document.getElementById('pantalla-oraculo');
    if (pantalla) {
        pantalla.style.display = 'flex';
        // Delay para la transición de opacidad (asumiendo que .capa-oscura tiene transition)
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
        // Aquí iría la lógica para enviar el mensaje (ej. a una API)
        document.getElementById('oraculo-input').value = ""; // Limpiar input
        cerrarOraculo();
    } else {
        alert("El Oráculo requiere una ofrenda de palabras.");
    }
}
// Función universal para despertar la alerta personalizada
function lanzarAlertaMictlan(mensaje, titulo = "¡ADVERTENCIA MORTAL!") {
    // 1. Cambiamos los textos del modal fantasma dinámicamente
    document.getElementById('alerta-titulo').innerText = titulo;
    document.getElementById('alerta-mensaje').innerText = mensaje;
    
    // 2. Encendemos el contenedor cambiando el display a flex
    const modal = document.getElementById('alerta-mictlan');
    modal.style.display = 'flex';
}

// Función para volver a enterrar la alerta en el inframundo
function cerrarAlertaMictlan() {
    const modal = document.getElementById('alerta-mictlan');
    if (modal) {
        modal.style.display = 'none'; // <--- Corregido con un solo .style
    }
}
async function procesarCosecha(walletUsuario, criptoSeleccionada) {
    // 1. Validación básica antes de molestar al servidor
    if (!walletUsuario || walletUsuario.length < 10) {
        lanzarAlertaMictlan("El viento del norte rechaza esa dirección. Tu wallet es demasiado corta para procesar el pacto.", "ERROR DE RITUAL");
        return;
    }

    try {
        // 2. Despertamos el endpoint en la nube de Vercel
        const respuesta = await fetch('/api/reclamar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                wallet: walletUsuario,
                cripto: criptoSeleccionada
            })
        });

        const resultado = await respuesta.json();

        // 3. Caso A: Si Upstash Redis dice que el usuario está congelado (Error 403)
        if (respuesta.status === 403) {
            lanzarAlertaMictlan(resultado.error, "CANDADO DEL TIEMPO");
            return;
        }

        // 4. Caso B: Si algo falló en el servidor (Error 500 o 400)
        if (!respuesta.ok) {
            lanzarAlertaMictlan(resultado.error || "El ritual falló misteriosamente.", "ADVERTENCIA MORTAL");
            return;
        }

        // 5. Caso C: ¡Éxito total! (Status 200)
        // Aquí ejecutas tus animaciones visuales de transferencia de energía
        lanzarAlertaMictlan(resultado.mensaje, "RITUAL COMPLETADO");
        
        // Aquí pones tu lógica actual para actualizar los contadores en la pantalla...

    } catch (error) {
        console.error("Error en el portal:", error);
        lanzarAlertaMictlan("No se pudo establecer conexión con el inframundo. Revisa tu red.", "FALLO DE CONEXIÓN");
    }
}