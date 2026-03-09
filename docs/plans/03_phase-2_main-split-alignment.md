# Phase 2 - Main Split Alignment

## Objetivo de la fase

Alinear la zona principal del shell a la anatomia `left rail + canvas + right inspector`, con el canvas como centro dominante, el carril izquierdo como sistema oficial de vista/analisis y el carril derecho como inspector compacto de lectura y navegacion.

## Por que esta fase va aqui

Una vez que la ventana principal ya esta delimitada, hay que estabilizar la jerarquia entre paneles y canvas antes de introducir el expediente como ventana interna. Si el `main split` no queda claro, cualquier workspace flotante va a sentirse pegado a un shell inconsistente.

## Estado de entrada esperado

- `titlebar`, `toolbar`, `main shell region` y `status bar` ya existen como bandas estables
- el shell ya no depende del scroll global
- el canvas, el panel izquierdo y el carril derecho ya montan dentro del mismo contenedor principal

## Cambios que si se hacen

- redefinir el carril izquierdo como sistema oficial de vista y analisis
- compactar el `RightPanel` como inspector
- reafirmar el canvas como foco visual central
- estabilizar stacking con timeline y otros paneles derechos auxiliares
- documentar anchos, jerarquias y reglas de scroll local

## Cambios que explicitamente no se hacen

- no se convierte todavia el expediente en ventana interna
- no se abre un rail lateral dentro del workspace fullscreen
- no se reasigna semantica del dominio a paneles del shell
- no se elimina todavia `PersonDetailPanel` por compat

## Subfases

### 2.1 Redefinir el carril izquierdo

- dejar de tratar `LeftPanel` como contenedor generico
- convertirlo en carril oficial de controles de vista, capas y analisis
- fijar su peso visual como soporte del canvas y no como protagonista
- mover `Timeline` al lado izquierdo como parte de `Analysis Controls`

### 2.2 Compactar el inspector derecho

- reducir `RightPanel` a lectura rapida y navegacion contextual
- mantener su CTA principal hacia `abrir expediente`
- retirar protagonismo de edicion profunda o gestion pesada

### 2.3 Reafirmar el canvas como centro

- ajustar anchos y proporciones para que el canvas domine
- evitar que la suma de paneles laterales vuelva panel-first a la app
- revisar padding, limites y jerarquia visual del area central

### 2.4 Estabilizar stacking con timeline y paneles derechos

- sacar timeline del stack derecho
- dejar el lado derecho reservado al inspector
- fijar scroll local y alturas para no reintroducir overflow global

## Contratos, tipos o interfaces a tocar

- `RightPanel` queda reducido funcionalmente a inspector, aunque props legacy puedan sobrevivir temporalmente
- `LeftPanel` debe explicitar su rol como `View / Analysis Controls`
- `AppShell` debe definir el stacking del carril derecho en vez de delegarlo de forma informal a paneles aislados
- no se crean contratos nuevos en `core`; todo esto pertenece a `UI`, `app-shell` y `styles`

## Archivos/sistemas esperados

- `AppShell`
- `ShellAppFrame`
- `RightPanel`
- `styles`
- `tests`
- `wiki UX/software`

## Riesgos y decisiones si surge un problema

- si el inspector sigue necesitando acciones heredadas, la resolucion preferida es ocultar la complejidad en la facade y no devolverle densidad visual
- si timeline y inspector compiten por el mismo carril, se define prioridad operativa y se limita coexistencia visual en esta fase
- si el canvas pierde demasiado espacio, se prioriza reducir chrome lateral antes que comprimir el area central

## Criterios de salida

- el `main split` ya se parece al patron objetivo
- `LeftPanel` se entiende como carril oficial de vista/analisis
- `RightPanel` se entiende como inspector compacto
- el canvas vuelve a ser el centro dominante
- el stack derecho no rompe scroll local ni jerarquia de superficies

## Pruebas minimas obligatorias

- seleccion simple sigue abriendo o actualizando el inspector
- el inspector ya no se comporta como editor profundo
- el canvas sigue ocupando el espacio central dominante
- los paneles auxiliares derechos no provocan scroll global ni rompen el inspector

## Impacto documental

- actualizar la wiki UX si cambia la definicion visual u operativa del carril izquierdo o del inspector
- reforzar en la documentacion que `Inspector`, `Analysis Controls` y `Workspace` son familias separadas

## Deuda prohibida al cerrar la fase

- no dejar el `RightPanel` con identidad mixta entre inspector y workspace
- no dejar el carril izquierdo como panel generico sin rol oficial
- no dejar reglas de stacking del lado derecho como comportamiento accidental
