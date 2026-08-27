# Biblioteca documental única en SharePoint

Todos los documentos se almacenan en el mismo sitio. La aplicación permite clasificarlos como globales o asociados a una bomba, pero esa relación se guarda como metadato y no mediante carpetas diferentes.

## Estructura de archivos

```text
Documentacion_Bombas/
├── Originales/
│   ├── GLOBAL__7D50-Finder-05_R0_A_1.pdf
│   └── 06P8A__Ficha_tecnica.pdf
└── Texto/
    ├── GLOBAL__7D50-Finder-05_R0_A_1.txt
    └── 06P8A__Ficha_tecnica.txt
```

- Biblioteca única: `Documentacion_Bombas`.
- Carpeta única de originales: `Originales`.
- Carpeta única de textos: `Texto`.
- El campo `CodigoBomba` contiene `GLOBAL` o el código individual.
- Los enlaces deben conservar los permisos de SharePoint. No se deben crear enlaces anónimos.

## Clasificación al subir

La aplicación siempre envía `folderName: Documentos`. Power Automate utiliza `pumpCode` para clasificar y nombrar el archivo.

### Documento global

```json
{
  "action": "upload",
  "pumpCode": "GLOBAL",
  "pumpName": "Documentación global de planta",
  "folderName": "Documentos",
  "fileName": "7D50-Finder-05_R0_A_1.pdf",
  "mimeType": "application/pdf",
  "size": 15686902,
  "category": "Manual",
  "description": "Manual Finder para múltiples bombas",
  "contentBase64": "JVBERi0x..."
}
```

### Documento individual

```json
{
  "action": "upload",
  "pumpCode": "06P8A",
  "pumpName": "Bomba de descarga CH3ONa",
  "folderName": "Documentos",
  "fileName": "Ficha_tecnica.pdf",
  "mimeType": "application/pdf",
  "size": 245760,
  "category": "Ficha técnica",
  "description": "Ficha específica de la bomba",
  "contentBase64": "JVBERi0x..."
}
```

El flujo guarda ambos originales en `Originales`. Para evitar nombres duplicados, el nombre físico recomendado es:

```text
<CodigoBomba>__<NombreOriginal>
```

## Índice documental

La lista `Indice_Documentos_Bombas` relaciona cada original con su texto extraído. Debe incluir:

- `NombreDocumento`: nombre original presentado al usuario.
- `CodigoBomba`: `GLOBAL` o código de bomba.
- `NombreAlmacenado`: nombre físico dentro de SharePoint.
- `IdentificadorOriginal` y `RutaOriginal`.
- `IdentificadorTexto` y `RutaTexto`.
- `Categoria`, `Descripcion`, `Extension` y `EstadoExtraccion`.
- `FechaProcesado` y `ErrorExtraccion`.

## Listar

La acción `list` filtra `Indice_Documentos_Bombas` por `CodigoBomba`; no busca una carpeta diferente.

```json
{
  "action": "list",
  "pumpCode": "06P8A",
  "folderName": "Documentos"
}
```

La respuesta contiene solamente los documentos cuyo `CodigoBomba` coincida:

```json
{
  "ok": true,
  "documents": [
    {
      "id": "identificador del archivo original",
      "name": "Ficha_tecnica.pdf",
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

## Eliminar

La acción `delete` localiza el registro por `IdentificadorOriginal` y elimina:

1. El archivo de `Originales`.
2. El archivo asociado de `Texto`.
3. El elemento de `Indice_Documentos_Bombas`.

## Flujo de extracción

Un segundo flujo, activado al crear o modificar un archivo en `Originales`, debe:

1. Leer `CodigoBomba` desde las propiedades o desde el índice.
2. Convertir Word a PDF cuando sea necesario.
3. Extraer el texto de PDF e imágenes mediante AI Builder.
4. Leer directamente TXT y CSV.
5. Guardar el resultado en `Texto` con el mismo prefijo de código.
6. Actualizar el registro del índice con el identificador del `.txt` y el estado `Listo`.

## Integración con el agente

En cada pregunta, el flujo del asistente consulta el índice y combina:

1. Los textos con `CodigoBomba = GLOBAL`.
2. Los textos cuyo `CodigoBomba` coincide con la bomba seleccionada.
3. Las medidas, tendencias, incidencias y mantenimientos de la aplicación.

Los documentos extensos deben dividirse en fragmentos antes de enviarlos al modelo. No se deben incluir URL firmadas, credenciales ni claves en el repositorio.
