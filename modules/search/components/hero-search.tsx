export function HeroSearch() {
  return (
    <form className="hero-search" action="/propiedades" method="get">
      <fieldset className="operation-tabs">
        <legend className="sr-only">Tipo de operación</legend>
        <label>
          <input defaultChecked name="operacion" type="radio" value="venta" />
          <span>Comprar</span>
        </label>
        <label>
          <input name="operacion" type="radio" value="alquiler" />
          <span>Alquilar</span>
        </label>
      </fieldset>
      <div className="hero-search__fields">
        <label className="search-field search-field--location">
          <span>Ubicación</span>
          <input
            name="ubicacion"
            placeholder="Tegucigalpa, San Pedro Sula, Roatán…"
            type="search"
          />
        </label>
        <label className="search-field">
          <span>Tipo</span>
          <select name="tipo" defaultValue="">
            <option value="">Toda propiedad</option>
            <option value="casa">Casa</option>
            <option value="apartamento">Apartamento</option>
            <option value="terreno">Terreno</option>
            <option value="villa">Villa</option>
          </select>
        </label>
        <label className="search-field">
          <span>Precio máximo</span>
          <select name="precio" defaultValue="">
            <option value="">Sin límite</option>
            <option value="3000000">L 3 millones</option>
            <option value="6000000">L 6 millones</option>
            <option value="10000000">L 10 millones</option>
            <option value="20000000">L 20 millones</option>
          </select>
        </label>
        <button className="button button--accent hero-search__submit" type="submit">
          Buscar propiedades <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}
