# Flujo Power Automate para el asistente predictivo

El flujo recibe la pregunta y el contexto predictivo calculado por la aplicacion, consulta OpenAI y devuelve un contrato JSON estable al chat.

## Instalacion recomendada

1. Importa `Asistente_Predictivo_Bombas_PowerAutomate.zip` en Power Automate como flujo nuevo.
2. Abre la accion `CONFIGURAR_CLAVE_OPENAI` y reemplaza el texto de marcador por una clave nueva.
3. Guarda el flujo y ejecuta una prueba desde el disparador con este cuerpo:

```json
{
  "mensaje": "Resume el estado de la bomba seleccionada",
  "bomba": "01.166P2",
  "historial": [],
  "contexto": {
    "portfolioSummary": {
      "pumps": 1,
      "analyzablePoints": 1,
      "insufficientPoints": 0
    }
  }
}
```

4. Copia la URL HTTPS del disparador.
5. En la aplicacion abre `Asistente predictivo > Configurar`, pega la URL y guarda.
6. Realiza una segunda prueba desde la aplicacion.

La clave queda en una unica accion del flujo. Las entradas y salidas sensibles de la configuracion y de la llamada HTTP estan ocultas en el historial de ejecuciones.

## Contrato de entrada

La aplicacion envia:

- `mensaje` o `pregunta`: texto obligatorio, maximo 1200 caracteres.
- `bomba`: codigo seleccionado, cuando exista.
- `historial`: hasta 10 mensajes recientes.
- `contexto`: calculos predictivos, mediciones resumidas y limitaciones.
- `conversationId`: identificador opcional para trazabilidad.

## Contrato de salida

Respuesta correcta:

```json
{
  "ok": true,
  "respuesta": "Texto del analisis",
  "conversationId": "resp_..."
}
```

Errores controlados:

- `400 INVALID_QUESTION`: pregunta vacia o demasiado larga.
- `502 OPENAI_REQUEST_FAILED`: error de autenticacion, modelo, cuota o servicio.
- `502 OPENAI_EMPTY_OUTPUT`: OpenAI no devolvio texto util.
- `503 OPENAI_KEY_NOT_CONFIGURED`: falta sustituir el marcador de la clave.

## Seguridad

La clave del paquete anterior estaba incluida en su definicion. Debe revocarse y sustituirse por una nueva. No reutilices esa clave.

La URL firmada del disparador permite invocar el flujo a quien la conozca. Para un piloto interno puede guardarse en el navegador. Para produccion, protege el endpoint con Microsoft Entra ID o un backend autenticado, limita el uso y revisa los registros de ejecucion.

Documentacion del modelo: https://developers.openai.com/api/docs/guides/latest-model
