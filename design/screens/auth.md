# Auth — Email + código de verificación

Flujo passwordless: sin pestañas de Login/Registro/Reset, sin contraseña. Un solo campo que pide el email, y el **mismo espacio** se convierte en el campo para el código de verificación que llega al correo. No hay registro público (el usuario se crea desde el dashboard de Supabase) ni pantalla de recuperación de contraseña — no existe contraseña que recuperar. Sin nombre de app ni logo en pantalla: la tarjeta es neutra.

## Mismo layout, mobile y desktop (contenedor centrado, máx. 400px)

### Paso 1 — Pedir código

```
          375–480px de ancho útil (centrado en desktop)
┌─────────────────────────────────┐
│                                  │
│  Email                           │  label body-sm, text-secondary
│  [ícono mail] [______________]   │  input 48px alto, radius-sm, border, ícono mail a la izquierda
│                                  │
│  [ícono enviar]  Enviar código   │  botón primario 48px alto, full-width, accent
│                                  │
└─────────────────────────────────┘
```

### Paso 2 — Mismo espacio, ahora el código

```
┌─────────────────────────────────┐
│  [ícono check] Te enviamos un    │  caption, confirma el email al que se envió
│  código a vos@email.com          │
│                                  │
│  Código de verificación          │
│  [ícono hash] [_ _ _ _ _ _]      │  mismo input, ahora numérico, letter-spacing amplio
│                                  │
│  [ícono check]  Verificar        │  botón primario
│                                  │
│  [< Cambiar email]   Reenviar código │  links secundarios, body-sm
└─────────────────────────────────┘
```

**Medidas:** contenedor máximo 400px de ancho (se centra con márgenes automáticos en pantallas más anchas), padding 24–40px, separación vertical entre campos 16px, entre secciones 20px. Input y botón: 48px alto (tap target), `radius-sm` 8px. Ícono de prefijo dentro del input: 20px, `text-secondary`, a 12px del borde izquierdo.

**Comportamiento:**
- Un solo campo por paso, sin contraseña. El botón de "Enviar código" queda deshabilitado hasta que el email tiene formato válido.
- Al enviar, el campo de email es **reemplazado en el mismo lugar** por el campo de código — no es una pantalla ni una ruta nueva, es el mismo componente cambiando de estado.
- Código numérico de 6 dígitos. "Reenviar código" reinicia el timer de expiración; "Cambiar email" vuelve al paso 1 conservando nada del código anterior.
- Si no hay conexión: no se puede pedir ni verificar código (requiere red). Una sesión ya iniciada permite seguir usando la app offline sin pedir login de nuevo.
- Nunca cierra sesión automáticamente por error de red.
- Estados de carga: el botón pasa a "Enviando…" / "Verificando…" con spinner inline (16px) en vez de deshabilitarse en silencio.
- Mensaje de error inline (código inválido o expirado) en `caption`, color `overdue`, debajo del input — sin mover el layout.
