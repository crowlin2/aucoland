# Auco Familia

Landing estática de Parque de Auco desplegada desde GitHub mediante Netlify.

## Desarrollo seguro

Los cambios se desarrollan en la rama `dev` y se revisan mediante Pull Request antes de fusionarlos en `main`. La rama `main` es la fuente del despliegue de producción.

## Formulario y leads

El formulario `leads-parque-auco` usa Netlify Forms. Guarda:

- nombre
- teléfono o WhatsApp
- objetivo
- convenio
- asesor asignado y código de solicitud
- UTM, `fbclid` y `gclid`
- URL, referrer y fecha de envío

Los leads se revisan en **Netlify > Forms > leads-parque-auco**.

## Flujo de confirmación

Tras validar el formulario, el sitio normaliza el teléfono chileno, solicita una única asignación de asesor y envía los datos mediante POST codificado a Netlify Forms. Solo cuando Netlify responde correctamente guarda la continuación en `sessionStorage` y redirige a `/gracias`.

La página `/gracias` valida que la solicitud tenga menos de 10 minutos, registra una sola conversión de Google Ads por `lead_id` y abre el WhatsApp del mismo asesor. Si la apertura automática no funciona, mantiene visible el botón **Continuar a WhatsApp**.
## Repartición de WhatsApp

La Function `netlify/functions/asignar-lead.js` distribuye solicitudes en orden alternado:

1. Álvaro Figueroa
2. Ana Ponce
3. Álvaro Figueroa
4. Ana Ponce

La asignación se guarda en Netlify Blobs:

- store: `whatsapp-routing`
- clave: `last-assigned`
- consistencia: `strong`

El frontend nunca elige el asesor ni contiene los números. Tanto el formulario como los CTAs genéricos solicitan la asignación a:

```text
/.netlify/functions/asignar-lead
```

## Variables privadas de Netlify

Crear en **Netlify → Project configuration → Environment variables**:

```text
WHATSAPP_ALVARO = 56988263485
WHATSAPP_ANA = 56961162680
```

Usar solo dígitos, en formato internacional, sin `+`, espacios ni guiones.

En planes sin Secrets Controller, dejar desmarcado `Contains secret values`, con `All scopes` y `Same value for all deploy contexts`. Los valores siguen fuera del frontend porque Netlify publica únicamente `dist/` y la Function los lee en servidor.

Después de crear o modificar estas variables, ejecutar un nuevo deploy en Netlify. No usar prefijos públicos como `VITE_` o `NEXT_PUBLIC_`.

## Analítica

La función central `trackEvent` funciona aunque GA o Meta Pixel no estén instalados. Los eventos de asignación son:

- `whatsapp_assignment_requested`
- `whatsapp_assignment_success`
- `whatsapp_assignment_error`
- `whatsapp_opened`

Eventos estandar de Meta Pixel:

- `PageView`: se dispara con el codigo base del Pixel al cargar la pagina.
- `Lead`: se dispara una sola vez en `/gracias` cuando existe una solicitud confirmada y reciente.
- `Contact`: se dispara una sola vez por `lead_id` cuando el usuario abre WhatsApp para contactar al asesor.

Los demas eventos del embudo se mantienen como `trackCustom` para diagnostico y audiencias, sin marcarlos como conversion estandar.

La configuración opcional existente sigue usando:

- `VITE_GA_MEASUREMENT_ID`
- `VITE_META_PIXEL_ID`

Estos identificadores analíticos sí son públicos por naturaleza. Los números de WhatsApp no forman parte de esa configuración.

## Instalación y validación

Requiere Node.js 20 o superior.

```bash
npm ci
npm test
npm run build
```

El build publica únicamente `dist/`. El código de Functions, README, dependencias y variables privadas no se copian al directorio público.

## Cómo probar la alternancia

1. Configurar las dos variables privadas.
2. Ejecutar un deploy.
3. En **Netlify > Blobs**, abrir el store `whatsapp-routing`.
4. Eliminar la clave `last-assigned` para iniciar una prueba controlada.
5. Enviar cuatro solicitudes válidas.
6. Confirmar la secuencia Álvaro, Ana, Álvaro, Ana.
7. Repetir desde incógnito, otro navegador o dispositivo: el estado no debe reiniciarse.
8. Probar un formulario inválido: no debe invocar la Function.
9. Hacer doble clic: el bloqueo del frontend debe generar una sola solicitud.
10. Comprobar que el mensaje incluye datos del formulario, código de solicitud, asesor y origen.

Las pruebas automatizadas usan un store en memoria y no consumen asignaciones reales.

## Limitación de concurrencia

Netlify Blobs persiste el estado global y permite lecturas fuertes, pero no ofrece una operación atómica de compare-and-swap. Dos solicitudes que lleguen exactamente al mismo tiempo podrían leer el mismo último asesor antes de escribir. Para una garantía estricta bajo alta concurrencia se necesita un almacén con incremento o transacción atómica.

Además, los stores site-wide se comparten entre contextos de despliegue del mismo proyecto. Una prueba contra un Deploy Preview puede consumir una asignación del mismo store del sitio.

## Configuración comercial

`site-config.js` centraliza precio, pie, cuotas, descuento de convenios y textos comerciales. Los números privados de asesores no se guardan allí.
