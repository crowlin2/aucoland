# Tracking de Meta

## Arquitectura

- El Pixel `1004828548959223` se instala una sola vez en el `<head>` de cada página pública.
- `PageView` y el evento browser `Lead` se envían desde el Pixel.
- Después de guardar correctamente el formulario, `/.netlify/functions/meta-event` envía el mismo `Lead` por Conversions API.
- Ambos eventos usan el mismo `event_id` (`leadId`) para que Meta pueda deduplicarlos.
- `_fbp`, `_fbc`, `fbclid` y UTMs se conservan durante 90 días. Los valores también quedan en el registro del formulario de Netlify.
- Los detalles de necesidad o urgencia no se mandan como parámetros de Meta.

## Variables de entorno en Netlify

Obligatorias:

- `META_PIXEL_ID=1004828548959223`
- `META_CAPI_ACCESS_TOKEN`: token generado en Events Manager para el Dataset/Pixel.

Recomendadas:

- `META_GRAPH_API_VERSION=v23.0` (actualizar de forma controlada al cambiar de versión).
- `META_ALLOWED_SITE_URL=https://aucofamilia.com`

Sólo para pruebas:

- `META_CAPI_TEST_EVENT_CODE`: código temporal de la pestaña **Test Events**. Eliminarlo al terminar la validación.

## Validación después del despliegue

1. Abrir Events Manager > Test Events.
2. Visitar una URL con `?fbclid=TEST-FBCLID&utm_source=meta&utm_campaign=tracking-test`.
3. Completar el formulario con un teléfono de prueba válido.
4. Confirmar que aparece un `Lead` recibido desde Browser y Server, deduplicado como un solo evento.
5. Revisar Diagnostics y Event Match Quality durante las siguientes 24 horas.
6. Confirmar en Netlify Forms que se guardaron `fbp`, `fbc`, `fbclid`, `landing_page` y `landing_referrer`.

Nunca guardar el token de Conversions API en archivos del frontend, Git o el HTML.
