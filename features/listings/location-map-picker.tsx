"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef, useState } from "react";

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

type LeafletInstance = import("leaflet").Map;
type LeafletLibrary = typeof import("leaflet");
type LeafletMarker = import("leaflet").CircleMarker;

const HONDURAS_CENTER: [number, number] = [-86.5, 14.8];
const HONDURAS_BOUNDS: [[number, number], [number, number]] = [
  [-89.5, 12.8],
  [-82.5, 17.5],
];
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? "";

const MAPBOX_TILE_URL =
  "https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x";
const OPEN_STREET_MAP_TILE_URL =
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const MARKER_STYLE = {
  color: "#fffef9",
  fillColor: "#b86645",
  fillOpacity: 1,
  opacity: 1,
  radius: 10,
  weight: 3,
} as const;

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
  const mapRef = useRef<LeafletInstance | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const leafletRef = useRef<LeafletLibrary | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
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

      const leaflet = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      leafletRef.current = leaflet;

      const initialLatitude = parseCoordinate(latitude, -90, 90);
      const initialLongitude = parseCoordinate(longitude, -180, 180);
      const hasInitialPoint =
        initialLatitude !== null && initialLongitude !== null;
      const center: [number, number] = hasInitialPoint
        ? [initialLatitude, initialLongitude]
        : [HONDURAS_CENTER[1], HONDURAS_CENTER[0]];

      const map = leaflet.map(containerRef.current, {
        center,
        dragging: !disabledRef.current,
        maxBounds: leaflet.latLngBounds(
          [HONDURAS_BOUNDS[0][1], HONDURAS_BOUNDS[0][0]],
          [HONDURAS_BOUNDS[1][1], HONDURAS_BOUNDS[1][0]],
        ),
        maxBoundsViscosity: 1,
        scrollWheelZoom: true,
        touchZoom: true,
        zoom: hasInitialPoint ? 14 : 6,
        zoomControl: true,
      });
      mapRef.current = map;

      const tileLayer = MAPBOX_TOKEN
        ? leaflet.tileLayer(
            `${MAPBOX_TILE_URL}?access_token=${encodeURIComponent(MAPBOX_TOKEN)}`,
            {
              attribution:
                '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
              maxZoom: 22,
              tileSize: 512,
              zoomOffset: -1,
            },
          )
        : leaflet.tileLayer(OPEN_STREET_MAP_TILE_URL, {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
          });

      let failedTiles = 0;
      tileLayer.on("tileerror", () => {
        failedTiles += 1;
        if (failedTiles >= 3 && !cancelled) {
          setMapError(
            "No pudimos descargar el mapa. La bÃºsqueda y las coordenadas manuales siguen disponibles.",
          );
        }
      });
      tileLayer.addTo(map);

      if (hasInitialPoint) {
        markerRef.current = leaflet.circleMarker(center, MARKER_STYLE).addTo(map);
      }

      map.on("click", ({ latlng }) => {
        if (disabledRef.current) return;

        if (!markerRef.current) {
          markerRef.current = leaflet
            .circleMarker(latlng, MARKER_STYLE)
            .addTo(map);
        } else {
          markerRef.current.setLatLng(latlng);
        }

        coordinatesCallbackRef.current(
          latlng.lat.toFixed(6),
          latlng.lng.toFixed(6),
        );
      });

      const resizeMap = () => map.invalidateSize({ animate: false });
      if (typeof ResizeObserver === "function") {
        resizeObserverRef.current = new ResizeObserver(resizeMap);
        resizeObserverRef.current.observe(containerRef.current);
      }

      requestAnimationFrame(() => {
        if (cancelled) return;

        resizeMap();
        setIsMapReady(true);
      });
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
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
    // Coordinate and disabled changes are synchronized through refs/effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    const nextLatitude = parseCoordinate(latitude, -90, 90);
    const nextLongitude = parseCoordinate(longitude, -180, 180);

    if (!map || !leaflet || nextLatitude === null || nextLongitude === null) {
      return;
    }

    const point: [number, number] = [nextLatitude, nextLongitude];
    if (!markerRef.current) {
      markerRef.current = leaflet
        .circleMarker(point, MARKER_STYLE)
        .addTo(map);
    } else {
      markerRef.current.setLatLng(point);
    }
  }, [latitude, longitude]);

  async function handleSearch() {
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

    mapRef.current?.flyTo([nextLatitude, nextLongitude], 15, {
      animate: false,
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

      <div className={styles.search} role="search">
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
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;

              event.preventDefault();
              event.stopPropagation();
              void handleSearch();
            }}
            placeholder="Ej. Villas del Pinar, Tegucigalpa"
            type="search"
            value={query}
          />
          <button
            disabled={disabled || isSearching}
            onClick={() => void handleSearch()}
            type="button"
          >
            {isSearching ? "Buscando…" : "Buscar"}
          </button>
        </div>
      </div>

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
