# Biblioteca documental global en SharePoint

La aplicación utiliza un único disparador HTTP de Power Automate para listar, subir y eliminar documentos globales de planta. Los manuales pueden contener información de varias bombas y el agente debe poder consultarlos desde cualquier ficha.

## Estructura recomendada

```text
Documentacion_Bombas/
└── Global/
    ├── Originales/
    │   └── 7D50-Finder-05_R0_A_1.pdf
    └── Texto/
        └── 7D50-Finder-05_R0_A_1.txt
```

- Biblioteca: `Documentacion_Bombas`
- Código enviado por la aplicación: `GLOBAL`
- Carpeta enviada por la aplicación: `Global`
- Columnas opcionales: `CategoriaDocumento`, `DescripcionDocumento`, `EstadoExtraccion`

Los enlaces devueltos deben conservar los permisos de SharePoint. No se deben crear enlaces anónimos.

## Peticiones de la aplicación

### Listar

```json
{
  "action": "list",
  "pumpCode": "GLOBAL",
  "folderName": "Global"
}
```

Respuesta:

```json
{
  "ok": true,
  "documents": [
    {
      "id": "identificador del archivo original",
      "name": "7D50-Finder-05_R0_A_1.pdf",
      "url": "https://tenant.sharepoint.com/...",
      "mimeType": "application/pdf",
      "size": 15686902,
      "category": "Manual",
      "description": "Manual global Finder con planos y hojas de datos",
      "uploadedAt": "2026-08-27T08:00:00Z"
    }
  ]
}
```

### Subir

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
  "description": "Manual global Finder con planos y hojas de datos",
  "contentBase64": "JVBERi0x..."
}
```

El flujo debe:

1. Validar el nombre, el formato y el tamaño del archivo.
2. Guardar el original en `Global/Originales`.
3. Usar SharePoint `Create file` con `base64ToBinary(triggerBody()?['contentBase64'])`.
4. Crear o actualizar su registro en `Indice_Documentos_Bombas` con estado `Pendiente`.
5. Responder con `{ "ok": true, "document": { ... } }`.

### Eliminar

```json
{
  "action": "delete",
  "pumpCode": "GLOBAL",
  "folderName": "Global",
  "fileId": "identificador del archivo original"
}
```

El flujo debe eliminar el original, el `.txt` asociado y el registro del índice antes de responder con `{ "ok": true }`.

## Flujo de extracción

Un segundo flujo, activado al crear o modificar un archivo en `Global/Originales`, debe:

1. Convertir Word a PDF cuando sea necesario.
2. Extraer el texto de PDF e imágenes mediante AI Builder.
3. Leer directamente TXT y CSV.
4. Guardar el resultado en `Global/Texto/<nombre-original>.txt`.
5. Actualizar `Indice_Documentos_Bombas` con el identificador del `.txt`, la fecha y el estado `Listo`.

## Integración con el agente

La aplicación envía los documentos globales en `contexto.documents` en todas las preguntas. El flujo del asistente debe localizar el registro del documento, obtener su `.txt` asociado y seleccionar solamente los fragmentos relacionados con la consulta o con el código de bomba mencionado.

El manual `7D50-Finder-05_R0_A_1.pdf` contiene 222 páginas, planos, hojas de especificaciones y manuales para múltiples equipos. El texto debe dividirse en fragmentos antes de enviarlo al modelo para evitar superar el límite de contexto.

No se deben incluir URL firmadas, credenciales ni claves en el repositorio.
