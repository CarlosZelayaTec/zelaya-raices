"use client";

import { useActionState } from "react";

import {
  updatePasswordAction,
  type PasswordActionState,
} from "./actions";
import styles from "./password.module.css";

const INITIAL_STATE: PasswordActionState = {
  message: "",
  status: "idle",
};

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className={styles.form}>
      <label className={styles.field}>
        <span>Nueva contraseña</span>
        <input
          aria-describedby="new-password-hint"
          autoComplete="new-password"
          maxLength={128}
          minLength={10}
          name="password"
          placeholder="Al menos 10 caracteres"
          required
          type="password"
        />
      </label>
      <p className={styles.hint} id="new-password-hint">
        Usa una frase larga y diferente a tus contraseñas anteriores.
      </p>

      <label className={styles.field}>
        <span>Confirma la contraseña</span>
        <input
          autoComplete="new-password"
          maxLength={128}
          minLength={10}
          name="confirmPassword"
          placeholder="Repite la nueva contraseña"
          required
          type="password"
        />
      </label>

      {state.status === "error" ? (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      ) : null}

      <button className={styles.submit} disabled={pending} type="submit">
        {pending ? "Actualizando…" : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}
