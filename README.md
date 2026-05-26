# BASA Shift

Aplicación web MVP para generar horarios semanales de bares y restaurantes. El objetivo es que el dueño pase de tardar unas 2 horas haciendo cuadrantes a tener una propuesta generada en pocos minutos, con conflictos visibles y mensajes listos para WhatsApp.

## Stack

- Next.js con App Router
- TypeScript
- Tailwind CSS
- Supabase preparado mediante `lib/supabase.ts`
- Modo demo/local con datos mock si no existen credenciales

## Arranque

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Variables Supabase

La app funciona sin Supabase. Para preparar la conexión futura, crea `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

## Estructura

- `app/dashboard/`: resumen semanal, cobertura y conflictos.
- `app/settings/`: configuración del local, días, horarios y turnos.
- `app/employees/`: ficha de trabajadores, puestos y restricciones.
- `app/schedule/`: cuadrante semanal, edición básica y WhatsApp.
- `components/`: layout, estado local y componentes UI.
- `lib/demo-data.ts`: datos demo de Bar Demo Centro.
- `lib/schedule-generator.ts`: algoritmo de generación.
- `types/index.ts`: tipos de dominio.

## Algoritmo

El generador lee trabajadores, configuración del local y turnos requeridos. Primero ordena los turnos críticos: viernes noche, sábado noche y domingo. Para cada puesto necesario filtra trabajadores por disponibilidad, puesto compatible, permisos de apertura/cierre, permiso de turno de 8 horas, máximo diario, solapes y horas contratadas.

Entre los candidatos válidos prioriza quien tenga menos horas asignadas. Después intenta respetar descansos preferidos y favorece el puesto principal frente a puestos secundarios. Si no encuentra candidato, crea un conflicto indicando día, turno, puesto y motivo.

Devuelve:

- Horario semanal por asignaciones.
- Horas asignadas por trabajador.
- Conflictos pendientes de revisión.

## Datos demo

Incluye un bar llamado `Bar Demo Centro`, 6 trabajadores, lunes cerrado, apertura de martes a domingo, cierre a las `02:00` viernes y sábado, restricciones de disponibilidad y varios turnos largos de 8 horas.

## WhatsApp

El botón `Preparar WhatsApp` genera un texto individual por trabajador y un enlace `wa.me` con el mensaje codificado. No se usa todavía la API oficial.

## Próximos pasos

1. Crear tablas en Supabase para locales, trabajadores, turnos, horarios y conflictos.
2. Sustituir el estado local por consultas y mutaciones a Supabase.
3. Añadir autenticación por local o propietario.
4. Conectar WhatsApp Business API para envío real y trazabilidad de mensajes.
5. Añadir reglas laborales avanzadas: descansos mínimos entre turnos, festivos, vacaciones y costes por hora.

## Chatbot con IA via OpenRouter

Configura .env.local asi:

`env
OPENROUTER_API_KEY=sk-or-v1-tu_clave
OPENROUTER_MODEL=openai/gpt-4o-mini
` 

La app usa https://openrouter.ai/api/v1/chat/completions. Sin clave valida de OpenRouter el chat no puede entender lenguaje natural.

## Cuentas por dueno con Supabase

La app soporta dos modos:

- Sin Supabase: prototipo local con `localStorage`.
- Con Supabase: login por dueno y workspace privado por usuario.

Para activar Supabase:

1. Crea un proyecto en Supabase.
2. Activa Auth con email/password.
3. Ejecuta `supabase/schema.sql` en el SQL Editor.
4. Anade a `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

Con Supabase configurado, cada dueno entra con su cuenta y solo puede leer/escribir su propio workspace gracias a RLS por `owner_id`.

### Login con Google

En Supabase:

1. Ve a `Authentication > Providers`.
2. Activa Google.
3. Configura el OAuth Client de Google.
4. Anade la URL de callback que te indique Supabase.

La pantalla de acceso mostrara `Entrar con Google` automaticamente cuando Supabase este configurado.

## Como debe hablar el dueno al chatbot

El chatbot acepta lenguaje natural, pero estos formatos son los mas robustos:

```text
Mi bar se llama La Corrala. Abrimos de martes a domingo de 12:00 a 00:00. Viernes y sabado cerramos a las 02:00.
```

```text
Ana es de sala, parcial, 20 horas. No puede viernes. Solo puede martes de 12:00 a 16:00 y sabado de 20:00 a 02:00.
```

```text
Luis es de cocina, jornada completa, 40 horas. Puede hacer turno corrido y cerrar.
```

La disponibilidad por franjas se guarda en el trabajador y el generador no asigna turnos fuera de esas horas.

