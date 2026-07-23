"use client";

import { useActionState, useState } from "react";

import {
  createOrganizationAction,
  type OnboardingState,
} from "./actions";
import styles from "./onboarding.module.css";

const initialState: OnboardingState = { error: null };

const accountTypes = [
  {
    value: "individual_owner",
    label: "Soy propietario",
    description: "Publicaré una casa, apartamento o terreno propio.",
    mark: "PR",
  },
  {
    value: "agency",
    label: "Tengo una agencia",
    description: "Administraré propiedades y agentes de mi equipo.",
    mark: "AG",
  },
  {
    value: "business",
    label: "Cuenta empresarial",
    description: "Publicaré inventario de una empresa o desarrolladora.",
    mark: "EM",
  },
] as const;

export function OnboardingForm() {
  const [state, action, pending] = useActionState(
    createOrganizationAction,
    initialState,
  );
  const [accountType, setAccountType] = useState<
    (typeof accountTypes)[number]["value"]
  >("individual_owner");

  return (
    <form action={action} className={styles.form}>
      <fieldset className={styles.typeGrid}>
        <legend>¿Cómo deseas publicar?</legend>
        {accountTypes.map((type) => (
          <label
            className={styles.typeCard}
            data-selected={accountType === type.value}
            key={type.value}
          >
            <input
              checked={accountType === type.value}
              name="organization_type"
              onChange={() => setAccountType(type.value)}
              type="radio"
              value={type.value}
            />
            <span className={styles.typeMark}>{type.mark}</span>
            <span>
              <strong>{type.label}</strong>
              <small>{type.description}</small>
            </span>
            <span className={styles.check} aria-hidden="true">
              ✓
            </span>
          </label>
        ))}
      </fieldset>

      <div className={styles.fields}>
        <label>
          <span>
            {accountType === "individual_owner"
              ? "Nombre para tu cuenta"
              : "Nombre comercial"}
          </span>
          <input
            autoComplete="organization"
            maxLength={160}
            minLength={2}
            name="name"
            placeholder={
              accountType === "individual_owner"
                ? "Ej. Propiedades de Carlos Zelaya"
                : "Ej. Inmobiliaria Valle Verde"
            }
            required
          />
          <small>Este nombre acompañará tus anuncios.</small>
        </label>

        {accountType !== "individual_owner" ? (
          <label>
            <span>Razón social (opcional)</span>
            <input
              autoComplete="organization"
              maxLength={180}
              name="legal_name"
              placeholder="Nombre legal registrado"
            />
          </label>
        ) : null}

        <label>
          <span>Cuéntanos sobre tu actividad (opcional)</span>
          <textarea
            maxLength={800}
            name="description"
            placeholder="Zona de trabajo, tipo de propiedades o experiencia..."
            rows={4}
          />
        </label>
      </div>

      <div className={styles.assurance}>
        <span aria-hidden="true">✓</span>
        <p>
          <strong>Tú mantienes el control.</strong> Nada se publicará
          automáticamente: cada anuncio se guarda primero como borrador.
        </p>
      </div>

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
        {pending ? "Configurando tu cuenta..." : "Crear cuenta de publicación"}
      </button>
    </form>
  );
}

