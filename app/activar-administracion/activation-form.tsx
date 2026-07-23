"use client";

import { useActionState } from "react";

import {
  activateAdministrationAction,
  type ActivationState,
} from "./actions";
import styles from "./activation.module.css";

const initialState: ActivationState = { error: null };

export function ActivationForm() {
  const [state, action, pending] = useActionState(
    activateAdministrationAction,
    initialState,
  );

  return (
    <form action={action} className={styles.form}>
      <label>
        <span>Código único de activación</span>
        <input
          autoCapitalize="characters"
          autoComplete="off"
          name="activation_code"
          placeholder="ZR-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
          required
          spellCheck={false}
        />
      </label>
      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        className="button button--primary button--full"
        disabled={pending}
        type="submit"
      >
        {pending ? "Activando..." : "Activar administración"}
      </button>
    </form>
  );
}

