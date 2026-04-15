import React, { useState, useEffect } from "react";
import { Undo2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Imagenes de preguntas ../../../assets/
import perroImg from "../../../assets/perro.svg";
import holaImg from "../../../assets/hola.svg";
import tacosImg from "../../../assets/tacos.svg";
import amarilloImg from "../../../assets/amarillo.svg";
import carroImg from "../../../assets/carro_lsm.svg";
import elefanteImg from "../../../assets/elefante_lsm.svg";
import tiendaImg from "../../../assets/tienda.svg";
import adiosImg from "../../../assets/adios.svg";
import refrescoImg from "../../../assets/refresco.svg";
import gatoImg from "../../../assets/gato_lsm.svg";
import autobusImg from "../../../assets/autobus.svg";
import montanaImg from "../../../assets/montaña.svg";
import libroImg from "../../../assets/libro.svg";
import ventanaImg from "../../../assets/ventana.svg";
import cieloImg from "../../../assets/cielo.svg";

// 15 Palabras Correctas (Base maestra)
const PalabrasCorrectas = [
  { palabra: "Perro", img: perroImg },
  { palabra: "Hola", img: holaImg },
  { palabra: "Tacos", img: tacosImg },
  { palabra: "Amarillo", img: amarilloImg },
  { palabra: "Carro", img: carroImg },
  { palabra: "Elefante", img: elefanteImg },
  { palabra: "Tienda", img: tiendaImg },
  { palabra: "Adiós", img: adiosImg },
  { palabra: "Refresco", img: refrescoImg },
  { palabra: "Gato", img: gatoImg },
  { palabra: "Autobús", img: autobusImg },
  { palabra: "Montaña", img: montanaImg },
  { palabra: "Libro", img: libroImg },
  { palabra: "Ventana", img: ventanaImg },
  { palabra: "Cielo", img: cieloImg },
];

// 200 Respuestas Incorrectas (Base maestra)
const respuestasIncorrectas = [
  "Montaña","Libro","Ventana","Cielo","Computadora","Playa","Sombrero","Zapato","Árbol","Río",
  "Teléfono","Escuela","Fuego","Nube","Camisa","Lámpara","Silla","Mesa","Reloj","Puerta",
  "Bicicleta","Chocolate","Pelota","Jardín","Estrella","Café","Música","Martillo","Avión","Hospital",
  "Ciudad","Isla","Tren","Dinero","Llave","Espejo","Mochila","Ratón","Cuaderno","Luna",
  "Sol","Flor","Banco","Pan","Agua","Naranja","Camión","Calle","Globo","Pintura",
  "Carpeta","Ventilador","Escalera","Corazón","Botella","Cama","Almohada","Toalla","Cocina","Plato",
  "Cuchara","Tenedor","Radio","Televisión","Doctor","Policía","Parque","Tierra","Arena","Mar",
  "Hielo","Nieve","Papel","Tijeras","Guitarra","Zapatería","Biblioteca","Teatro","Museo","Restaurante",
  "Pastel","Helado","Fresa","Limón","Toro","Caballo","León","Tigre","Serpiente","Tortuga",
  "Lápiz","Calculadora","Coche","Autobús","Semáforo","Puente","Castillo","Molino","Cohete","Mapa",
  "Puerta","Escudo","Bandera","Campana","Tambor","Flauta","Violín","Piano","Teclado","Monitor",
  "Impresora","Cable","Router","Servidor","Pantalla","Auricular","Micrófono","Batería","Motor","Rueda",
  "Ventana","Tejado","Pared","Piso","Techo","Columna","Pasillo","Jardinería","Huerto","Semilla",
  "Trigo","Maíz","Arroz","Frijol","Lenteja","Tomate","Cebolla","Papa","Zanahoria","Pepino",
  "Lechuga","Espinaca","Manzana","Pera","Durazno","Mango","Piña","Sandía","Melón","Cereza",
  "Ciruela","Granada","Coco","Almendra","Nuez","Avellana","Miel","Azúcar","Sal","Pimienta",
  "Canela","Vainilla","Aceite","Vinagre","Queso","Yogur","Mantequilla","Crema","Sopa","Ensalada",
  "Sandwich","Tostada","Galleta","Panadería","Pastelería","Cafetería","Mercado","Farmacia","Gasolinera","Hotel",
  "Hostal","Aeropuerto","Terminal","Puerto","Carretera","Autopista","Sendero","Montículo","Pradera","Bosque",
  "Selva","Desierto","Volcán","Lago","Laguna","Cascada","Acantilado","Valle","Cueva","Islote"
];

export default function Quiz({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();

  // ⚠️ NUEVO ESTADO: Guarda las preguntas revueltas para esta partida
  const [preguntasJuego, setPreguntasJuego] = useState(() => 
    [...PalabrasCorrectas].sort(() => Math.random() - 0.5)
  );

  // ESTADOS DEL JUEGO
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [opciones, setOpciones] = useState([]);
  const [seleccion, setSeleccion] = useState(null);
  const [bloqueado, setBloqueado] = useState(false);

  const juegoTerminado = preguntaActual >= preguntasJuego.length;

  useEffect(() => {
    if (typeof setSidebarOpen === "function") {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  // Lógica para generar las 4 opciones revueltas cada vez que cambia la pregunta
  useEffect(() => {
    // Solo revolvemos si el juego NO ha terminado
    if (!juegoTerminado && preguntasJuego.length > 0) {
      // ⚠️ Ahora leemos de preguntasJuego, que es el arreglo barajado
      const respuestaCorrecta = preguntasJuego[preguntaActual].palabra;
      
      // Elegir 3 incorrectas al azar que NO sean la respuesta correcta
      let incorrectasAleatorias = [...respuestasIncorrectas]
        .filter((p) => p !== respuestaCorrecta)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      // Juntarlas y revolverlas
      const opcionesRevueltas = [...incorrectasAleatorias, respuestaCorrecta]
        .sort(() => Math.random() - 0.5);

      setOpciones(opcionesRevueltas);
      setSeleccion(null);
      setBloqueado(false);
    }
  }, [preguntaActual, juegoTerminado, preguntasJuego]);

  const manejarClick = (opcion) => {
    if (bloqueado) return;
    setSeleccion(opcion);
    setBloqueado(true);

    // Esperar 2 segundos para ver el resultado y avanzar
    setTimeout(() => {
      setPreguntaActual((prev) => prev + 1);
    }, 2000);
  };

  // ⚠️ Función para re-barajar todo si el usuario quiere jugar de nuevo
  const reiniciarJuego = () => {
    setPreguntasJuego([...PalabrasCorrectas].sort(() => Math.random() - 0.5));
    setPreguntaActual(0);
    setSeleccion(null);
    setBloqueado(false);
  };

  const letras = ["A", "B", "C", "D"];
  const correctaActual = preguntasJuego[preguntaActual]?.palabra;

  return (
    <div className="relative isolate min-h-screen w-full bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 flex flex-col justify-center items-center overflow-hidden pt-14 pb-4 sm:pb-8 px-4 sm:px-6 lg:px-8">
      
      {/* 🔙 Botón volver y Título */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 sm:left-6 flex items-center gap-2 text-gray-800 dark:text-gray-100 hover:text-indigo-400 transition-all duration-300 z-20"
      >
        <Undo2 size={24} strokeWidth={2.2} />
        <span className="hidden sm:inline font-medium">Volver</span>
      </button>

      <h1 className="absolute top-5 right-6 sm:right-10 text-xl font-semibold z-20">
        SignAI
      </h1>

      {/* 🎮 CONTENIDO DEL JUEGO */}
      <div className="z-10 w-full max-w-5xl px-6">
        
        {juegoTerminado ? (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-white dark:bg-[#151822] rounded-3xl p-12 shadow-xl text-center max-w-2xl mx-auto border border-gray-200 dark:border-gray-800"
          >
            <h2 className="text-4xl sm:text-5xl font-extrabold text-indigo-600 mb-4">¡Excelente!</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">Has completado todas las preguntas correctamente.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={reiniciarJuego}
                className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200 px-8 py-3 rounded-xl font-bold text-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition"
              >
                Jugar de nuevo
              </button>
              <button 
                onClick={() => navigate(-1)}
                className="bg-indigo-600 text-white dark:bg-indigo-500 dark:text-slate-50 px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 transition"
              >
                Regresar al menú
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-center justify-center">
            
            {/* IZQUIERDA: IMAGEN */}
            <motion.div 
              key={`img-${preguntaActual}`}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="bg-white dark:bg-[#151822] rounded-[2rem] shadow-xl border border-gray-200 dark:border-gray-800 p-8 w-full max-w-sm aspect-square flex items-center justify-center"
            >
              {preguntasJuego[preguntaActual]?.img ? (
                <img 
                  src={preguntasJuego[preguntaActual].img} 
                  alt="Seña" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-gray-300 dark:text-gray-500 font-bold text-2xl">Imagen aquí</span>
              )}
            </motion.div>

            {/* DERECHA: BOTONES DE RESPUESTA */}
            <div className="w-full max-w-md flex flex-col gap-4">
              
              {/* Textos superiores */}
              <div className="flex flex-col items-center text-center mb-2">
                <span className="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                  Pregunta {preguntaActual + 1} de {preguntasJuego.length}
                </span>
                <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Elige la palabra que corresponde a la seña mostrada.
                </p>
              </div>

              {opciones.map((opcion, index) => {
                
                // Determinar colores de estado
                let bgClass = "bg-white dark:bg-[#151822] text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:shadow-md hover:-translate-y-0.5";
                
                if (seleccion) {
                  if (opcion === correctaActual) {
                    bgClass = "bg-[#22c55e] text-white border-[#22c55e] shadow-lg scale-[1.02]";
                  } else if (opcion === seleccion && opcion !== correctaActual) {
                    bgClass = "bg-red-500 text-white border-red-500 shadow-md";
                  } else {
                    bgClass = "bg-white dark:bg-[#151822] text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-800 opacity-60";
                  }
                }

                return (
                  <motion.button
                    key={index}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => manejarClick(opcion)}
                    disabled={bloqueado}
                    className={`w-full py-3.5 px-6 rounded-2xl border-2 font-semibold text-base md:text-lg text-center shadow-sm transition-all duration-300 ease-in-out ${bgClass}`}
                  >
                    {letras[index]}) {opcion}
                  </motion.button>
                );
              })}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}