# 📅 PlanSync - Agenda & Planificador de Pendientes (Móvil & PC)

Planificador inteligente de pendientes sincronizado en la nube con **Supabase** y listo para publicar gratis en **GitHub Pages** para usarlo en tu celular como una App nativa (PWA).

---

## 📱 Cómo sincronizar con tu Celular y Supabase

### Paso 1: Configurar la base de datos en Supabase (1 minuto)
1. Ve a tu cuenta en [Supabase](https://supabase.com) y entra a tu proyecto (o crea uno nuevo gratuito).
2. En el menú lateral izquierdo, haz clic en **SQL Editor**.
3. Abre el archivo [supabase_setup.sql](file:///c:/Users/acer/Desktop/Antigravity/Agenda/supabase_setup.sql), copia todo su contenido, pégalo en el editor de Supabase y presiona **RUN**.
4. Ve a **Project Settings > API** (icono de engranaje) y copia:
   - **Project URL** (ej: `https://xyzabcdefg.supabase.co`)
   - **anon public key** (clave pública larga que empieza por `eyJ...`)

---

### Paso 2: Publicar en GitHub Pages para abrirlo desde tu Celular
1. Crea un nuevo repositorio en tu cuenta de [GitHub](https://github.com/new) (ejemplo: `mi-agenda`).
2. En la terminal dentro de esta carpeta, conecta y sube el proyecto:
   ```powershell
   git remote add origin https://github.com/TU_USUARIO/mi-agenda.git
   git push -u origin main
   ```
3. En tu repositorio en GitHub, ve a **Settings > Pages**.
4. En **Branch**, selecciona `main` y carpeta `/ (root)`, luego haz clic en **Save**.
5. En unos segundos, GitHub te dará un enlace público HTTPS:
   `https://TU_USUARIO.github.io/mi-agenda/`

---

### Paso 3: Conectar la Nube en tu Celular o PC
1. Abre el enlace en tu celular (Chrome o Safari) o en tu computadora.
2. Haz clic en el botón superior **"Modo Local / ☁️"**.
3. Pega tu **Project URL** y tu **Anon Key** de Supabase y presiona **"Conectar y Sincronizar"**.
4. ¡Listo! Cualquier pendiente que ingreses, marques como realizado o modifiques se sincronizará al instante en ambos dispositivos en tiempo real.

---

### 📲 Cómo instalarlo como App en tu Celular (PWA)
* **En Android (Chrome)**: Abre el enlace, toca el menú de los 3 puntos (⋮) y selecciona **"Agregar a la pantalla principal"** o **"Instalar aplicación"**.
* **En iPhone (Safari)**: Abre el enlace, toca el botón de Compartir (icono con flecha hacia arriba) y selecciona **"Agregar al inicio"** (+).
* Tendrá su propio icono, pantalla completa sin barra de navegación y funcionará de manera rápida y fluida.
