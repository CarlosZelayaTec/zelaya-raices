"use client";

import { useState } from "react";

import { PROPERTY_TYPE_OPTIONS } from "@/modules/properties/property-types";

const priceOptions = {
  venta: [
    { value: "3000000", label: "L 3 millones" },
    { value: "6000000", label: "L 6 millones" },
    { value: "10000000", label: "L 10 millones" },
    { value: "20000000", label: "L 20 millones" },
  ],
  alquiler: [
    { value: "15000", label: "L 15,000 / mes" },
    { value: "30000", label: "L 30,000 / mes" },
    { value: "60000", label: "L 60,000 / mes" },
    { value: "100000", label: "L 100,000 / mes" },
  ],
} as const;

export function HeroSearch() {
  const [operation, setOperation] = useState<keyof typeof priceOptions>("venta");

  return (
    <form className="hero-search" action="/propiedades" method="get">
      <fieldset className="operation-tabs">
        <legend className="sr-only">Tipo de operación</legend>
        <label>
          <input
            checked={operation === "venta"}
            name="operacion"
            onChange={() => setOperation("venta")}
            type="radio"
            value="venta"
          />
          <span>Comprar</span>
        </label>
        <label>
          <input
            checked={operation === "alquiler"}
            name="operacion"
            onChange={() => setOperation("alquiler")}
            type="radio"
            value="alquiler"
          />
          <span>Alquilar</span>
        </label>
      </fieldset>
      <div className="hero-search__fields">
        <label className="search-field search-field--location">
          <span>Ubicación</span>
          <input
            name="ubicacion"
            placeholder="Ciudad, colonia o zona"
            type="search"
          />
        </label>
        <label className="search-field">
          <span>Tipo</span>
          <select name="tipo" defaultValue="">
            <option value="">Toda propiedad</option>
            {PROPERTY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.filterValue}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="search-field">
          <span>Precio máximo</span>
          <select key={operation} name="precioMax" defaultValue="">
            <option value="">Sin límite</option>
            {priceOptions[operation].map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button className="button button--accent hero-search__submit" type="submit">
          Buscar propiedades <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}
