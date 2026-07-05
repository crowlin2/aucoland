# Auco Familia

Landing estática de Parque de Auco desplegada desde GitHub mediante Netlify.

## Formulario y leads

El formulario `auco-leads` usa Netlify Forms. Guarda:

- nombre
- teléfono o WhatsApp
- objetivo
- convenio
- UTM, `fbclid` y `gclid`
- URL, referrer y fecha de envío

Los leads se revisan en **Netlify > Forms > auco-leads**.

El flujo valida los campos, registra el lead en Netlify y, solo después de una respuesta exitosa, abre WhatsApp con un mensaje resumido. Si Netlify falla, los datos permanecen en el formulario para reintentar.

## Configuración comercial

`site-config.js` centraliza:

- precio desde 118 UF
- pie desde 10%
- financiamiento hasta 72 cuotas
- número de WhatsApp
- descuento de convenios
- listado de convenios
- textos principales del hero

## Analítica

Configurar en **Netlify > Site configuration > Environment variables**:

- `VITE_GA_MEASUREMENT_ID`
- `VITE_GTM_ID`
- `VITE_META_PIXEL_ID`

El build genera `analytics-config.js`. Si una variable está vacía, esa integración no se carga.

Eventos disponibles, sin datos personales:

- `page_view`
- `visit_booking_click`
- `form_submit`
- `form_submit_success`
- `whatsapp_open`

## WhatsApp

El número está en `site-config.js`. Ningún CTA abre WhatsApp antes de registrar correctamente el lead en Netlify Forms.

## Convenios

Se muestran Carabineros de Chile, personas mayores, Municipalidad de Rinconada, Coopeuch y Andescoop. Otros convenios se consultan mediante el formulario. El descuento está sujeto a acreditación y condiciones vigentes.

## Desarrollo y despliegue

El proyecto sigue siendo HTML, CSS y JavaScript sin framework.

Netlify ejecuta:

```bash
node scripts/generate-runtime-config.mjs
```

y publica la raíz del repositorio.
