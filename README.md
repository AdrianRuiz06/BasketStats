# BlueCore HoopStats 🏀

**BlueCore HoopStats** es una aplicación web progresiva (PWA) diseñada para registrar, analizar y exportar estadísticas de baloncesto en tiempo real. Pensada para entrenadores, delegados y aficionados que buscan una herramienta profesional, rápida y gratuita.

🔗 **[Ver Demo Online](https://AdrianRuiz06.github.io/BasketStats/)** *(Sustituye por tu URL real)*

## ✨ Características Principales

*   **📊 Registro de Estadísticas**: Anota puntos (T2, T3, TL), rebotes, asistencias, robos, tapones, pérdidas y faltas.
*   **🎯 Mapa de Tiros Interactivo**: Registra visualmente desde dónde se ha realizado cada lanzamiento sobre una cancha de madera realista.
*   **📱 WebApp Instalable (PWA)**: Instálala en tu móvil como una app nativa. Funciona **Offline** (sin internet).
*   **📂 Exportación PDF**: Genera informes post-partido completos que incluyen tablas estadísticas y los gráficos de tiro de ambos equipos.
*   **⏱️ Cronómetro de Partido**: Controla el tiempo de juego directamente desde la app.
*   **⚖️ Cumplimiento Legal**: Incluye Banner de Cookies y Política de Privacidad adaptada.

## 🚀 Cómo Usar

1.  **Añadir Jugadores**: Ve a la pestaña "Roster" e introduce el nombre y número de los jugadores locales y visitantes.
2.  **Iniciar Partido**: En "En Juego", pulsa los botones de acción para cada jugador.
3.  **Registrar Tiros**: Si pulsas un botón de tiro (2P, 3P), aparecerá una cancha para que marques la posición exacta.
4.  **Ver Estadísticas**: Consulta la tabla en tiempo real en la pestaña "Estadísticas".
5.  **Exportar**: Al terminar, ve a "Exportar" y descarga el PDF.

## 🛠️ Tecnologías Utilizadas

*   **HTML5 & CSS3**: Diseño responsive y moderno (Glassmorphism, Dark Mode).
*   **JavaScript (Vanilla)**: Lógica rápida sin frameworks pesados.
*   **Canvas API**: Para el renderizado de la cancha y los tiros.
*   **Chart.js**: Gráficos circulares de distribución de puntos.
*   **jsPDF & AutoTable**: Generación de informes PDF en el cliente.
*   **Service Workers**: Para las capacidades Offline (PWA).

## 📦 Instalación Local

Si quieres ejecutar el proyecto en tu ordenador:

1.  Clona el repositorio:
    ```bash
    git clone https://github.com/AdrianRuiz06/BasketStats.git
    ```
2.  Entra en la carpeta:
    ```bash
    cd BasketStats
    ```
3.  Ejecuta el servidor local (requiere Node.js):
    ```bash
    node server.js
    ```
4.  Abre tu navegador en `http://localhost:3000`.

## 📄 Licencia y Privacidad

Este proyecto es de código abierto.
*   **Privacidad**: No recopilamos datos personales en servidores. Toda la información del partido se guarda localmente en tu dispositivo (`localStorage`).
*   **Cookies**: Solo utilizamos almacenamiento local para la funcionalidad de la app.

---
Hecho con 🏀 por **Adrián Ruiz**
