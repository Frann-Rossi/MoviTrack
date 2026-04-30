# 💸 MoviTrack - Gestión Financiera Inteligente

MoviTrack es una aplicación web moderna, rápida y segura diseñada para ayudarte a tomar el control de tus finanzas personales. Más que un simple registro de gastos, cuenta con una Inteligencia Artificial integrada que analiza tus movimientos y te ayuda a generar informes.

![MoviTrack](/public/favicon.svg) <!-- Si agregas un pantallazo, ponlo aquí -->

## ✨ Características Principales

- **Dashboard Intuitivo:** Visualiza tu saldo, ingresos y egresos al instante con un diseño "Glassmorphism" premium.
- **MoviBot (IA Integrada):** Un asistente financiero potenciado por LLaMA 3 (Groq) que conoce tu historial reciente y te da consejos personalizados.
- **Sistema de Usuarios Seguro:** Autenticación completa impulsada por Neon Auth (Better Auth). Tus datos son privados y exclusivos para ti.
- **Exportación a PDF:** Genera informes financieros estéticos y detallados con un solo clic.
- **Diseño Mobile-First:** Totalmente responsivo. En móviles, las tablas se transforman en tarjetas amigables para una mejor lectura.

## 🛠️ Stack Tecnológico

Esta aplicación fue construida utilizando las herramientas más modernas del ecosistema web:

- **Frontend:** [Astro](https://astro.build/) + [React](https://react.dev/) + [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend (API):** [Hono](https://hono.dev/) (Ejecutándose sobre los endpoints de Astro)
- **Base de Datos:** [PostgreSQL (Neon)](https://neon.tech/) gestionada con [Drizzle ORM](https://orm.drizzle.team/)
- **Autenticación:** [Better Auth](https://better-auth.com/) (Neon Auth)
- **Inteligencia Artificial:** [Groq SDK](https://groq.com/) (Modelo `llama-3.3-70b-specdec`)
- **Despliegue:** Preparado nativamente para [Vercel](https://vercel.com/) (Serverless)

---

## 🚀 Guía de Instalación Local

Sigue estos pasos para correr MoviTrack en tu propia máquina.

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone <URL_DE_TU_REPO>
cd MoviTrack
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo llamado `.env` en la raíz del proyecto. Deberás completarlo con tus propias claves:

```env
# URL de conexión de tu base de datos Neon
DATABASE_URL="postgresql://usuario:contraseña@servidor.neon.tech/neondb?sslmode=require"

# API Key de Groq para que funcione MoviBot
GROQ_API_KEY="gsk_tu_clave_aqui"

# URL base de la aplicación (usar localhost para desarrollo)
BETTER_AUTH_URL="http://localhost:4321"

# Un string largo y aleatorio para encriptar las sesiones (puedes inventarlo)
BETTER_AUTH_SECRET="cualquier_cadena_larga_y_segura_aqui"
```

### 3. Migrar la Base de Datos

Antes de arrancar, debes crear las tablas en tu base de datos Neon:

```bash
npx drizzle-kit push
```

### 4. ¡Iniciar Servidor!

```bash
npm run dev
```
Abre `http://localhost:4321` en tu navegador. Deberías ver la pantalla de inicio de sesión.

---

## ☁️ Despliegue en Vercel

MoviTrack está configurado con el adaptador `@astrojs/vercel`. Para subirlo a producción:

1. Sube tu código a GitHub.
2. Crea un nuevo proyecto en **Vercel** e importa tu repositorio.
3. En la sección de **Environment Variables** de Vercel, agrega las 4 variables de tu archivo `.env`.
   - ⚠️ **IMPORTANTE:** Recuerda cambiar `BETTER_AUTH_URL` por el dominio real que te asigne Vercel (ej: `https://movitrack.vercel.app`), asegurándote de incluir `https://` y no dejar una barra `/` al final.
4. Dale a "Deploy". Vercel compilará Astro en modo Serverless automáticamente.

---
*Desarrollado con ❤️ para organizar mejor las finanzas.*
