# Plano Interactivo GSCH

Aplicación web interactiva para visualización de planos, espacios y recorridos multi-mapa y multi-nivel con soporte de despliegue en **Vercel** y servidor local.

---

## 🚀 Despliegue en Vercel (Paso a paso)

El proyecto está 100% preparado para funcionar en Vercel con guardado en la nube con 1 solo clic.

### Paso 1: Subir a GitHub
1. Creá un nuevo repositorio en tu cuenta de GitHub (ej.: `plano-gsch`).
2. Subí todos los archivos de esta carpeta a ese repositorio.

### Paso 2: Importar en Vercel
1. Ingresá a tu panel en [vercel.com](https://vercel.com) y hacé clic en **"Add New... > Project"**.
2. Seleccioná el repositorio de GitHub que acabás de crear y hacé clic en **"Deploy"**.
3. En menos de un minuto tu sitio ya estará público con su URL propia (ej.: `https://plano-gsch.vercel.app`).

### Paso 3: Activar el guardado en la nube (Vercel Blob / KV)
Para que el botón **"🚀 Guardar en servidor"** funcione directamente en Vercel:
1. En el panel de tu proyecto en Vercel, andá a la pestaña **"Storage"**.
2. Hacé clic en **"Create Database"** y seleccioná **"Blob"** (o **"KV"**).
3. Hacé clic en **"Continue"** y luego en **"Connect to Project"** para vincularlo a tu proyecto.
4. ¡Listo! Vercel inyectará automáticamente las credenciales necesarias. A partir de ese momento, cuando guardes cambios desde el panel de admin en la web, se actualizarán en la nube de Vercel para todos los usuarios.

> **Nota:** Si aún no vinculaste el Storage, el sistema te avisará amablemente y descargará automáticamente una copia de respaldo `config.json` para que nunca pierdas tu trabajo.

---

## 💻 Ejecución en local (Computadora / Red institucional)

Si preferís correrlo en tu propia computadora o en la red local del colegio:
* **En Windows:** Hacé doble clic en `iniciar-servidor.bat`.
* **Por terminal:** Ejecutá `node server.js`.
* Abrí en tu navegador: `http://localhost:3000` (o la IP local que muestra en consola para celulares).

---

## 📁 Estructura del Proyecto

* `index.html`: Aplicación web completa con interfaz de usuario y administrador.
* `api/config.js`: Serverless Function de Vercel para lectura/escritura (`GET/POST /api/config`).
* `config.json`: Configuración inicial por defecto de los planos, espacios, recorridos y enlaces.
* `server.js`: Servidor local Node.js sin dependencias.
* `iniciar-servidor.bat`: Lanzador en 1 clic para Windows.
* `package.json`: Definición del proyecto y dependencias de Vercel Storage.
* `vercel.json`: Reglas de enrutamiento para Vercel.
