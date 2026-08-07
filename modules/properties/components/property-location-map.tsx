"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PropertyMapLocation } from "../types";
import styles from "./property-location-map.module.css";

type PropertyLocationMapProps = {
  location: PropertyMapLocation;
  title: string;
};

type MapboxInstance = import("mapbox-gl").Map;
type MapboxMarker = import("mapbox-gl").Marker;
type MapboxLibrary = typeof import("mapbox-gl").default;

type DirectionsResponse = {
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: [number, number][] };
  }>;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? "";
const ROUTE_SOURCE_ID = "property-directions-route";
const ROUTE_LAYER_ID = "property-directions-route-line";

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

function precisionCopy(precision: PropertyMapLocation["precision"]) {
  if (precision === "zone") {
    return {
      description:
        "El punto es una referencia de la zona. Confirma la dirección exacta con el vendedor antes de tu visita.",
      label: "Zona de referencia",
    };
  }

  return {
    description:
      "El punto es aproximado para proteger la privacidad del inmueble. Confirma la dirección exacta con el vendedor antes de tu visita.",
    label: "Ubicación aproximada",
  };
}

function geolocationErrorMessage(error: GeolocationPositionError) {
  switch (error.code) {
    case 1:
      return "Permite el acceso a tu ubicación para trazar la ruta.";
    case 2:
      return "No pudimos determinar tu ubicación actual. Inténtalo de nuevo.";
    case 3:
      return "La ubicación tardó demasiado. Inténtalo de nuevo.";
    default:
      return "No pudimos acceder a tu ubicación actual.";
  }
}

function formatRouteSummary(distance?: number, duration?: number) {
  const details: string[] = [];

  if (typeof distance === "number" && Number.isFinite(distance)) {
    details.push(
      distance >= 1000
        ? `${(distance / 1000).toLocaleString("es-HN", {
            maximumFractionDigits: 1,
          })} km`
        : `${Math.round(distance)} m`,
    );
  }

  if (typeof duration === "number" && Number.isFinite(duration)) {
    details.push(`${Math.max(1, Math.round(duration / 60))} min`);
  }

  return details.length > 0
    ? `Ruta lista · ${details.join(" · ")}`
    : "Ruta lista en auto.";
}

function addOrUpdateRoute(map: MapboxInstance, coordinates: [number, number][]) {
  const routeData = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates,
    },
  };
  const source = map.getSource(ROUTE_SOURCE_ID);

  if (source && "setData" in source) {
    (source as import("mapbox-gl").GeoJSONSource).setData(routeData);
    return;
  }

  map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: routeData });
  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: "line",
    source: ROUTE_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#b86645",
      "line-opacity": 0.94,
      "line-width": 5,
    },
  });
}

export function PropertyLocationMap({
  location,
  title,
}: PropertyLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxInstance | null>(null);
  const mapboxRef = useRef<MapboxLibrary | null>(null);
  const destinationMarkerRef = useRef<MapboxMarker | null>(null);
  const visitorMarkerRef = useRef<MapboxMarker | null>(null);
  const requestIdRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [mapError, setMapError] = useState("");
  const [routeMessage, setRouteMessage] = useState("");

  const destination = useMemo<[number, number]>(
    () => [location.longitude, location.latitude],
    [location.latitude, location.longitude],
  );
  const fallbackDirectionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${location.latitude},${location.longitude}`)}&travelmode=driving`;
  const precision = precisionCopy(location.precision);

  useEffect(() => {
    let cancelled = false;
    let didLoad = false;

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) return;

      const imported = await import("mapbox-gl");
      if (cancelled || !containerRef.current) return;

      const mapboxgl = imported.default;
      mapboxRef.current = mapboxgl;

      if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_TOKEN
          ? "mapbox://styles/mapbox/streets-v12"
          : OPEN_STREET_MAP_STYLE,
        center: destination,
        renderWorldCopies: false,
        zoom: location.precision === "zone" ? 12 : 14.5,
      });

      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right",
      );

      destinationMarkerRef.current = new mapboxgl.Marker({ color: "#b86645" })
        .setLngLat(destination)
        .addTo(map);

      map.on("load", () => {
        didLoad = true;
        if (!cancelled) {
          setMapError("");
          setIsMapReady(true);
        }
      });
      map.on("error", () => {
        if (!cancelled && !didLoad) {
          setMapError(
            "No pudimos cargar el mapa. Puedes abrir la ubicación en tu aplicación de mapas.",
          );
        }
      });
      mapRef.current = map;
    }

    void initializeMap().catch(() => {
      if (!cancelled) {
        setMapError(
          "No pudimos cargar el mapa. Puedes abrir la ubicación en tu aplicación de mapas.",
        );
      }
    });

    return () => {
      cancelled = true;
      requestIdRef.current += 1;
      requestAbortRef.current?.abort();
      requestAbortRef.current = null;
      destinationMarkerRef.current?.remove();
      destinationMarkerRef.current = null;
      visitorMarkerRef.current?.remove();
      visitorMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      mapboxRef.current = null;
    };
    // The public listing route remounts this component for each property.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDirections = useCallback(() => {
    if (isRouting) return;

    if (!("geolocation" in navigator)) {
      setRouteMessage(
        "Este navegador no puede compartir tu ubicación. Abre la ruta en tu aplicación de mapas.",
      );
      return;
    }

    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl || !isMapReady) {
      setRouteMessage("El mapa todavía se está preparando. Inténtalo en unos segundos.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    requestAbortRef.current?.abort();
    setIsRouting(true);
    setRouteMessage("Solicitando acceso a tu ubicación…");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void (async () => {
          const origin: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];

          if (requestId !== requestIdRef.current) return;

          if (!visitorMarkerRef.current) {
            visitorMarkerRef.current = new mapboxgl.Marker({ color: "#103d49" })
              .setLngLat(origin)
              .addTo(map);
          } else {
            visitorMarkerRef.current.setLngLat(origin);
          }

          if (!MAPBOX_TOKEN) {
            setRouteMessage(
              "No pudimos trazar la ruta aquí. Puedes abrirla en tu aplicación de mapas.",
            );
            setIsRouting(false);
            return;
          }

          setRouteMessage("Trazando tu ruta en auto…");
          const abortController = new AbortController();
          requestAbortRef.current = abortController;

          try {
            const parameters = new URLSearchParams({
              access_token: MAPBOX_TOKEN,
              geometries: "geojson",
              overview: "full",
              steps: "false",
            });
            const response = await fetch(
              `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?${parameters}`,
              { signal: abortController.signal },
            );

            if (!response.ok) throw new Error("Mapbox directions failed");

            const payload = (await response.json()) as DirectionsResponse;
            const route = payload.routes?.[0];
            const coordinates = route?.geometry?.coordinates;
            if (!coordinates || coordinates.length < 2) {
              throw new Error("Mapbox directions returned no route");
            }

            if (requestId !== requestIdRef.current) return;

            addOrUpdateRoute(map, coordinates);
            const bounds = new mapboxgl.LngLatBounds(origin, origin);
            bounds.extend(destination);
            map.fitBounds(bounds, {
              duration: 750,
              essential: true,
              maxZoom: 15,
              padding: { top: 72, right: 52, bottom: 72, left: 52 },
            });
            setRouteMessage(formatRouteSummary(route.distance, route.duration));
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
              return;
            }

            if (requestId === requestIdRef.current) {
              setRouteMessage(
                "No pudimos trazar una ruta hasta este punto. Puedes abrirla en tu aplicación de mapas.",
              );
            }
          } finally {
            if (requestId === requestIdRef.current) {
              setIsRouting(false);
            }
          }
        })();
      },
      (error) => {
        if (requestId !== requestIdRef.current) return;
        setRouteMessage(geolocationErrorMessage(error));
        setIsRouting(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 12_000,
      },
    );
  }, [destination, isMapReady, isRouting]);

  return (
    <section className={styles.location} aria-label={`Ubicación de ${title}`}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Ubicación</p>
          <h2>Conoce la zona antes de tu visita.</h2>
        </div>
        <span className={styles.precision}>{precision.label}</span>
      </div>

      <p className={styles.description}>{precision.description}</p>

      <div className={styles.mapWrap}>
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
          aria-label={`Mapa de ${precision.label.toLocaleLowerCase("es-HN")} de ${title}`}
          className={styles.map}
          ref={containerRef}
          role="region"
        />
        <span className={styles.mapNote}>
          {location.confirmed ? "Ubicación confirmada" : "Ubicación informada"}
        </span>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.directionsButton}
          disabled={!isMapReady || isRouting}
          onClick={handleDirections}
          type="button"
        >
          <span aria-hidden="true" className={styles.directionsIcon}>
            ↗
          </span>
          {isRouting ? "Trazando ruta…" : "Cómo llegar"}
        </button>
        <a
          className={styles.fallbackLink}
          href={fallbackDirectionsHref}
          rel="noreferrer"
          target="_blank"
        >
          Abrir en mapas <span aria-hidden="true">↗</span>
        </a>
      </div>

      <p className={styles.privacyNote}>
        Al usar “Cómo llegar” tu navegador pedirá permiso para conocer tu ubicación.
        Se utiliza solo para calcular esta ruta y no se guarda.
      </p>
      {routeMessage ? (
        <p className={styles.routeMessage} role="status">
          {routeMessage}
        </p>
      ) : null}
    </section>
  );
}
