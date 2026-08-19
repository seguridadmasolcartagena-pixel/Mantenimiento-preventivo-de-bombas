# Gestor de Bombas

Aplicacion web estatica para consultar el historial de vibraciones e incidencias de bombas.

## Funciones principales

- Listado de bombas por estado.
- Ficha individual de cada bomba.
- Importacion de medidas desde Excel generado por el Fluke 805 FC.
- Grafica de evolucion de vibracion.
- Cuatro puntos de medida fijos por bomba: `B-LA`, `B-LOA`, `M-LA`, `M-LOA`.
- Historial de medidas por bomba.
- Registro de mantenimientos por bomba con fecha, tipo, responsable y marcador visible en la grafica de vibracion.
- Registro de frecuencia de variador por bomba y ronda, con filtro por bandas de 5 Hz y grafica vibracion-frecuencia.
- Evolucion de CFPlus por punto de medida, integrada con el filtro de frecuencia y el historial importado del Fluke.
- Registro manual de incidencias por operario.
- Eliminacion de bombas con confirmacion previa.
- Reseteo de las medidas activas de una bomba con confirmacion previa, conservando el historico maestro.
- Potencia nominal en kW por bomba y recomendacion automatica de umbrales de Aviso y Alarma, siempre editables manualmente.

## Umbrales de la tabla de referencia

La recomendacion automatica reproduce la tabla facilitada para bombas radial, axial o diagonal de mas de 15 kW. Ademas del tipo y la potencia, la ficha solicita la transmision y el tipo de fundacion porque ambos cambian los limites.

| Transmision | Fundacion | Grupo | Aviso amarillo | Alarma roja |
| --- | --- | --- | ---: | ---: |
| Acople directo | Rigida | Grupo 4 | 2,8 mm/s RMS | 4,5 mm/s RMS |
| Acople directo | Flexible | Grupo 4 | 3,5 mm/s RMS | 4,5 mm/s RMS |
| Eje intermedio / Poleas | Rigida | Grupo 3 | 3,5 mm/s RMS | 4,5 mm/s RMS |
| Eje intermedio / Poleas | Flexible | Grupo 3 | 4,5 mm/s RMS | 7,1 mm/s RMS |

Para bombas no incluidas en la tabla o con potencia igual o inferior a 15 kW no se inventa una recomendacion: los campos permanecen disponibles para introducir los limites manuales. El usuario tambien puede sustituir cualquier recomendacion antes de guardar o volver a aplicarla mediante el boton correspondiente.

Los valores no sustituyen los limites del fabricante, la evaluacion del montaje, la tendencia historica ni los procedimientos de mantenimiento y seguridad de la planta.

## Uso

Abre `index.html` en el navegador o sirve la carpeta con un servidor estatico:

```bash
python3 -m http.server 4173
```

Despues entra en:

```text
http://127.0.0.1:4173/
```

## Columnas esperadas para importar medidas

La app intenta reconocer columnas con nombres equivalentes a:

En archivos Excel o XLSM, la app lee preferentemente la hoja `viewdata`.

Para el formato Fluke mostrado, cada bloque se lee desde `Machine Name: codigo/punto`.
La medida que se guarda como vibracion es:

- Grupo `OV-Velocity`
- Columna `RMS(mm/s)`

Tras cada importacion con nuevas medidas, la app genera un Excel historico acumulado con hoja `viewdata` y estructura de bloques por bomba/punto. Ese Excel conserva las filas completas del Fluke, mientras que la aplicacion solo usa `OV-Velocity > RMS(mm/s)` para pantalla y graficas.

Si al importar no aparecen bombas, revisa:

- Que el archivo tenga una hoja llamada `viewdata`.
- Que los bloques empiecen por `Machine Name: codigo/punto`.
- Que exista el grupo `OV-Velocity`.
- Que dentro de ese grupo exista la columna `RMS(mm/s)`.
- Que la app tenga conexion para cargar la libreria Excel si se abre como HTML local.

## Actualizacion en SharePoint con Power Automate

La app puede enviar el Excel maestro acumulado a un flujo de Power Automate en lugar de descargarlo automaticamente.

En la app, usa `Configurar SharePoint` y pega la URL del disparador HTTP del flujo.

El flujo debe recibir un JSON con:

- `fileName`
- `fileContentBase64`
- `updatedAt`
- `source`

En Power Automate, el contenido del archivo se guarda en SharePoint usando:

```text
base64ToBinary(triggerBody()?['fileContentBase64'])
```

El archivo recomendado es:

```text
Historico_Bombas_Fluke.xlsx
```

## Memoria compartida de la app

La app guarda y carga su memoria compartida automaticamente desde SharePoint mediante dos flujos HTTP configurados en el codigo:

- El flujo para guardar recibe el JSON completo de memoria y actualiza `memoria_bombas.json`.
- El flujo para cargar devuelve el contenido de `memoria_bombas.json` a la app al abrirla.

La memoria contiene:

- bombas
- medidas importadas
- incidencias
- bloques `viewdata` usados para reconstruir el Excel historico

Cuando se resetea una bomba, se limpian sus medidas activas en pantalla para iniciar una nueva etapa tras reparacion o intervencion. Los bloques `viewdata` se conservan para que el Excel maestro mantenga el historial y permita investigar tendencias.

El reseteo actualiza primero la memoria local y la pantalla. La sincronizacion con SharePoint se realiza despues, de modo que una respuesta lenta del flujo no impide limpiar las medidas visibles.

Para recuperar datos desde SharePoint, usa el boton `Cargar memoria`. Si Power Automate no devuelve bien el JSON, descarga `memoria_bombas.json` desde SharePoint y usa `Configurar SharePoint > Importar memoria JSON`.

Al abrir o recargar la aplicacion, se compara `updatedAt` de SharePoint con la fecha de la memoria local. La version mas reciente prevalece; la carga manual desde SharePoint sigue reemplazando la memoria local cuando el usuario la solicita expresamente.

Al guardar la configuracion de SharePoint, la app ya no envia automaticamente la memoria local. Esto evita sobrescribir SharePoint con una pantalla vacia por error.

- `bomba`, `codigo`, `codigo bomba`, `equipo`, `asset`, `machine`, `maquina`
- `fecha`, `date`, `datetime`, `fecha medida`, `measurement date`
- `punto`, `punto medida`, `measurement point`, `point`
- `vibracion`, `vibration`, `overall vibration`, `valor`, `rms`
- `unidad`, `unit`
- `area`, `zona`, `ubicacion`, `location`
- `nombre`, `descripcion`, `description`

Cuando se tenga un Excel real del Fluke 805 FC, conviene ajustar el importador a las columnas exactas.

## Puntos de medida

Cada bomba se interpreta con estos cuatro puntos:

- `B-LA`: bomba, lado acoplamiento.
- `B-LOA`: bomba, lado opuesto al acoplamiento.
- `M-LA`: motor, lado acoplamiento.
- `M-LOA`: motor, lado opuesto al acoplamiento.

## Estados automaticos

La app calcula el estado visible de cada bomba con las ultimas medidas disponibles de los cuatro puntos:

- `Operativa`: ninguna ultima medida supera los umbrales configurados.
- `Aviso`: una o mas ultimas medidas superan el valor de `Aviso`.
- `Alarma`: una o mas ultimas medidas superan el valor de `Alarma`.
- `Parada`: estado operativo manual; tiene prioridad sobre Aviso y Alarma.

Si una medida supera los dos umbrales, prevalece `Alarma`.
