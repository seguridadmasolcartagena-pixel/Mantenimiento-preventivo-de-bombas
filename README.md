# Gestor de Bombas

Aplicacion web estatica para consultar el historial de vibraciones e incidencias de bombas.

## Funciones principales

- Listado de bombas por estado.
- Ficha individual de cada bomba.
- Importacion de medidas desde Excel o CSV generado por el Fluke 805 FC.
- Grafica de evolucion de vibracion.
- Cuatro puntos de medida fijos por bomba: `B-LA`, `B-LOA`, `M-LA`, `M-LOA`.
- Historial de medidas por bomba.
- Registro manual de incidencias por operario.
- Eliminacion de bombas con confirmacion previa.

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
