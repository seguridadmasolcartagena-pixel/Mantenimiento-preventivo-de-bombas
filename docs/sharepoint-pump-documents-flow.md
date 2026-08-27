# Flujo documental de bombas en SharePoint

La aplicacion utiliza un unico disparador HTTP de Power Automate para listar, subir y eliminar documentos. El flujo debe usar una biblioteca existente y una carpeta por codigo de bomba.

## Biblioteca recomendada

- Biblioteca: `Documentacion_Bombas`
- Carpeta raiz: `Bombas`
- Subcarpeta: valor de `folderName`, por ejemplo `P-101A`
- Columnas opcionales: `CodigoBomba`, `CategoriaDocumento`, `DescripcionDocumento`

Los enlaces devueltos deben conservar los permisos de SharePoint. No se deben crear enlaces anonimos.

## Peticiones de la aplicacion

### Listar

```json
{
  "action": "list",
  "pumpCode": "P-101A",
  "folderName": "P-101A"
}
```

Respuesta:

```json
{
  "ok": true,
  "documents": [
    {
      "id": "identificador de SharePoint",
      "name": "Ficha_tecnica.pdf",
      "url": "https://tenant.sharepoint.com/...",
      "mimeType": "application/pdf",
      "size": 245760,
      "category": "Ficha tecnica",
      "description": "Datos del fabricante",
      "uploadedAt": "2026-08-27T08:00:00Z"
    }
  ]
}
```

### Subir

```json
{
  "action": "upload",
  "pumpCode": "P-101A",
  "pumpName": "Bomba de proceso",
  "folderName": "P-101A",
  "fileName": "Ficha_tecnica.pdf",
  "mimeType": "application/pdf",
  "size": 245760,
  "category": "Ficha tecnica",
  "description": "Datos del fabricante",
  "contentBase64": "JVBERi0x..."
}
```

El flujo debe:

1. Validar el codigo, el nombre y el tamano del archivo.
2. Crear `Bombas/<folderName>` si no existe.
3. Usar SharePoint `Create file` con `base64ToBinary(triggerBody()?['contentBase64'])`.
4. Guardar las columnas de categoria, descripcion y codigo de bomba.
5. Responder con `{ "ok": true, "document": { ... } }` usando el mismo formato de la operacion de listado.

### Eliminar

```json
{
  "action": "delete",
  "pumpCode": "P-101A",
  "folderName": "P-101A",
  "fileId": "identificador de SharePoint"
}
```

El flujo debe comprobar que el identificador pertenece a la carpeta de la bomba antes de ejecutar `Delete file` y responder con `{ "ok": true }`.

## Estructura del flujo

1. Disparador `When an HTTP request is received`.
2. Validacion de `action`, `pumpCode` y `folderName`.
3. `Switch` sobre `action` con casos `list`, `upload` y `delete`.
4. Acciones del conector de SharePoint para la biblioteca configurada.
5. Accion `Response` en todos los caminos, incluidos los errores.

## Integracion con el agente

La aplicacion envia en `contexto.documents` el identificador, nombre, categoria, descripcion y enlace de cada documento de la bomba seleccionada. El flujo del asistente debe usar esos identificadores para recuperar de SharePoint solo los documentos relacionados con la pregunta.

Guardar el archivo no hace que un modelo pueda leerlo automaticamente. Para PDF, Word e imagenes se necesita un paso de extraccion o indexacion de texto, por ejemplo AI Builder, SharePoint Premium, Copilot Studio o un servicio documental equivalente. Para TXT y CSV se puede convertir directamente el contenido obtenido desde SharePoint.

No se deben incluir URL firmadas, credenciales ni claves en el repositorio.
