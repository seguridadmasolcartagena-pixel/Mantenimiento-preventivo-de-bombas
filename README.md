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
- Asistente predictivo conectado mediante Power Automate, con analisis local de tendencias del historico importado.

## Umbrales de referencia de planta

Todas las bombas utilizan como referencia inicial Aviso a 4 mm/s RMS y Alarma a 6 mm/s RMS, independientemente del tipo, la potencia o el acople. La potencia nominal se conserva como informacion tecnica de la bomba y no modifica los umbrales.

Las bombas nuevas y las que no tengan limites configurados reciben automaticamente la referencia 4/6. Los valores existentes y cualquier ajuste posterior permanecen editables. El boton `Aplicar referencia 4/6` permite recuperar los valores generales en cualquier momento.

Los valores no sustituyen los limites del fabricante, la evaluacion del montaje, la tendencia historica ni los procedimientos de mantenimiento y seguridad de la planta.

## Asistente predictivo

El boton `IA` abre un chat que consulta el estado actual de la aplicacion y los historicos importados. La aplicacion calcula primero las tendencias por bomba y punto de medida; el modelo recibe resultados estructurados y los explica, pero no calcula la regresion por su cuenta.

La prediccion:

- agrega por dia usando la mediana para evitar que varias lecturas seguidas dominen la tendencia
- requiere al menos cuatro dias de datos distribuidos en siete dias o mas
- utiliza hasta doce observaciones diarias recientes
- proyecta el valor a 30 dias y posibles cruces de umbral hasta un maximo de 90 dias
- informa numero de muestras, periodo, pendiente, R cuadrado y confianza
- avisa cuando hay frecuencias de variador mezcladas

La URL del flujo se guarda solo en el navegador desde `Configurar`. La clave de OpenAI no se introduce en la aplicacion. Consulta `CHATBOT_POWER_AUTOMATE.md` para crear el flujo.

Pruebas del motor predictivo:

```bash
node predictive-engine.test.mjs
```

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
- `Aviso`: una o mas ultimas medidas alcanzan o superan el valor de `Aviso`.
- `Alarma`: una o mas ultimas medidas alcanzan o superan el valor de `Alarma`.
- `Parada`: estado operativo manual; tiene prioridad sobre Aviso y Alarma.

Si una medida alcanza los dos umbrales, prevalece `Alarma`.
