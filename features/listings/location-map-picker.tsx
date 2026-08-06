"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./location-map-picker.module.css";

type LocationDetails = {
  city?: string;
  department?: string;
  municipality?: string;
  zone?: string;
};

type LocationMapPickerProps = {
  disabled?: boolean;
  latitude: string;
  longitude: string;
  onCoordinatesChange: (latitude: string, longitude: string) => void;
  onLocationDetailsChange: (details: LocationDetails) => void;
};

type GeocodingFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    context?: {
      district?: { name?: string };
      locality?: { name?: string };
      neighborhood?: { name?: string };
      place?: { name?: string };
      region?: { name?: string };
    };
    full_address?: string;
    mapbox_id?: string;
    name?: string;
    name_preferred?: string;
    place_formatted?: string;
  };
};

type MapboxInstance = import("mapbox-gl").Map;
type MapboxMarker = import("mapbox-gl").Marker;
type MapboxLibrary = typeof import("mapbox-gl").default;

const HONDURAS_CENTER: [number, number] = [-86.5, 14.8];
const HONDURAS_BOUNDS: [[number, number], [number, number]] = [
  [-89.5, 12.8],
  [-82.5, 17.5],
];
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? "";

const OPEN_STREET_MAP_STYLE: import("mapbox-gl").StyleSpecification = {
  version: 8,
  sources: {
    openStreetMap: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: "openStreetMap",
      type: "raster",
      source: "openStreetMap",
    },
  ],
};

function parseCoordinate(value: string, minimum: number, maximum: number) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) &&
    coordinate >= minimum &&
    coordinate <= maximum
    ? coordinate
    : null;
}

function featureLabel(feature: GeocodingFeature) {
  const properties = feature.properties;
  if (!properties) return "Ubicación encontrada";

  return (
    properties.full_address ??
    ([
      properties.name_preferred ?? properties.name,
      properties.place_formatted,
    ]
      .filter(Boolean)
      .join(", ") || "Ubicación encontrada")
  );
}

export function LocationMapPicker({
  disabled = false,
  latitude,
  longitude,
  onCoordinatesChange,
  onLocationDetailsChange,
}: LocationMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxInstance | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);
  const mapboxRef = useRef<MapboxLibrary | null>(null);
  const disabledRef = useRef(disabled);
  const coordinatesCallbackRef = useRef(onCoordinatesChange);

  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingFeature[]>([]);
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    coordinatesCallbackRef.current = onCoordinatesChange;
  }, [onCoordinatesChange]);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) return;

      const imported = await import("mapbox-gl");
      if (cancelled || !containerRef.current) return;

      const mapboxgl = imported.default;
      mapboxRef.current = mapboxgl;

      if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

      const initialLatitude = parseCoordinate(latitude, -90, 90);
      const initialLongitude = parseCoordinate(longitude, -180, 180);
      const hasInitialPoint =
        initialLatitude !== null && initialLongitude !== null;
      const center: [number, number] = hasInitialPoint
        ? [initialLongitude, initialLatitude]
        : HONDURAS_CENTER;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_TOKEN
          ? "mapbox://styles/mapbox/streets-v12"
          : OPEN_STREET_MAP_STYLE,
        center,
        maxBounds: HONDURAS_BOUNDS,
        renderWorldCopies: false,
        zoom: hasInitialPoint ? 14 : 6.2,
      });

      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right",
      );

      if (hasInitialPoint) {
        markerRef.current = new mapboxgl.Marker({ color: "#b86645" })
          .setLngLat(center)
          .addTo(map);
      }

      map.on("click", ({ lngLat }) => {
        if (disabledRef.current) return;

        if (!markerRef.current) {
          markerRef.current = new mapboxgl.Marker({ color: "#b86645" })
            .setLngLat(lngLat)
            .addTo(map);
        } else {
          markerRef.current.setLngLat(lngLat);
        }

        coordinatesCallbackRef.current(
          lngLat.lat.toFixed(6),
          lngLat.lng.toFixed(6),
        );
      });

      map.on("load", () => setIsMapReady(true));
      mapRef.current = map;
    }

    void initializeMap().catch(() => {
      if (!cancelled) {
        setMapError(
          "No pudimos cargar el mapa. Puedes completar las coordenadas manualmente.",
        );
      }
    });

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      mapboxRef.current = null;
    };
    // Coordinate and disabled changes are synchronized through refs/effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    const nextLatitude = parseCoordinate(latitude, -90, 90);
    const nextLongitude = parseCoordinate(longitude, -180, 180);

    if (!map || !mapboxgl || nextLatitude === null || nextLongitude === null) {
      return;
    }

    const point: [number, number] = [nextLongitude, nextLatitude];
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: "#b86645" })
        .setLngLat(point)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(point);
    }
  }, [latitude, longitude]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();

    if (!MAPBOX_TOKEN) {
      setSearchError(
        "Configura el token público de Mapbox para buscar por nombre. Mientras tanto puedes ubicar el punto directamente en el mapa.",
      );
      return;
    }

    if (normalizedQuery.length < 3) {
      setSearchError("Escribe al menos 3 caracteres para buscar.");
      return;
    }

    setIsSearching(true);
    setSearchError("");
    setResults([]);

    try {
      const parameters = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        autocomplete: "false",
        country: "hn",
        language: "es",
        limit: "5",
        permanent: "true",
        q: normalizedQuery,
      });
      const response = await fetch(
        `https://api.mapbox.com/search/geocode/v6/forward?${parameters}`,
        { headers: { Accept: "application/json" } },
      );

      if (!response.ok) throw new Error("Mapbox search failed");

      const payload = (await response.json()) as {
        features?: GeocodingFeature[];
      };
      const nextResults = (payload.features ?? []).filter(
        (feature) =>
          Array.isArray(feature.geometry?.coordinates) &&
          feature.geometry?.coordinates.length === 2,
      );

      setResults(nextResults);
      if (nextResults.length === 0) {
        setSearchError("No encontramos esa ubicación dentro de Honduras.");
      }
    } catch {
      setSearchError(
        "No pudimos buscar la ubicación. Puedes colocar el punto manualmente en el mapa.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  function selectFeature(feature: GeocodingFeature) {
    const coordinates = feature.geometry?.coordinates;
    if (!coordinates) return;

    const [nextLongitude, nextLatitude] = coordinates;
    onCoordinatesChange(
      nextLatitude.toFixed(6),
      nextLongitude.toFixed(6),
    );

    const context = feature.properties?.context;
    onLocationDetailsChange({
      department: context?.region?.name,
      municipality:
        context?.district?.name ??
        context?.place?.name ??
        context?.locality?.name,
      city: context?.place?.name ?? context?.locality?.name,
      zone: context?.neighborhood?.name ?? context?.locality?.name,
    });

    mapRef.current?.flyTo({
      center: [nextLongitude, nextLatitude],
      zoom: 15,
      essential: false,
    });
    setQuery(featureLabel(feature));
    setResults([]);
    setSearchError("");
  }

  return (
    <section className={styles.picker} aria-label="Seleccionar ubicación en el mapa">
      <div className={styles.heading}>
        <div>
          <strong>Busca y marca la ubicación</strong>
          <p>
            Busca una zona o mueve el mapa. Un clic elige el punto exacto que
            mantendremos protegido.
          </p>
        </div>
        <span>{MAPBOX_TOKEN ? "Mapbox" : "Mapa interactivo"}</span>
      </div>

      <form className={styles.search} onSubmit={handleSearch}>
        <label htmlFor="location-map-search">Buscar en Honduras</label>
        <div>
          <input
            autoComplete="off"
            disabled={disabled || isSearching}
            id="location-map-search"
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setSearchError("");
            }}
            placeholder="Ej. Villas del Pinar, Tegucigalpa"
            type="search"
            value={query}
          />
          <button disabled={disabled || isSearching} type="submit">
            {isSearching ? "Buscando…" : "Buscar"}
          </button>
        </div>
      </form>

      {searchError ? (
        <p className={styles.message} role="status">
          {searchError}
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className={styles.results} aria-label="Resultados de ubicación">
          {results.map((feature, index) => (
            <li key={feature.properties?.mapbox_id ?? `${featureLabel(feature)}-${index}`}>
              <button
                disabled={disabled}
                onClick={() => selectFeature(feature)}
                type="button"
              >
                <strong>
                  {feature.properties?.name_preferred ??
                    feature.properties?.name ??
                    "Ubicación"}
                </strong>
                <span>{featureLabel(feature)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div
        className={styles.mapWrap}
        role="region"
        aria-label="Selector de ubicación en Honduras"
      >
        {!isMapReady && !mapError ? (
          <div className={styles.loading} role="status">
            Preparando el mapa…
          </div>
        ) : null}
        {mapError ? (
          <div className={styles.loading} role="alert">
            {mapError}
          </div>
        ) : null}
        <div
          aria-describedby="location-map-instructions"
          className={styles.map}
          ref={containerRef}
          aria-label="Mapa de Honduras; haz clic para colocar la ubicación"
        />
        <p className={styles.mapHint} id="location-map-instructions">
          Haz clic sobre el mapa para colocar o mover el marcador.
        </p>
      </div>
    </section>
  );
}
