# Biblioteca documental global e individual en SharePoint

La aplicación dispone de una única biblioteca documental. En el momento de subir un archivo, el usuario elige si es global para toda la planta o si pertenece a una bomba concreta.

## Estructura recomendada

```text
Documentacion_Bombas/
├── Global/
│   ├── Originales/
│   └── Texto/
└── Bombas/
    ├── 03P3A/
    │   ├── Originales/
    │   └── Texto/
    └── 06P8A/
        ├── Originales/
        └── Texto/
```

- Los documentos comunes utilizan `pumpCode: GLOBAL` y `folderName: Global`.
- Los documentos individuales utilizan el código real de la bomba y una carpeta con ese código.
- Las bombas nuevas aparecen automáticamente como destinos cuando se crean en la aplicación.
- Los enlaces deben conservar los permisos de SharePoint. No se deben crear enlaces anónimos.

## Peticiones de la aplicación

### Documento global

```json
{
  "action": "upload",
  "pumpCode": "GLOBAL",
  "pumpName": "Documentación global de planta",
  "folderName": "Global",
  "fileName": "7D50-Finder-05_R0_A_1.pdf",
  "mimeType": "application/pdf",
  "size": 15686902,
  "category": "Manual",
  "description": "Manual Finder para múltiples bombas",
  "contentBase64": "JVBERi0x..."
}
```

El original se guarda en `Global/Originales` y el texto extraído en `Global/Texto`.

### Documento individual

```json
{
  "action": "upload",
  "pumpCode": "06P8A",
  "pumpName": "Bomba de descarga CH3ONa",
  "folderName": "06P8A",
  "fileName": "Ficha_06P8A.pdf",
  "mimeType": "application/pdf",
  "size": 245760,
  "category": "Ficha técnica",
  "description": "Ficha específica de la bomba",
  "contentBase64": "JVBERi0x..."
}
```

El original se guarda en `Bombas/06P8A/Originales` y el texto en `Bombas/06P8A/Texto`.

### Listar

La acción `list` recibe el ámbito que debe consultar:

```json
{
  "action": "list",
  "pumpCode": "06P8A",
  "folderName": "06P8A"
}
```

La respuesta contiene únicamente los documentos de ese ámbito:

```json
{
  "ok": true,
  "documents": [
    {
      "id": "identificador del archivo original",
      "name": "Ficha_06P8A.pdf",
      "url": "https://tenant.sharepoint.com/...",
      "mimeType": "application/pdf",
      "size": 245760,
      "category": "Ficha técnica",
      "description": "Ficha específica de la bomba",
      "uploadedAt": "2026-08-27T08:00:00Z"
    }
  ]
}
```

### Eliminar

```json
{
  "action": "delete",
  "pumpCode": "06P8A",
  "folderName": "06P8A",
  "fileId": "identificador del archivo original"
}
```

El flujo debe eliminar el original, el `.txt` asociado y el registro del índice.

## Índice documental

La lista `Indice_Documentos_Bombas` relaciona cada original con su texto extraído. Debe incluir como mínimo:

- `CodigoBomba`: `GLOBAL` o el código individual.
- `IdentificadorOriginal` y `RutaOriginal`.
- `IdentificadorTexto` y `RutaTexto`.
- `Categoria`, `Descripcion`, `Extension` y `EstadoExtraccion`.
- `FechaProcesado` y `ErrorExtraccion`.

## Flujo de extracción

Un segundo flujo, activado al crear o modificar un archivo dentro de una carpeta `Originales`, debe:

1. Determinar el ámbito a partir de la ruta: `GLOBAL` o código de bomba.
2. Convertir Word a PDF cuando sea necesario.
3. Extraer el texto de PDF e imágenes mediante AI Builder.
4. Leer directamente TXT y CSV.
5. Guardar el resultado en la carpeta `Texto` del mismo ámbito.
6. Crear o actualizar el registro de `Indice_Documentos_Bombas`.

## Integración con el agente

En cada pregunta, la aplicación envía al asistente:

1. Todos los documentos globales.
2. Los documentos individuales de la bomba seleccionada.

El flujo del agente obtiene los `.txt` asociados, busca los fragmentos relacionados con la consulta y los incorpora al contexto predictivo junto con las medidas, incidencias y mantenimientos.

Los manuales extensos deben dividirse en fragmentos antes de enviarlos al modelo. No se deben incluir URL firmadas, credenciales ni claves en el repositorio.
