# Biblioteca documental única en SharePoint

Todos los archivos originales y todos los textos extraídos se almacenan juntos en la raíz de una única biblioteca de SharePoint. No se utilizan subcarpetas ni una lista de índice separada.

## Estructura

```text
Documentacion_Bombas/
├── GLOBAL__7D50-Finder-05_R0_A_1.pdf
├── GLOBAL__7D50-Finder-05_R0_A_1.txt
├── 06P8A__Ficha_tecnica.pdf
└── 06P8A__Ficha_tecnica.txt
```

La propia biblioteca funciona como índice mediante columnas de metadatos.

## Columnas de la biblioteca

- `CodigoBomba`: `GLOBAL` o código de bomba.
- `NombreOriginal`: nombre que se muestra en la aplicación.
- `TipoContenido`: elección `Original` o `Texto`.
- `DocumentoPadreId`: identificador del original; vacío para el propio original.
- `Categoria`: ficha técnica, manual, plano, certificado, informe u otro.
- `Descripcion`: texto libre.
- `ExtensionOriginal`: extensión del archivo fuente.
- `EstadoExtraccion`: `Pendiente`, `Procesando`, `Listo`, `No compatible` o `Error`.
- `FechaProcesado`: fecha y hora.
- `ErrorExtraccion`: detalle del error cuando exista.

Los enlaces deben conservar los permisos de SharePoint. No se deben crear enlaces anónimos.

## Clasificación al subir

La aplicación siempre envía `folderName: Documentacion_Bombas`. Power Automate utiliza `pumpCode` para clasificar el documento y crear un nombre físico único.

### Documento global

```json
{
  "action": "upload",
  "pumpCode": "GLOBAL",
  "pumpName": "Documentación global de planta",
  "folderName": "Documentacion_Bombas",
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
  "folderName": "Documentacion_Bombas",
  "fileName": "Ficha_tecnica.pdf",
  "mimeType": "application/pdf",
  "size": 245760,
  "category": "Ficha técnica",
  "description": "Ficha específica de la bomba",
  "contentBase64": "JVBERi0x..."
}
```

El nombre físico recomendado es `<CodigoBomba>__<NombreOriginal>`. Así dos bombas pueden tener archivos con el mismo nombre sin colisiones.

## Subir o modificar

La acción `upload` debe:

1. Buscar un archivo con el mismo `CodigoBomba`, `NombreOriginal` y `TipoContenido = Original`.
2. Si existe, usar `Update file` y cambiar el estado a `Pendiente`.
3. Si no existe, usar `Create file` en la raíz de `Documentacion_Bombas`.
4. Actualizar las propiedades del archivo original.
5. Responder con el identificador, nombre visible, URL, tipo, tamaño, categoría, descripción y fecha.

## Extraer texto

Un segundo flujo, activado cuando se crea o modifica un archivo con `TipoContenido = Original`, debe:

1. Marcar el original como `Procesando`.
2. Convertir Word a PDF cuando sea necesario.
3. Extraer el texto de PDF e imágenes mediante AI Builder.
4. Leer directamente TXT y CSV.
5. Crear o actualizar `<CodigoBomba>__<NombreBase>.txt` en la misma biblioteca.
6. Marcar el `.txt` con `TipoContenido = Texto` y `DocumentoPadreId` igual al identificador del original.
7. Actualizar el original con `EstadoExtraccion = Listo`.

El flujo debe excluir los archivos con `TipoContenido = Texto` para evitar ejecutarse de nuevo sobre los `.txt` generados.

## Listar

La acción `list` utiliza `Get files (properties only)` y filtra:

```text
CodigoBomba eq '<pumpCode>' and TipoContenido eq 'Original'
```

La aplicación ejecuta esta acción para `GLOBAL` y para la bomba seleccionada.

## Eliminar

La acción `delete` debe:

1. Localizar el original por su identificador.
2. Localizar el archivo cuyo `DocumentoPadreId` coincide.
3. Eliminar el `.txt`.
4. Eliminar el original.

## Integración con el agente

El flujo del asistente consulta la misma biblioteca y combina:

1. Archivos con `TipoContenido = Texto` y `CodigoBomba = GLOBAL`.
2. Archivos con `TipoContenido = Texto` y el código de la bomba seleccionada.
3. Medidas, tendencias, incidencias y mantenimientos de la aplicación.

Los textos extensos deben dividirse en fragmentos antes de enviarlos al modelo. No se deben incluir URL firmadas, credenciales ni claves en el repositorio.
