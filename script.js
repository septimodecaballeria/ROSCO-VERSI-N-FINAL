// ===== Configuración inicial =====
let preguntas = [];
let aciertos = 0;
let fallos = 0;
let indice = 0;
let tiempo = 405;
let temporizador;
let juegoIniciado = false; 

// Configuraciones de tiempo persistentes (valores por defecto)
let tiempoConfig = 405;
let modoTiempo = "total"; // Puede ser "total" o "por_letra"
let modoDocenteActivo = false;
let tituloConfig = "Rosco de las Emociones";

// Sistema de Modales Personalizados (Reemplazo total de alerts/prompts/confirms)
let modalCallback = null;

function mostrarModal(titulo, mensaje, tipo = "alert", callback = null) {
    document.getElementById("modal-titulo").textContent = titulo;
    document.getElementById("modal-mensaje").innerHTML = mensaje;
    modalCallback = callback;

    const inputDiv = document.getElementById("modal-inputs");
    const btnCancel = document.getElementById("modal-btn-cancel");
    const inputPass = document.getElementById("modal-input-password");
    
    inputDiv.style.display = "none";
    btnCancel.style.display = "none";
    inputPass.value = "";

    if (tipo === "prompt") {
        inputDiv.style.display = "block";
        btnCancel.style.display = "inline-block";
        setTimeout(() => inputPass.focus(), 150);
    } else if (tipo === "confirm") {
        btnCancel.style.display = "inline-block";
    }

    document.getElementById("custom-modal").style.display = "flex";
}

function cerrarModal(aceptado) {
    document.getElementById("custom-modal").style.display = "none";
    if (modalCallback) {
        let valor = null;
        if (document.getElementById("modal-inputs").style.display === "block") {
            valor = document.getElementById("modal-input-password").value;
        }
        modalCallback(aceptado, valor);
        modalCallback = null;
    }
}

// Permite usar la tecla Enter para aceptar la contraseña en el modal del Modo Docente
document.getElementById("modal-input-password").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        cerrarModal(true);
    }
});


// ===== Inicialización con LocalStorage =====
function inicializarJuego() {
    if(document.getElementById("ok")) document.getElementById("ok").volume = 0.15;
    if(document.getElementById("fail")) document.getElementById("fail").volume = 0.3;

    const tiempoGuardado = localStorage.getItem("rosco_emociones_tiempo");
    const modoGuardado = localStorage.getItem("rosco_emociones_modo_tiempo");
    
    if (tiempoGuardado) tiempoConfig = parseInt(tiempoGuardado);
    if (modoGuardado) modoTiempo = modoGuardado;

    const datosGuardados = localStorage.getItem("rosco_emociones_datos");
    const tituloGuardado = localStorage.getItem("rosco_emociones_titulo");


    if (tituloGuardado) {
        tituloConfig = tituloGuardado;
        }

    if (datosGuardados) {
        preguntas = JSON.parse(datosGuardados).map(p => ({...p, estado:0}));
        arrancarPantalla();
        verificarAutoguardado();
    } else {
        fetch("preguntas.json")
            .then(r => r.json())
            .then(data => {
                preguntas = data.map(p => ({...p, estado:0}));
                localStorage.setItem("rosco_emociones_datos", JSON.stringify(data));
                arrancarPantalla();
                verificarAutoguardado();
            })
            .catch(e => console.error("Error al cargar JSON", e));
    }
}

// ARREGALADO: Restablece completamente el juego al estado inicial limpio
function arrancarPantalla() {
    document.getElementById("titulo-juego").textContent = tituloConfig;
    if (document.getElementById("input-titulo-config")) {
        document.getElementById("input-titulo-config").value = tituloConfig;
    }

    juegoIniciado = false; 
    aciertos = 0;
    fallos = 0;
    indice = 0;
    
    // Limpiar estados internos e inicializar el tiempo de CADA pregunta
    preguntas.forEach(p => {
        p.estado = 0;
        p.tiempoRestante = tiempoConfig; 
    });
    
    document.getElementById("rosco").innerHTML = ""; 
    crearRosco();
    
    document.getElementById("pantalla-inicio").style.display = "block";
    document.getElementById("controles-activos").style.display = "none";
    document.getElementById("pregunta").textContent = "Cargando...";
    
    mostrarContador();
    
    clearInterval(temporizador);
    tiempo = tiempoConfig; 
    document.getElementById("tiempo").textContent = tiempo;
    
    llenarSelectorAdmin();
    document.getElementById("modo-tiempo").value = modoTiempo;
    document.getElementById("tiempo-input").value = tiempoConfig;
}

function comenzarJuego() {
    // Si el botón dice "Jugar de nuevo", limpiamos todo el estado primero
    if (document.getElementById("btn-comenzar").textContent.includes("Jugar de nuevo")) {
        arrancarPantalla(); 
        document.getElementById("btn-comenzar").textContent = "▶️ Comenzar Juego";
    }
    
    juegoIniciado = true;
    
    document.getElementById("pantalla-inicio").style.display = "none";
    document.getElementById("controles-activos").style.display = "block";
    
    document.getElementById("respuesta").value = "";
    document.getElementById("respuesta").focus();

    // --- NUEVO: INICIAR MÚSICA DE FONDO ---
    const musicaFondo = document.getElementById("musica-fondo");
    if (musicaFondo) {
        musicaFondo.volume = 0.7; // Volumen al máximo (100%)
        musicaFondo.play().catch(()=>{});
    }

    
    
    mostrar();
    reloj();
}
// Inicializar de inmediato al cargar la página
inicializarJuego();

// ===== Crear rosco =====
function crearRosco(){
  const r = 200;
  preguntas.forEach((p,i) => {
    const ang = (i / preguntas.length) * 2 * Math.PI - (Math.PI / 2);
    const x = r * Math.cos(ang) + 220;
    const y = r * Math.sin(ang) + 220;

    const div = document.createElement("div");
    div.className = "letra";
    div.style.left = x + "px";
    div.style.top = y + "px";
    div.textContent = p.letra;
    document.getElementById("rosco").appendChild(div);
  });
}

// ===== Mostrar pregunta actual =====
function mostrar(){
  if (!juegoIniciado) return;

  const letrasDivs = document.querySelectorAll(".letra");
  preguntas.forEach((p, i) => {
    if (letrasDivs[i]) {
        letrasDivs[i].classList.remove("correcta", "incorrecta");
        if (p.estado === 1) letrasDivs[i].classList.add("correcta");
        if (p.estado === 2) letrasDivs[i].classList.add("incorrecta");
    }
  });

  let vueltas = 0;
  while(preguntas[indice].estado !== 0){
    indice = (indice + 1) % preguntas.length;
    vueltas++;
    if(vueltas > preguntas.length) {
        clearInterval(temporizador);
        return terminar();
    }
  }

  // Cargar el tiempo restante guardado para la letra actual
  if (modoTiempo === "por_letra") {
      tiempo = preguntas[indice].tiempoRestante !== undefined ? preguntas[indice].tiempoRestante : tiempoConfig;
      document.getElementById("tiempo").textContent = tiempo;
  }

  document.querySelectorAll(".letra").forEach(l => l.classList.remove("activa"));
  if (document.querySelectorAll(".letra")[indice]) {
    document.querySelectorAll(".letra")[indice].classList.add("activa");
  }

  const p = document.getElementById("pregunta");
  p.style.opacity = 0;
  setTimeout(() => {
    if (preguntas[indice]) {
        p.textContent = preguntas[indice].pregunta;
    }
    p.style.opacity = 1;
  }, 200);
}
// ===== Responder =====
function responder(){
  if (!juegoIniciado) return;

  const val = document.getElementById("respuesta").value.toLowerCase().trim();
  const correcta = preguntas[indice].respuesta.toLowerCase().trim();
  const div = document.querySelectorAll(".letra")[indice];

  if(val === correcta){
    preguntas[indice].estado = 1;
    if(div) div.classList.add("correcta");
    aciertos++;
    if(document.getElementById("ok")) document.getElementById("ok").play().catch(()=>{});
  } else {
    preguntas[indice].estado = 2;
    if(div) div.classList.add("incorrecta");
    fallos++;
    if(document.getElementById("fail")) document.getElementById("fail").play().catch(()=>{});
  }

  document.getElementById("respuesta").value = "";
  indice = (indice + 1) % preguntas.length;
  mostrarContador();
  mostrar();
  document.getElementById("respuesta").focus();
  autoguardar();
}

// ===== Pasapalabra =====
function pasar(){
  if (!juegoIniciado) return;
  indice = (indice + 1) % preguntas.length;
  document.getElementById("respuesta").value = "";
  mostrar();
  document.getElementById("respuesta").focus();
  autoguardar();
}

// ===== Temporizador Avanzado =====
function reloj(){
    clearInterval(temporizador);
    temporizador = setInterval(() => {
        tiempo--;
        
        // Guardamos el tiempo en la letra actual en tiempo real
        if (modoTiempo === "por_letra") {
            preguntas[indice].tiempoRestante = tiempo;
        }
        
        document.getElementById("tiempo").textContent = tiempo;
        autoguardar();

        if(tiempo <= 0){
            if (modoTiempo === "total") {
                clearInterval(temporizador);
                terminar();
            } else {
                preguntas[indice].estado = 2; 
                fallos++;                     
                mostrarContador();            
                
                const div = document.querySelectorAll(".letra")[indice];
                if(div) div.classList.add("incorrecta");
                
                if(document.getElementById("fail")) {
                    document.getElementById("fail").play().catch(() => {});
                }
                
                pasar();                      
            }
        }
    }, 1000);
}
function terminar(){
    juegoIniciado = false;
    clearInterval(temporizador);
    localStorage.removeItem("rosco_emociones_autoguardado");

    // 📊 AGREGAMOS ESTA LÍNEA AQUÍ PARA ENVIAR A GOOGLE SHEETS
    enviarEstadisticas();

    // --- NUEVO: FRENAR FONDO Y SONIDO FINAL ---
    const musicaFondo = document.getElementById("musica-fondo");
    if (musicaFondo) {
        musicaFondo.pause();
        musicaFondo.currentTime = 0; // Lo devuelve al inicio
    }
    
    const sonidoFin = document.getElementById("sonido-fin");
    if (sonidoFin) {
        sonidoFin.volume = 0.8; // Volumen al máximo (100%)
        sonidoFin.play().catch(()=>{});
    }

    document.getElementById("controles-activos").style.display = "none";
    document.getElementById("pantalla-inicio").style.display = "block";
    document.getElementById("btn-comenzar").textContent = "🔄 Jugar de nuevo";
    
    // 1. Calculamos el total de preguntas que tiene el rosco
    const totalPreguntas = preguntas.length;

    // 2. Elegí UNA de estas dos opciones para calcular la nota:
    // OPCIÓN A: Escala estricta de 1 a 10 (0 aciertos = nota 1.0)
    const nota = (1 + (aciertos / totalPreguntas) * 9).toFixed(1);

    // 3. Capturamos el checkbox del panel admin y detectamos si está marcado
    const checkNota = document.getElementById("chk-mostrar-nota");
    const mostrarNotaFinal = checkNota ? checkNota.checked : true;

    // Si está marcado inyectamos el HTML de la nota, si no, lo dejamos vacío
    const renglonNotaHTML = mostrarNotaFinal 
        ? `<br><span style='font-size: 1.2em; font-weight: bold; color: #FFDC00;'>📝 Nota Final: ${nota} / 10</span>` 
        : '';

    // Reemplazado alert por modal estilizado con relieve sin url del navegador
    mostrarModal(
        "⏱️ ¡Fin de Juego!",
        `<div style='font-size: 1.1em; padding: 10px; line-height: 1.8;'>
            El juego ha concluido.<br><br>
            <span style='color:#2ECC40; font-weight:bold;'>✅ Aciertos: ${aciertos}</span><br>
            <span style='color:#FF4136; font-weight:bold;'>❌ Fallos: ${fallos}</span><br>
            ${renglonNotaHTML}
        </div>`
    );
}

function mostrarContador(){
    document.getElementById("aciertos").textContent = aciertos;
    document.getElementById("fallos").textContent = fallos;
}

document.getElementById("respuesta").addEventListener("keypress", function(event) {
    if (event.key === "Enter" && juegoIniciado) { 
        event.preventDefault(); 
        responder(); 
    }
});

// ==========================================
// ===== FUNCIONES DEL PANEL ADMINISTRADOR =====
// ==========================================

function toggleDocente() {
    const btn = document.getElementById("btn-login");
    const panel = document.getElementById("panel-admin");

    if (!modoDocenteActivo) {
        mostrarModal("🔒 Acceso Docente", "Introduce la contraseña para ingresar al panel de control:", "prompt", function(aceptado, password) {
            if (aceptado) {
                if (password === "docentedecente") {
                    panel.style.display = "block";
                    btn.textContent = "❌ Salir del Modo Docente";
                    btn.style.background = "#FF4136";
                    modoDocenteActivo = true;
                    actualizarListaPreguntas();
                    actualizarSelectorRoscos();
                } else {
                    mostrarModal("⚠️ Error", "Contraseña incorrecta.", "alert");
                }
            }
            
        });
    } else {
        panel.style.display = "none";
        btn.textContent = "Modo Docente";
        btn.style.background = ""; // Restaura estilo CSS por defecto
        modoDocenteActivo = false;
    }
}

function guardarConfigTiempo() {
    const modo = document.getElementById("modo-tiempo").value;
    const valor = parseInt(document.getElementById("tiempo-input").value);
    
    if (isNaN(valor) || valor <= 0) {
        return mostrarModal("⚠️ Advertencia", "Por favor, introduce un tiempo válido en segundos.", "alert");
    }
    
    modoTiempo = modo;
    tiempoConfig = valor;
    
    localStorage.setItem("rosco_emociones_tiempo", tiempoConfig);
    localStorage.setItem("rosco_emociones_modo_tiempo", modoTiempo);
    
    mostrarModal("✨ Configuración Guardada", "¡La estructura de tiempos del juego ha sido guardada y actualizada con éxito!", "alert", function() {
        arrancarPantalla();
    });
}

function llenarSelectorAdmin() {
    const selector = document.getElementById("letra-editar");
    selector.innerHTML = '<option value="">-- Selecciona una letra --</option>';
    preguntas.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.letra;
        opt.textContent = "Letra " + p.letra;
        selector.appendChild(opt);
    });
}

function cargarDatosLetra() {
    const letra = document.getElementById("letra-editar").value;
    if (!letra) return;
    const p = preguntas.find(x => x.letra === letra);
    if (p) {
        document.getElementById("nueva-pregunta").value = p.pregunta;
        document.getElementById("nueva-workspace-respuesta");
        document.getElementById("nueva-respuesta").value = p.respuesta;
    }
}

function aplicarYGuardarCambios(mensaje) {
    const datosParaGuardar = preguntas.map(p => ({letra: p.letra, pregunta: p.pregunta, respuesta: p.respuesta}));
    localStorage.setItem("rosco_emociones_datos", JSON.stringify(datosParaGuardar));
    
    mostrarModal("💾 Cambios Aplicados", mensaje, "alert", function() {
        arrancarPantalla();
        actualizarListaPreguntas();
    });
}

function guardarEdicion() {
    const letra = document.getElementById("letra-editar").value;
    if (!letra) return mostrarModal("⚠️ Aviso", "Selecciona una letra primero para editar.", "alert");
    
    const index = preguntas.findIndex(x => x.letra === letra);
    if (index !== -1) {
        preguntas[index].pregunta = document.getElementById("nueva-pregunta").value;
        preguntas[index].respuesta = document.getElementById("nueva-respuesta").value;
        aplicarYGuardarCambios("¡La pregunta de la letra " + letra + " ha sido editada correctamente!");
    }
}

function agregarPregunta() {
    const letra = document.getElementById("nueva-letra-add").value.toUpperCase().trim();
    const pregunta = document.getElementById("nueva-pregunta-add").value.trim();
    const respuesta = document.getElementById("nueva-respuesta-add").value.toLowerCase().trim();

    if (!letra || !pregunta || !respuesta) {
        return mostrarModal("⚠️ Error", "Completa todos los campos requeridos para poder añadir la pregunta.", "alert");
    }
    if (preguntas.find(p => p.letra === letra)) {
        return mostrarModal("⚠️ Letra Duplicada", "Esa letra ya existe en el rosco actual. Utiliza la sección inferior si deseas modificarla.", "alert");
    }

    preguntas.push({ letra: letra, pregunta: pregunta, respuesta: respuesta, estado: 0 });
    preguntas.sort((a, b) => a.letra.localeCompare(b.letra));

    document.getElementById("nueva-letra-add").value = "";
    document.getElementById("nueva-pregunta-add").value = "";
    document.getElementById("nueva-respuesta-add").value = "";

    aplicarYGuardarCambios(`¡La nueva Letra ${letra} se incorporó correctamente al rosco!`);
}

function eliminarPregunta() {
    const letra = document.getElementById("letra-editar").value;
    if (!letra) return mostrarModal("⚠️ Aviso", "Selecciona una letra para eliminar.", "alert");
    
    mostrarModal("❓ Confirmación", `¿Estás seguro de que quieres eliminar la letra ${letra} del rosco por completo?`, "confirm", function(aceptado) {
        if (aceptado) {
            preguntas = preguntas.filter(p => p.letra !== letra);
            document.getElementById("nueva-pregunta").value = "";
            document.getElementById("nueva-respuesta").value = "";
            aplicarYGuardarCambios(`Letra ${letra} eliminada del juego.`);
        }
    });
}

function restaurarOriginales() {
    mostrarModal("❓ Restablecer Todo", "¿Estás totalmente seguro? Se borrarán todas las modificaciones de preguntas y volverán los tiempos predeterminados de fábrica.", "confirm", function(aceptado) {
        if (aceptado) {
            localStorage.removeItem("rosco_emociones_datos");
            localStorage.removeItem("rosco_emociones_tiempo");
            localStorage.removeItem("rosco_emociones_modo_tiempo");
            localStorage.removeItem("rosco_emociones_titulo");

            tiempoConfig = 120;
            modoTiempo = "total";
            tituloConfig = "Rosco de las Emociones";
            
            arrancarPantalla();
            actualizarListaPreguntas();
            mostrarModal("🔄 Restaurado", "Los datos de fábrica han sido cargados con éxito.", "alert");
        }
    });
}
// Función para guardar el nuevo título desde el Modo Docente
function guardarTitulo() {
    const nuevoTitulo = document.getElementById("input-titulo-config").value.trim();
    
    if (!nuevoTitulo) {
        return mostrarModal("⚠️ Aviso", "El título no puede estar vacío.", "alert");
    }
    
    tituloConfig = nuevoTitulo;
    localStorage.setItem("rosco_emociones_titulo", tituloConfig);
    document.getElementById("titulo-juego").textContent = tituloConfig;
    
    mostrarModal("✅ Guardado", "El título del juego ha sido actualizado con éxito.", "alert");
}

// Función para leer y listar todas las preguntas actuales (READ del CRUD)
function actualizarListaPreguntas() {
    const container = document.getElementById("lista-preguntas-container");
    if (!container) return;
    
    // Intentamos obtener los datos del localStorage o de tu variable global 'preguntas'
    let datos = null;
    const datosGuardados = localStorage.getItem("rosco_emociones_datos");
    
    if (datosGuardados) {
        datos = JSON.parse(datosGuardados);
    } else if (typeof preguntas !== 'undefined') {
        datos = preguntas;
    }
    
    container.innerHTML = ""; // Limpiamos la lista antes de rellenar
    
    if (!datos) {
        container.innerHTML = "<p style='color: #aaa; text-align: center; font-style: italic;'>No se encontraron preguntas cargadas.</p>";
        return;
    }

    // Caso A: Si los datos son un Array estructurado [ {letra: 'A', pregunta: '...'}, ... ]
    if (Array.isArray(datos)) {
        if (datos.length === 0) {
            container.innerHTML = "<p style='color: #aaa; text-align: center;'>El rosco está vacío.</p>";
            return;
        }
        datos.forEach((item, index) => {
            renderizarItemLista(container, item.letra || item.id || index, item, index);
        });
    } 
    // Caso B: Si los datos son un Objeto indexado por letras { A: {...}, B: {...} }
    else if (typeof datos === 'object') {
        const letras = Object.keys(datos).sort();
        if (letras.length === 0) {
            container.innerHTML = "<p style='color: #aaa; text-align: center;'>El rosco está vacío.</p>";
            return;
        }
        letras.forEach((letra, index) => {
            renderizarItemLista(container, letra, datos[letra], index);
        });
    }
}

// Función auxiliar para renderizar cada fila de la lista de manera prolija
function renderizarItemLista(container, letra, info, index) {
    // Mapeamos dinámicamente según los nombres de propiedades que uses (palabra/respuesta o pregunta/definición)
    const palabra = info.palabra || info.respuesta || "Sin palabra definida";
    const pregunta = info.pregunta || info.definicion || "Sin pregunta definida";
    
    const fila = document.createElement("div");
    fila.style.padding = "8px 5px";
    fila.style.borderBottom = "1px solid rgba(255,255,255,0.08)";
    fila.style.display = "flex";
    fila.style.flexDirection = "column";
    fila.style.gap = "2px";
    
    // Alternamos un fondo sutil para que se lea mucho mejor fila por fila
    if (index % 2 === 0) {
        fila.style.background = "rgba(255,255,255,0.02)";
    }

    fila.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #00bcd4; font-size: 1.05em;">Letra ${letra.toUpperCase()}</strong>
            <span style="color: #5cb85c; font-weight: bold; background: rgba(92,184,92,0.1); padding: 2px 8px; border-radius: 4px;">${palabra}</span>
        </div>
        <div style="color: #ddd; font-style: italic; margin-top: 3px; line-height: 1.3em;">
            ${pregunta}
        </div>
    `;
    container.appendChild(fila);
}

function togglePreguntas() {
    const contenedor = document.getElementById("contenedor-preguntas-admin");
    const boton = document.getElementById("btn-toggle-preguntas");

    if (contenedor.style.display === "none" || contenedor.style.display === "") {
        contenedor.style.display = "block";
        boton.innerHTML = "🙈 Ocultar Preguntas y Respuestas";
        boton.style.backgroundColor = "#FF4136"; 
    } else {
        contenedor.style.display = "none";
        boton.innerHTML = "👁️ Mostrar Preguntas y Respuestas";
        boton.style.backgroundColor = ""; 
    }
} // <--- ESTE ES EL FINAL DE TODO EL ARCHIVO. NO VA NADA MÁS ABAJO.

// ==========================================
// ===== GESTOR DE ROSCOS (MÚLTIPLES Y ARCHIVOS) =====
// ==========================================

function obtenerRoscosGuardados() {
    const guardados = localStorage.getItem("roscos_multiples");
    return guardados ? JSON.parse(guardados) : {};
}

function actualizarSelectorRoscos() {
    const selector = document.getElementById("selector-roscos-locales");
    if (!selector) return;
    selector.innerHTML = '<option value="">-- Selecciona un rosco --</option>';
    
    const roscos = obtenerRoscosGuardados();
    for (let nombre in roscos) {
        const opt = document.createElement("option");
        opt.value = nombre;
        opt.textContent = nombre;
        selector.appendChild(opt);
    }
}

function guardarRoscoLocal() {
    const nombre = document.getElementById("nombre-guardar-rosco").value.trim();
    if (!nombre) return mostrarModal("⚠️ Aviso", "Escribe un nombre para guardar el rosco.", "alert");
    
    const roscos = obtenerRoscosGuardados();
    roscos[nombre] = {
        titulo: tituloConfig,
        tiempo: tiempoConfig,
        modo: modoTiempo,
        datos: preguntas.map(p => ({letra: p.letra, pregunta: p.pregunta, respuesta: p.respuesta}))
    };
    
    localStorage.setItem("roscos_multiples", JSON.stringify(roscos));
    document.getElementById("nombre-guardar-rosco").value = "";
    actualizarSelectorRoscos();
    mostrarModal("💾 Guardado", `El rosco "${nombre}" se ha guardado en la memoria de esta PC.`, "alert");
}

function cargarRoscoLocal() {
    const nombre = document.getElementById("selector-roscos-locales").value;
    if (!nombre) return mostrarModal("⚠️ Aviso", "Selecciona un rosco para cargar.", "alert");
    
    const roscos = obtenerRoscosGuardados();
    const rosco = roscos[nombre];
    
    if (rosco) {
        tituloConfig = rosco.titulo || nombre;
        tiempoConfig = rosco.tiempo || 120;
        modoTiempo = rosco.modo || "total";
        
        // Cargar y guardar en el estado "activo" principal
        localStorage.setItem("rosco_emociones_titulo", tituloConfig);
        localStorage.setItem("rosco_emociones_tiempo", tiempoConfig);
        localStorage.setItem("rosco_emociones_modo_tiempo", modoTiempo);
        localStorage.setItem("rosco_emociones_datos", JSON.stringify(rosco.datos));
        
        preguntas = rosco.datos.map(p => ({...p, estado: 0}));
        arrancarPantalla();
        actualizarListaPreguntas();
        mostrarModal("📂 Cargado", `Se ha cargado el rosco "${nombre}".`, "alert");
    }
}

function eliminarRoscoLocal() {
    const nombre = document.getElementById("selector-roscos-locales").value;
    if (!nombre) return mostrarModal("⚠️ Aviso", "Selecciona un rosco para eliminar.", "alert");
    
    mostrarModal("❓ Confirmación", `¿Eliminar "${nombre}" de los guardados locales?`, "confirm", function(aceptado) {
        if (aceptado) {
            const roscos = obtenerRoscosGuardados();
            delete roscos[nombre];
            localStorage.setItem("roscos_multiples", JSON.stringify(roscos));
            actualizarSelectorRoscos();
            mostrarModal("🗑️ Eliminado", "Rosco eliminado correctamente.", "alert");
        }
    });
}

// --- EXPORTAR E IMPORTAR JSON ---

function exportarRosco() {
    const paquete = {
        titulo: tituloConfig,
        tiempo: tiempoConfig,
        modo: modoTiempo,
        datos: preguntas.map(p => ({letra: p.letra, pregunta: p.pregunta, respuesta: p.respuesta}))
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(paquete, null, 2));
    const enlace = document.createElement('a');
    enlace.setAttribute("href", dataStr);
    
    const nombreArchivo = (tituloConfig || "rosco").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    enlace.setAttribute("download", nombreArchivo + ".json");
    
    document.body.appendChild(enlace); 
    enlace.click();
    enlace.remove();
}

function importarRosco(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const contenido = JSON.parse(e.target.result);
            let nuevasPreguntas = [];
            
            // Compatibilidad por si cargas un JSON antiguo (solo array) o el nuevo paquete
            if (Array.isArray(contenido)) {
                nuevasPreguntas = contenido;
            } else if (contenido.datos && Array.isArray(contenido.datos)) {
                nuevasPreguntas = contenido.datos;
                tituloConfig = contenido.titulo || "Rosco Importado";
                tiempoConfig = contenido.tiempo || 120;
                modoTiempo = contenido.modo || "total";
                
                localStorage.setItem("rosco_emociones_titulo", tituloConfig);
                localStorage.setItem("rosco_emociones_tiempo", tiempoConfig);
                localStorage.setItem("rosco_emociones_modo_tiempo", modoTiempo);
            } else {
                throw new Error("Formato no válido");
            }
            
            preguntas = nuevasPreguntas.map(p => ({...p, estado: 0}));
            localStorage.setItem("rosco_emociones_datos", JSON.stringify(nuevasPreguntas));
            
            mostrarModal("✅ Éxito", "El rosco se ha importado correctamente.", "alert", function() {
                arrancarPantalla();
                actualizarListaPreguntas();
            });
            
        } catch (error) {
            mostrarModal("❌ Error", "El archivo no tiene un formato válido o está dañado.", "alert");
        }
        event.target.value = ""; // Resetea el input
    };
    reader.readAsText(file);
}
// ===== SISTEMA DE AUTOGUARDADO CORREGIDO =====

function autoguardar() {
    if (!juegoIniciado) return;
    const estadoActual = {
        preguntas: preguntas,
        aciertos: aciertos,
        fallos: fallos,
        indice: indice,
        tiempo: tiempo
    };
    localStorage.setItem("rosco_emociones_autoguardado", JSON.stringify(estadoActual));
}

function verificarAutoguardado() {
    const guardado = localStorage.getItem("rosco_emociones_autoguardado");
    if (guardado) {
        mostrarModal(
            "💾 Partida en Pausa",
            "Se detectó un juego sin terminar. ¿Deseas retomar el rosco exactamente donde lo dejaste?",
            "confirm",
            function(aceptado) {
                if (aceptado) {
                    const estado = JSON.parse(guardado);
                    preguntas = estado.preguntas;
                    aciertos = estado.aciertos;
                    fallos = estado.fallos;
                    indice = estado.indice;
                    tiempo = estado.tiempo;

                    // Restaurar contadores en la interfaz
                    mostrarContador();
                    document.getElementById("tiempo").textContent = tiempo;
                    
                    // Iniciar el juego (comenzarJuego llamará a mostrar() y este pintará el rosco)
                    comenzarJuego(); 
                } else {
                    // Si el alumno descarta, limpiamos la memoria
                    localStorage.removeItem("rosco_emociones_autoguardado");
                }
            }
        );
    }
}
// ==========================================
// ===== ENVÍO DE ESTADÍSTICAS A GOOGLE SHEETS =====
// ==========================================
function enviarEstadisticas() {
    // IMPORTANTE: Asegúrate de pegar aquí la URL de tu nuevo despliegue de Apps Script
    const urlAppsScript = "https://script.google.com/macros/s/AKfycbwk5kpCDUsX3956S6r2FNMVyrRMuModhFOsgKjWm7D9XK2E8uZrIciEXPNnSiTLZswb4g/exec";

    // 1. Capturamos los nuevos datos del formulario
    const inputNombre = document.getElementById("input-nombre-apellidos");
    const inputCentro = document.getElementById("input-centro");
    const inputCurso = document.getElementById("input-curso-grupo");

    const nombre = (inputNombre && inputNombre.value.trim() !== "") ? inputNombre.value : "Anónimo";
    const centro = (inputCentro && inputCentro.value.trim() !== "") ? inputCentro.value : "No especificado";
    const cursoGrupo = (inputCurso && inputCurso.value.trim() !== "") ? inputCurso.value : "No especificado";

    // 2. Calculamos la nota internamente para enviarla
    const totalPreguntas = preguntas.length;
    let notaCalculada = "0.0";
    if (totalPreguntas > 0) {
        notaCalculada = (1 + (aciertos / totalPreguntas) * 9).toFixed(1);
    }

    // 3. Armamos el paquete de datos
    const datos = {
        aciertos: aciertos,
        fallos: fallos,
        nota: notaCalculada,
        nombreApellidos: nombre,
        centro: centro,
        cursoGrupo: cursoGrupo
    };

    // 4. Hacemos el envío al Excel
    fetch(urlAppsScript, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8" 
        },
        body: JSON.stringify(datos)
    })
    .then((response) => {
        console.log("📊 Estadísticas y datos de participante enviados con éxito a Google Sheets.");
    })
    .catch((error) => {
        console.error("❌ Error al enviar estadísticas:", error);
    });
}
