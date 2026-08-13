"use client";

import { useActionState, useState } from "react";

import {
  loginAction,
  recoverPasswordAction,
  signUpAction,
  type AuthActionState,
} from "./actions";
import styles from "./login.module.css";

export type AuthMode = "login" | "recover" | "register";

const INITIAL_STATE: AuthActionState = {
  message: "",
  status: "idle",
};

type AuthFormsProps = {
  initialMode: AuthMode;
  nextPath: string;
  notice?: string;
};

function Feedback({ state }: { state: AuthActionState }) {
  if (state.status === "idle") return null;

  return (
    <p
      className={
        state.status === "success" ? styles.success : styles.error
      }
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  );
}

export function AuthForms({
  initialMode,
  nextPath,
  notice,
}: AuthFormsProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loginState, loginFormAction, loginPending] = useActionState(
    loginAction,
    INITIAL_STATE,
  );
  const [registerState, registerFormAction, registerPending] =
    useActionState(signUpAction, INITIAL_STATE);
  const [recoverState, recoverFormAction, recoverPending] = useActionState(
    recoverPasswordAction,
    INITIAL_STATE,
  );

  return (
    <div>
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      {mode !== "recover" ? (
        <div className={styles.tabs} role="tablist" aria-label="Acceso">
          <button
            aria-selected={mode === "login"}
            onClick={() => setMode("login")}
            role="tab"
            type="button"
          >
            Iniciar sesión
          </button>
          <button
            aria-selected={mode === "register"}
            onClick={() => setMode("register")}
            role="tab"
            type="button"
          >
            Crear cuenta
          </button>
        </div>
      ) : null}

      {mode === "login" ? (
        <form action={loginFormAction} className={styles.form}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>Bienvenido de nuevo</p>
            <h1>Accede a tu cuenta</h1>
            <p>Administra tus propiedades, consultas y favoritos.</p>
          </div>

          <input name="next" type="hidden" value={nextPath} />

          <label className={styles.field}>
            <span>Correo electrónico</span>
            <input
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              name="email"
              placeholder="tu@correo.com"
              required
              type="email"
            />
          </label>

          <label className={styles.field}>
            <span>Contraseña</span>
            <input
              autoComplete="current-password"
              maxLength={128}
              minLength={6}
              name="password"
              placeholder="Tu contraseña"
              required
              type="password"
            />
          </label>

          <button
            className={styles.textButton}
            onClick={() => setMode("recover")}
            type="button"
          >
            ¿Olvidaste tu contraseña?
          </button>

          <Feedback state={loginState} />

          <button
            className={styles.submit}
            disabled={loginPending}
            type="submit"
          >
            {loginPending ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      ) : null}

      {mode === "register" ? (
        <form action={registerFormAction} className={styles.form}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>Comienza en Zelaya Raíces</p>
            <h1>Crea tu cuenta</h1>
            <p>Podrás completar tu perfil y organización después.</p>
          </div>

          <input name="next" type="hidden" value={nextPath} />

          <label className={styles.field}>
            <span>Nombre completo</span>
            <input
              autoComplete="name"
              maxLength={120}
              name="fullName"
              placeholder="Tu nombre"
              required
              type="text"
            />
          </label>

          <label className={styles.field}>
            <span>Correo electrónico</span>
            <input
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              name="email"
              placeholder="tu@correo.com"
              required
              type="email"
            />
          </label>

          <label className={styles.field}>
            <span>Teléfono de respaldo</span>
            <input
              autoComplete="tel"
              inputMode="tel"
              maxLength={30}
              name="publicPhone"
              placeholder="+504 9876-5432"
              required
              type="tel"
            />
            <small>Se valida para tu cuenta y no se muestra públicamente.</small>
          </label>

          <label className={styles.field}>
            <span>WhatsApp para consultas</span>
            <input
              autoComplete="tel"
              inputMode="tel"
              maxLength={30}
              name="publicWhatsapp"
              placeholder="+504 9876-5432"
              required
              type="tel"
            />
          </label>

          <label className={styles.field}>
            <span>Contraseña</span>
            <input
              aria-describedby="password-hint"
              autoComplete="new-password"
              maxLength={128}
              minLength={10}
              name="password"
              placeholder="Al menos 10 caracteres"
              required
              type="password"
            />
          </label>
          <p className={styles.hint} id="password-hint">
            Usa una frase larga que no hayas utilizado en otro sitio.
          </p>

          <label className={styles.field}>
            <span>Confirma tu contraseña</span>
            <input
              autoComplete="new-password"
              maxLength={128}
              minLength={10}
              name="confirmPassword"
              placeholder="Repite tu contraseña"
              required
              type="password"
            />
          </label>

          <Feedback state={registerState} />

          <button
            className={styles.submit}
            disabled={registerPending}
            type="submit"
          >
            {registerPending ? "Creando solicitud…" : "Crear cuenta"}
          </button>

          <p className={styles.legal}>
            Al continuar confirmas que la información proporcionada es
            correcta y aceptas el proceso de revisión de la plataforma.
          </p>
        </form>
      ) : null}

      {mode === "recover" ? (
        <form action={recoverFormAction} className={styles.form}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>Recuperación segura</p>
            <h1>Actualiza tu contraseña</h1>
            <p>
              Escribe tu correo y te enviaremos instrucciones si existe una
              cuenta asociada.
            </p>
          </div>

          <label className={styles.field}>
            <span>Correo electrónico</span>
            <input
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              name="email"
              placeholder="tu@correo.com"
              required
              type="email"
            />
          </label>

          <Feedback state={recoverState} />

          <button
            className={styles.submit}
            disabled={recoverPending}
            type="submit"
          >
            {recoverPending ? "Enviando…" : "Enviar instrucciones"}
          </button>

          <button
            className={styles.backButton}
            onClick={() => setMode("login")}
            type="button"
          >
            Volver a iniciar sesión
          </button>
        </form>
      ) : null}
    </div>
  );
}
